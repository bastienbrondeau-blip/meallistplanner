import { createServerFn } from "@tanstack/react-start";

export type Profile = {
  goal: string;
  allergies: string;
  diet: string;
  budget: string;
  time: string;
  cuisines: string[];
};

export type MealSuggestion = {
  name: string;
  emoji: string;
  description: string;
};

export const suggestMeals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { profile?: Partial<Profile> };
    const p = d.profile ?? {};
    return {
      profile: {
        goal: String(p.goal ?? "Sans objectif"),
        allergies: String(p.allergies ?? "Aucune"),
        diet: String(p.diet ?? "Omnivore"),
        budget: String(p.budget ?? "Moyen"),
        time: String(p.time ?? "Pas d'importance"),
        cuisines: Array.isArray(p.cuisines) ? p.cuisines.map(String) : [],
      } as Profile,
    };
  })
  .handler(async ({ data }): Promise<{ suggestions: MealSuggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const p = data.profile;
    const systemPrompt = `Tu es un chef français. Propose 8 idées de repas adaptées au profil.
Retourne UNIQUEMENT un JSON: { "suggestions": [{ "name": "Poulet rôti aux herbes", "emoji": "🍗", "description": "Simple, familial, ~30min" }] }
Règles:
- 8 suggestions variées, appétissantes, en français
- Respecte STRICTEMENT le régime et les allergies (aucun ingrédient interdit)
- Adapte richesse/légèreté à l'objectif
- Adapte au budget (recettes simples si cheap)
- Respecte le temps de préparation max
- Priorise les cuisines préférées
- emoji: 1 seul emoji représentatif
- description: 8-12 mots max, style, temps approx
- Aucun texte hors JSON.`;

    const userPrompt = `Profil:
- Objectif: ${p.goal}
- Allergies/intolérances: ${p.allergies}
- Régime: ${p.diet}
- Budget par repas: ${p.budget}
- Temps max: ${p.time}
- Cuisines préférées: ${p.cuisines.length > 0 ? p.cuisines.join(", ") : "Toutes"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
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
      if (res.status === 429) throw new Error("Trop de requêtes. Réessaie dans un instant.");
      if (res.status === 402) throw new Error("Crédits IA épuisés.");
      throw new Error(`Erreur IA (${res.status})`);
    }

    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { suggestions?: MealSuggestion[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Réponse IA invalide");
    }
    const suggestions = (parsed.suggestions ?? []).slice(0, 8).map((s) => ({
      name: String(s.name ?? ""),
      emoji: String(s.emoji ?? "🍽️"),
      description: String(s.description ?? ""),
    }));
    return { suggestions };
  });
