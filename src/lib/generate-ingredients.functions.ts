import { createServerFn } from "@tanstack/react-start";

export type Ingredient = {
  name: string;
  quantity: string;
  options: { label: string; price: number }[];
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

export const generateIngredients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as { meals?: unknown };
    if (!d || !Array.isArray(d.meals)) throw new Error("meals must be an array");
    const meals = d.meals.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
    if (meals.length === 0) throw new Error("At least one meal is required");
    return { meals };
  })
  .handler(async ({ data }): Promise<GenerateResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `Tu es un chef français expert en cuisine et courses.
Pour une liste de repas, retourne UNIQUEMENT un JSON valide de cette forme:
{
  "recipes": [
    {
      "meal": "pâtes carbonara",
      "title": "Vraies pâtes carbonara à l'italienne",
      "source": "Marmiton",
      "sourceUrl": "https://www.marmiton.org/recettes/recette_pates-a-la-carbonara_23223.aspx",
      "summary": "Recette traditionnelle avec guanciale, pecorino, jaunes d'œufs et poivre."
    }
  ],
  "ingredients": [
    {
      "name": "Pâtes",
      "quantity": "200g",
      "options": [
        { "label": "Pâtes standard", "price": 1 },
        { "label": "Pâtes milieu de gamme", "price": 2.5 },
        { "label": "Pâtes bio artisanales", "price": 4 }
      ]
    }
  ]
}
Règles STRICTES:
- Pour CHAQUE repas demandé, propose UNE vraie recette de référence issue d'un site français reconnu (Marmiton, 750g, Cuisine AZ, Journal des Femmes, Ricardo, Cuisine Actuelle, Papilles et Pupilles, Chef Simon).
- L'URL DOIT être une vraie URL plausible du site cité (ex: https://www.marmiton.org/recettes/...). N'invente pas d'URL bizarres.
- Regroupe les ingrédients identiques entre plusieurs repas (additionne les quantités).
- Chaque ingrédient a EXACTEMENT 3 options croissantes en prix/qualité.
- Prix réalistes en euros France 2025.
- Sel/poivre/huile SEULEMENT si vraiment central.
- Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;

    const userPrompt = `Repas: ${data.meals.join(", ")}. Génère les recettes de référence et la liste de courses.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
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
    const ingredients = (parsed.ingredients ?? []).map((i) => ({
      name: String(i.name ?? ""),
      quantity: String(i.quantity ?? ""),
      options: (i.options ?? []).slice(0, 3).map((o) => ({
        label: String(o.label ?? ""),
        price: Number(o.price ?? 0),
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
