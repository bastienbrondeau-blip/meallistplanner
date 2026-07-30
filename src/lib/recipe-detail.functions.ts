import { createServerFn } from "@tanstack/react-start";

export type RecipeDetail = {
  title: string;
  source: string;
  sourceUrl: string;
  time: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  nutrition: { calories: string; proteines: string; glucides: string; lipides: string };
};

export const getRecipeDetail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { meal?: unknown };
    const meal = String(d.meal ?? "").trim();
    if (!meal) throw new Error("meal requis");
    return { meal };
  })
  .handler(async ({ data }): Promise<RecipeDetail> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `Tu es un chef français. Donne la recette de référence d'un plat.
Retourne UNIQUEMENT ce JSON:
{ "title": "...", "source": "Marmiton", "sourceUrl": "https://www.marmiton.org/...", "time": "35 min", "servings": "4 personnes",
  "ingredients": ["400g de pâtes", "..."], "steps": ["Faire bouillir...", "..."],
  "nutrition": { "calories": "620 kcal", "proteines": "28 g", "glucides": "70 g", "lipides": "22 g" } }
Règles: recette réelle et fiable issue d'un site français reconnu, URL plausible, 5-8 étapes claires, valeurs nutritionnelles par portion. Aucun texte hors JSON.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Plat: ${data.meal}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Trop de requêtes. Réessaie dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés.");
      throw new Error(`Erreur IA (${res.status})`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let p: Partial<RecipeDetail>;
    try {
      p = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }
    const strArr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      title: String(p.title ?? data.meal),
      source: String(p.source ?? ""),
      sourceUrl: String(p.sourceUrl ?? ""),
      time: String(p.time ?? ""),
      servings: String(p.servings ?? ""),
      ingredients: strArr(p.ingredients),
      steps: strArr(p.steps),
      nutrition: {
        calories: String(p.nutrition?.calories ?? "—"),
        proteines: String(p.nutrition?.proteines ?? "—"),
        glucides: String(p.nutrition?.glucides ?? "—"),
        lipides: String(p.nutrition?.lipides ?? "—"),
      },
    };
  });
