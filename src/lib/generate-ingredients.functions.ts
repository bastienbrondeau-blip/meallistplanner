import { createServerFn } from "@tanstack/react-start";

export type Ingredient = {
  name: string;
  quantity: string;
  options: { label: string; price: number }[];
};

export const generateIngredients = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = data as { meals?: unknown };
    if (!d || !Array.isArray(d.meals)) throw new Error("meals must be an array");
    const meals = d.meals.filter((m): m is string => typeof m === "string" && m.trim().length > 0);
    if (meals.length === 0) throw new Error("At least one meal is required");
    return { meals };
  })
  .handler(async ({ data }): Promise<{ ingredients: Ingredient[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `Tu es un assistant qui génère des listes d'ingrédients de courses en français.
Pour une liste de repas donnée, retourne UNIQUEMENT un JSON valide de cette forme:
{
  "ingredients": [
    {
      "name": "Pâtes",
      "quantity": "200g",
      "options": [
        { "label": "Pâtes standard", "price": 1 },
        { "label": "Pâtes bio", "price": 2.5 },
        { "label": "Pâtes fraîches", "price": 4 }
      ]
    }
  ]
}
Règles:
- Regroupe les ingrédients identiques entre plusieurs repas (additionne les quantités).
- Chaque ingrédient DOIT avoir exactement 3 options croissantes en prix et qualité (standard, milieu de gamme, premium/bio).
- Prix réalistes en euros (nombre décimal).
- Inclure sel/poivre/huile SEULEMENT si nécessaire, avec des options réalistes.
- Retourne UNIQUEMENT le JSON, aucun texte avant ou après.`;

    const userPrompt = `Repas de la semaine: ${data.meals.join(", ")}. Génère la liste d'ingrédients.`;

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
    let parsed: { ingredients?: Ingredient[] };
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
    return { ingredients };
  });
