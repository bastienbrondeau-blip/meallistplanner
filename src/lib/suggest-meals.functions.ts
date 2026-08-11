import { createServerFn } from "@tanstack/react-start";

export type MealSuggestion = {
  name: string;
  emoji: string;
  description: string;
  time: string;
  price: string;
  macros?: { calories: string; proteines: string; glucides: string; lipides: string };
};

export const suggestMeals = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as {
      profile?: Record<string, unknown>;
      slot?: unknown;
      count?: unknown;
      complexity?: unknown;
      people?: unknown;
    };
    const p = d.profile ?? {};
    const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
    return {
      profile: {
        mode: String(p.mode ?? "classic") === "fitness" ? "fitness" : "classic",
        goal: String(p.goal ?? "Maintenir"),
        goalTarget: String(p.goalTarget ?? ""),
        sex: String(p.sex ?? ""),
        sessions: String(p.sessions ?? ""),
        training: String(p.training ?? ""),
        weight: String(p.weight ?? ""),
        height: String(p.height ?? ""),
        activity: String(p.activity ?? "Modéré"),
        diet: String(p.diet ?? "Omnivore"),
        allergies: String(p.allergies ?? ""),
        budget: String(p.budget ?? "Moyen (5-15 €)"),
        timeMax: String(p.timeMax ?? "30 min"),
        cuisines: arr(p.cuisines),
        store: String(p.store ?? "Carrefour"),
      },
      slot: typeof d.slot === "string" ? d.slot : "",
      count: typeof d.count === "number" ? Math.min(Math.max(d.count, 4), 21) : 8,
      complexity: d.complexity === "simple" || d.complexity === "gourmand" ? d.complexity : "",
      people: typeof d.people === "number" && d.people > 0 ? Math.min(d.people, 12) : 2,
    };
  })
  .handler(async ({ data }): Promise<{ suggestions: MealSuggestion[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const p = data.profile;
    const fitness = p.mode === "fitness";

    const systemPrompt = `Tu es ${fitness ? "un coach nutrition et chef sportif français" : "un chef français"}.
Propose ${data.count} idées de repas adaptées au profil.
Retourne UNIQUEMENT ce JSON:
{ "suggestions": [{ "name": "Poulet rôti aux herbes", "emoji": "🍗", "description": "Simple, familial", "time": "35 min", "price": "~9 €"${fitness ? `, "macros": { "calories": "620 kcal", "proteines": "48 g", "glucides": "55 g", "lipides": "18 g" }` : ""} }] }
Règles:
- ${data.count} suggestions variées, appétissantes, en français
- Respecte STRICTEMENT le régime et les allergies (aucun ingrédient interdit)
- Adapte au budget et au temps de préparation max
- Tous les ingrédients doivent être trouvables chez ${p.store}
- description: 6-10 mots max
- Portions pour ${data.people} personne(s)
${data.slot ? `- Ce sont des idées pour le moment de la journée: ${data.slot}. Si c'est le petit-déjeuner, propose UNIQUEMENT de vrais petits-déjeuners${fitness ? " riches en protéines (oeufs, skyr, yaourt nature, granola sans sucre, fromage blanc)" : " variés (pain frais, céréales, fruits, confiture, viennoiseries)"}.` : ""}
${data.complexity === "simple" ? "- Recettes SIMPLES et RAPIDES (moins de 20 min), semaine chargée." : ""}
${data.complexity === "gourmand" ? "- Recettes PLUS ÉLABORÉES et GOURMANDES (plus de 30 min), ambiance week-end." : ""}
${
  fitness
    ? `- Priorise les plats riches en protéines et aux macros équilibrés ("HealthKit"), cohérents avec l'objectif "${p.goal}" (prise de masse = surplus calorique, sèche = déficit et haute protéine)
- macros OBLIGATOIRES et réalistes par portion pour CHAQUE plat`
    : `- Priorise les cuisines préférées de l'utilisateur`
}
- Aucun texte hors JSON.`;

    const userPrompt = `Profil:
- Mode: ${fitness ? "Fitness" : "Cuisine classique"}
- Nombre de personnes: ${data.people}
${fitness ? `- Objectif: ${p.goal} ${p.goalTarget ? `(${p.goalTarget})` : ""}\n- Sexe: ${p.sex}\n- Séances/semaine: ${p.sessions}\n- Type d'entraînement: ${p.training}\n- Poids: ${p.weight || "n/c"} kg\n- Taille: ${p.height || "n/c"} cm\n- Activité: ${p.activity}` : `- Cuisines préférées: ${p.cuisines.length ? p.cuisines.join(", ") : "Toutes"}`}
- Régime: ${p.diet}
- Allergies: ${p.allergies || "Aucune"}
- Budget par repas: ${p.budget}
- Temps max: ${p.timeMax}
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
      macros: s.macros
        ? {
            calories: String(s.macros.calories ?? "—"),
            proteines: String(s.macros.proteines ?? "—"),
            glucides: String(s.macros.glucides ?? "—"),
            lipides: String(s.macros.lipides ?? "—"),
          }
        : undefined,
    }));
    return { suggestions };
  });
