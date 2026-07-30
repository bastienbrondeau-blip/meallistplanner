import { createServerFn } from "@tanstack/react-start";

export type MealSuggestion = {
  name: string;
  emoji: string;
  description: string;
  time: string;
  price: string;
};

export const suggestMeals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { profile?: Record<string, unknown>; slot?: unknown; count?: unknown };
    const p = d.profile ?? {};
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      profile: {
        diets: arr(p.diets),
        allergies: String(p.allergies ?? "Aucune"),
        timeMax: String(p.timeMax ?? "Pas de limite"),
        frequency: String(p.frequency ?? "3-4x par semaine"),
        budget: String(p.budget ?? "10-15 € par repas"),
        cuisines: arr(p.cuisines),
        dislikes: arr(p.dislikes),
        store: String(p.store ?? "Carrefour"),
      },
      slot: typeof d.slot === "string" ? d.slot : "",
      count: typeof d.count === "number" ? Math.min(Math.max(d.count, 4), 21) : 8,
    };
  })
  .handler(async ({ data }): Promise<{ suggestions: MealSuggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const p = data.profile;
    const systemPrompt = `Tu es un chef français. Propose ${data.count} idées de repas adaptées au profil.
Retourne UNIQUEMENT un JSON: { "suggestions": [{ "name": "Poulet rôti aux herbes", "emoji": "🍗", "description": "Simple, familial", "time": "35 min", "price": "~9 €" }] }
Règles:
- ${data.count} suggestions variées, appétissantes, en français
- Respecte STRICTEMENT le régime, les allergies et les aliments détestés (aucun ingrédient interdit)
- Adapte au budget, au temps max et priorise les cuisines préférées
- Tous les ingrédients doivent être trouvables chez ${p.store}
- description: 6-10 mots max
- Aucun texte hors JSON.`;

    const userPrompt = `Profil:
- Régimes/restrictions: ${p.diets.length ? p.diets.join(", ") : "Aucune"}
- Allergies: ${p.allergies || "Aucune"}
- Temps max: ${p.timeMax}
- Fréquence de cuisson: ${p.frequency}
- Budget par repas: ${p.budget}
- Cuisines préférées: ${p.cuisines.length ? p.cuisines.join(", ") : "Toutes"}
- Aliments détestés: ${p.dislikes.length ? p.dislikes.join(", ") : "Aucun"}
- Magasin: ${p.store}${data.slot ? `\n- Moment de la journée: ${data.slot}` : ""}`;

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
    const suggestions = (parsed.suggestions ?? []).slice(0, data.count).map((s) => ({
      name: String(s.name ?? ""),
      emoji: String(s.emoji ?? "🍽️"),
      description: String(s.description ?? ""),
      time: String(s.time ?? ""),
      price: String(s.price ?? ""),
    }));
    return { suggestions };
  });
