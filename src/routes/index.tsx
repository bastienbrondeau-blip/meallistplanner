import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { generateIngredients, type Ingredient } from "@/lib/generate-ingredients.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MealList — Ta liste de courses intelligente" },
      { name: "description", content: "Saisis tes repas de la semaine et laisse l'IA générer ta liste de courses avec choix de qualité et magasin." },
      { property: "og:title", content: "MealList — Ta liste de courses intelligente" },
      { property: "og:description", content: "Saisis tes repas de la semaine et laisse l'IA générer ta liste de courses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MealList,
});

type Step = 1 | 2 | 3 | 4;
type Choices = Record<string, number>; // ingredient name -> option index

const STORAGE_KEY = "meallist-state-v1";

const STORES = [
  { name: "Carrefour", color: "bg-[#004E9F] hover:bg-[#003a75]", url: "https://www.carrefour.fr/" },
  { name: "Leclerc", color: "bg-[#0066B3] hover:bg-[#00518f]", url: "https://www.leclercdrive.fr/" },
  { name: "Amazon Fresh", color: "bg-[#FF9900] hover:bg-[#e08700]", url: "https://www.amazon.fr/alm/storefront?almBrandId=QW1hem9uIEZyZXNo" },
  { name: "Intermarché", color: "bg-[#E30613] hover:bg-[#b8050f]", url: "https://www.intermarche.com/" },
];

function MealList() {
  const [step, setStep] = useState<Step>(1);
  const [meals, setMeals] = useState<string[]>([]);
  const [mealInput, setMealInput] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [choices, setChoices] = useState<Choices>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const generate = useServerFn(generateIngredients);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.meals)) setMeals(s.meals);
        if (Array.isArray(s.ingredients)) setIngredients(s.ingredients);
        if (s.choices) setChoices(s.choices);
        if (typeof s.step === "number") setStep(s.step);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ meals, ingredients, choices, step }));
  }, [meals, ingredients, choices, step, hydrated]);

  const addMeal = () => {
    const v = mealInput.trim();
    if (!v) return;
    setMeals((m) => [...m, v]);
    setMealInput("");
  };

  const removeMeal = (i: number) => setMeals((m) => m.filter((_, idx) => idx !== i));

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await generate({ data: { meals } });
      setIngredients(res.ingredients);
      // Default: choose the cheapest option for each
      const initial: Choices = {};
      res.ingredients.forEach((i) => (initial[i.name] = 0));
      setChoices(initial);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setMeals([]);
    setIngredients([]);
    setChoices({});
    setStep(1);
    setError(null);
  };

  const total = ingredients.reduce((sum, ing) => {
    const idx = choices[ing.name] ?? 0;
    return sum + (ing.options[idx]?.price ?? 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-700">
              🛒 MealList
            </h1>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Étape {step}/4
            </span>
          </div>
          <ProgressBar step={step} />
        </header>

        {step === 1 && (
          <StepCard title="Tes repas de la semaine ?" subtitle="Ajoute chaque plat que tu veux manger.">
            <div className="flex gap-2">
              <input
                type="text"
                value={mealInput}
                onChange={(e) => setMealInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMeal()}
                placeholder="ex: pâtes carbonara"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
              <button
                onClick={addMeal}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
              >
                Ajouter
              </button>
            </div>

            {meals.length > 0 && (
              <ul className="mt-5 space-y-2">
                {meals.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg">🍽️</span>
                      {m}
                    </span>
                    <button
                      onClick={() => removeMeal(i)}
                      className="text-sm text-slate-400 hover:text-red-500"
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              disabled={meals.length === 0}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-slate-900 py-4 text-base font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              Continuer →
            </button>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard title="Générer ta liste de courses" subtitle="L'IA va lister tous les ingrédients nécessaires.">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {meals.length} repas
              </p>
              <div className="flex flex-wrap gap-2">
                {meals.map((m, i) => (
                  <span key={i} className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              onClick={handleGenerate}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:bg-emerald-400 active:scale-[0.99]"
            >
              {loading ? "✨ Génération en cours..." : "🤖 Générer ma liste de courses"}
            </button>
            <button
              onClick={() => setStep(1)}
              className="mt-2 w-full rounded-xl bg-transparent py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Modifier mes repas
            </button>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard title="Choisis la qualité" subtitle="Pour chaque produit, sélectionne l'option qui te convient.">
            <div className="space-y-5">
              {ingredients.map((ing) => {
                const selected = choices[ing.name] ?? 0;
                return (
                  <div key={ing.name} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-baseline justify-between">
                      <h3 className="text-base font-semibold text-slate-900">{ing.name}</h3>
                      <span className="text-xs font-medium text-slate-500">{ing.quantity}</span>
                    </div>
                    <div className="grid gap-2">
                      {ing.options.map((opt, idx) => {
                        const active = selected === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setChoices((c) => ({ ...c, [ing.name]: idx }))}
                            className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                              active
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                  active ? "border-emerald-500 bg-emerald-500" : "border-slate-300"
                                }`}
                              >
                                {active && <span className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                              <span className="text-sm font-medium text-slate-800">{opt.label}</span>
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {opt.price.toFixed(2)}€
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
              <span className="text-sm font-medium opacity-80">Total estimé</span>
              <span className="text-2xl font-bold">{total.toFixed(2)}€</span>
            </div>

            <button
              onClick={() => setStep(4)}
              className="mt-4 w-full rounded-xl bg-emerald-600 py-4 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              Choisir le magasin →
            </button>
            <button
              onClick={() => setStep(2)}
              className="mt-2 w-full rounded-xl bg-transparent py-3 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Retour
            </button>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard title="Où veux-tu faire tes courses ?" subtitle="On t'emmène directement chez ton marchand préféré.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STORES.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className={`flex items-center justify-center rounded-2xl px-4 py-6 text-lg font-bold text-white shadow-md transition active:scale-[0.98] ${s.color}`}
                >
                  {s.name}
                </a>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Ta liste ({ingredients.length} produits) — {total.toFixed(2)}€</p>
              <ul className="mt-2 space-y-1 text-emerald-800">
                {ingredients.map((ing) => {
                  const idx = choices[ing.name] ?? 0;
                  const opt = ing.options[idx];
                  return (
                    <li key={ing.name} className="flex justify-between">
                      <span>• {ing.quantity} {ing.name} <span className="text-emerald-600">({opt?.label})</span></span>
                      <span className="font-medium">{opt?.price.toFixed(2)}€</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              onClick={resetAll}
              className="mt-6 w-full rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Recommencer avec de nouveaux repas
            </button>
          </StepCard>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="mt-4 flex gap-1.5">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition ${
            n <= step ? "bg-emerald-500" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
