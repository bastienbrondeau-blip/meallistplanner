import { createServerFn } from "@tanstack/react-start";

export type Ingredient = {
  name: string;
  quantity: string;
  aisle: string;
  options: { label: string; price: number; tier: string }[];
};

export type RecipeInfo = {
  meal: string;
  title: string;
  source: string;
  sourceUrl: string;
  summary: string;
};

export type GenerateResult = {
  ingredients: Ingredient[];
  recipes: RecipeInfo[];
};

const AISLES = [
  "Fruits & légumes",
  "Boucherie",
  "Poissonnerie",
  "Crèmerie",
  "Boulangerie",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Autre",
];

export const generateIngredients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as { meals?: unknown; store?: unknown; budget?: unknown };
    if (!d || !Array.isArray(d.meals)) throw new Error("meals must be an array");
    const meals = d.meals.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
    if (meals.length === 0) throw new Error("At least one meal is required");
    return {
      meals,
      store: typeof d.store === "string" ? d.store : "Carrefour",
      budget: typeof d.budget === "string" ? d.budget : "10-15 € par repas",
    };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `Tu es un chef français expert en cuisine et en courses en supermarché.
Retourne UNIQUEMENT un JSON valide:
{
  "recipes": [{ "meal": "...", "title": "...", "source": "Marmiton", "sourceUrl": "https://www.marmiton.org/...", "summary": "..." }],
  "ingredients": [{
    "name": "Pâtes",
    "quantity": "400g",
    "aisle": "Épicerie salée",
    "options": [
      { "label": "Pâtes marque repère", "price": 1, "tier": "Standard" },
      { "label": "Pâtes Barilla", "price": 2.5, "tier": "Qualité" },
      { "label": "Pâtes bio artisanales", "price": 4, "tier": "Premium" }
    ]
  }]
}
Règles STRICTES:
- Une vraie recette de référence par repas (Marmiton, 750g, Cuisine AZ, Journal des Femmes, Chef Simon) avec URL plausible.
- CONSOLIDE les ingrédients identiques entre repas en additionnant les quantités (ex: 500g + 500g = 1kg).
- "aisle" DOIT être exactement l'une de ces valeurs: ${AISLES.join(", ")}.
- Exactement 3 options par ingrédient, tiers "Standard", "Qualité", "Premium", avec des noms de produits réellement plausibles dans l'enseigne ${data.store} (marque distributeur pour Standard).
- Prix réalistes en euros, France 2026, cohérents avec un budget ${data.budget}.
- Pas de sel/poivre/huile sauf si vraiment central.
- Aucun texte hors JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Magasin: ${data.store}. Repas: ${data.meals.join(", ")}. Génère les recettes de référence et la liste de courses consolidée.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Trop de requêtes. Réessaie dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés. Ajoute des crédits à ton workspace Lovable.");
      throw new Error(`Erreur IA (${res.status}): ${text}`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { ingredients?: Ingredient[]; recipes?: RecipeInfo[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }
    const tiers = ["Standard", "Qualité", "Premium"];
    const ingredients = (parsed.ingredients ?? []).map((i) => ({
      name: String(i.name ?? ""),
      quantity: String(i.quantity ?? ""),
      aisle: AISLES.includes(String(i.aisle)) ? String(i.aisle) : "Autre",
      options: (i.options ?? []).slice(0, 3).map((o, idx) => ({
        label: String(o.label ?? ""),
        price: Number(o.price ?? 0),
        tier: String(o.tier ?? tiers[idx] ?? "Standard"),
      })),
    }));
    const recipes = (parsed.recipes ?? []).map((r) => ({
      meal: String(r.meal ?? ""),
      title: String(r.title ?? ""),
      source: String(r.source ?? ""),
      sourceUrl: String(r.sourceUrl ?? ""),
      summary: String(r.summary ?? ""),
    }));
    return { ingredients, recipes };
  });
