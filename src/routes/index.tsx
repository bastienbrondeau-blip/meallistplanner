import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  generateIngredients,
  type Ingredient,
  type RecipeInfo,
} from "@/lib/generate-ingredients.functions";
import { suggestMeals, type MealSuggestion, type Profile } from "@/lib/suggest-meals.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MealList — Ton assistant culinaire IA" },
      {
        name: "description",
        content:
          "MealList suggère des repas selon tes goûts et génère ta liste de courses intelligente en quelques secondes.",
      },
      { property: "og:title", content: "MealList — Ton assistant culinaire IA" },
      {
        property: "og:description",
        content:
          "MealList suggère des repas selon tes goûts et génère ta liste de courses intelligente en quelques secondes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MealList,
});

type Choices = Record<string, number>;

type Tab = "suggest" | "cook";

type HistoryEntry = {
  id: string;
  createdAt: number;
  meals: string[];
  ingredients: Ingredient[];
  recipes: RecipeInfo[];
  choices: Choices;
  total: number;
};

const PROFILE_KEY = "meallist-profile-v1";
const MEALS_KEY = "meallist-meals-v1";
const WORK_KEY = "meallist-work-v1";
const HISTORY_KEY = "meallist-history-v1";

const DEFAULT_PROFILE: Profile = {
  goal: "Sans objectif",
  allergies: "Aucune",
  diet: "Omnivore",
  budget: "Moyen",
  time: "Pas d'importance",
  cuisines: [],
};

const GOALS = ["Perte de poids", "Prise de muscle", "Maintenir", "Sans objectif"];
const DIETS = ["Omnivore", "Végétarien", "Végan", "Sans gluten", "Autre"];
const BUDGETS = ["Cheap (<5€)", "Moyen (5-15€)", "Premium (>15€)"];
const TIMES = ["5 min", "15 min", "30 min", "1h+", "Pas d'importance"];
const CUISINES = ["Italienne", "Asiatique", "Française", "Méditerranéenne", "Mexicaine", "Mixte"];

const STORES = [
  {
    name: "Carrefour",
    accent: "from-[#004E9F] to-[#0069c9]",
    search: (q: string) => `https://www.carrefour.fr/s?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Leclerc",
    accent: "from-[#0066B3] to-[#0088dd]",
    search: (q: string) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Amazon Fresh",
    accent: "from-[#FF9900] to-[#ffb84d]",
    search: (q: string) => `https://www.amazon.fr/s?i=amazonfresh&k=${encodeURIComponent(q)}`,
  },
  {
    name: "Intermarché",
    accent: "from-[#E30613] to-[#ff3a48]",
    search: (q: string) => `https://www.intermarche.com/recherche?q=${encodeURIComponent(q)}`,
  },
];

const QUICK_MEALS: MealSuggestion[] = [
  { name: "Pâtes carbonara", emoji: "🍝", description: "Italien classique, ~20min" },
  { name: "Poulet rôti", emoji: "🍗", description: "Familial, ~1h au four" },
  { name: "Salade César", emoji: "🥗", description: "Fraîche, ~15min" },
  { name: "Curry de légumes", emoji: "🍛", description: "Épicé, végétarien, ~30min" },
  { name: "Saumon teriyaki", emoji: "🐟", description: "Asiatique, ~20min" },
  { name: "Tacos au bœuf", emoji: "🌮", description: "Mexicain, ~25min" },
];

function MealList() {
  const [tab, setTab] = useState<Tab>("suggest");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [profileSet, setProfileSet] = useState(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [meals, setMeals] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [choices, setChoices] = useState<Choices>({});
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const generate = useServerFn(generateIngredients);
  const suggest = useServerFn(suggestMeals);

  // Hydrate
  useEffect(() => {
    try {
      const rawP = localStorage.getItem(PROFILE_KEY);
      if (rawP) {
        setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(rawP) });
        setProfileSet(true);
      } else {
        setShowQuestionnaire(true);
      }
      const rawM = localStorage.getItem(MEALS_KEY);
      if (rawM) setMeals(JSON.parse(rawM));
      const rawW = localStorage.getItem(WORK_KEY);
      if (rawW) {
        const w = JSON.parse(rawW);
        if (w.ingredients) setIngredients(w.ingredients);
        if (w.recipes) setRecipes(w.recipes);
        if (w.choices) setChoices(w.choices);
      }
      const rawH = localStorage.getItem(HISTORY_KEY);
      if (rawH) setHistory(JSON.parse(rawH));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
  }, [meals, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(WORK_KEY, JSON.stringify({ ingredients, recipes, choices }));
  }, [ingredients, recipes, choices, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, hydrated]);

  // Fetch suggestions when profile is set / changed
  useEffect(() => {
    if (!hydrated || !profileSet || showQuestionnaire) return;
    let cancelled = false;
    setSuggestLoading(true);
    setSuggestError(null);
    suggest({ data: { profile } })
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch((e) => {
        if (!cancelled) setSuggestError(e instanceof Error ? e.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setSuggestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, profileSet, showQuestionnaire, profile, suggest]);

  const addMeal = (v: string) => {
    const s = v.trim();
    if (!s) return;
    if (meals.some((m) => m.toLowerCase() === s.toLowerCase())) return;
    setMeals((m) => [...m, s]);
  };
  const removeMeal = (i: number) => setMeals((m) => m.filter((_, idx) => idx !== i));

  const total = useMemo(
    () =>
      ingredients.reduce((s, ing) => {
        const idx = choices[ing.name] ?? 0;
        return s + (ing.options[idx]?.price ?? 0);
      }, 0),
    [ingredients, choices],
  );

  const currentStep = useMemo(() => {
    if (meals.length === 0) return 1;
    if (ingredients.length === 0) return 2;
    return 3;
  }, [meals.length, ingredients.length]);

  const handleGenerate = async () => {
    if (meals.length === 0) return;
    setGenError(null);
    setGenLoading(true);
    try {
      const res = await generate({ data: { meals } });
      setIngredients(res.ingredients);
      setRecipes(res.recipes);
      const init: Choices = {};
      res.ingredients.forEach((i) => (init[i.name] = 0));
      setChoices(init);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenLoading(false);
    }
  };

  const saveHistory = () => {
    if (ingredients.length === 0) return;
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      meals,
      ingredients,
      recipes,
      choices,
      total,
    };
    setHistory((h) => [entry, ...h].slice(0, 30));
  };

  const goToCook = () => setTab("cook");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {showQuestionnaire && (
        <Questionnaire
          initial={profile}
          onSave={(p) => {
            setProfile(p);
            setProfileSet(true);
            setShowQuestionnaire(false);
            localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
          }}
        />
      )}

      <Header tab={tab} setTab={setTab} onEditProfile={() => setShowQuestionnaire(true)} />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-8 sm:pt-10">
        {tab === "suggest" ? (
          <SuggestTab
            profile={profile}
            suggestions={suggestions}
            loading={suggestLoading}
            error={suggestError}
            meals={meals}
            addMeal={addMeal}
            removeMeal={removeMeal}
            onEditProfile={() => setShowQuestionnaire(true)}
            onGoToCook={goToCook}
          />
        ) : (
          <CookTab
            meals={meals}
            addMeal={addMeal}
            removeMeal={removeMeal}
            ingredients={ingredients}
            recipes={recipes}
            choices={choices}
            setChoices={setChoices}
            total={total}
            genLoading={genLoading}
            genError={genError}
            onGenerate={handleGenerate}
            onSaveHistory={saveHistory}
            step={currentStep}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        MealList — Ton assistant culinaire IA · Sauvegarde locale, sans compte.
      </footer>
    </div>
  );
}

/* ------------------------- Header ------------------------- */

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[0_6px_16px_-4px_rgba(16,185,129,0.5)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 3v8a3 3 0 003 3v7M7 3v0M7 3H5M7 3h2M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-lg font-extrabold leading-none tracking-tight">MealList</p>
        <p className="mt-1 text-[11px] font-medium text-slate-500">Ton assistant culinaire IA</p>
      </div>
    </div>
  );
}

function Header({
  tab,
  setTab,
  onEditProfile,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onEditProfile: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <nav className="hidden rounded-full border border-slate-200 bg-slate-50 p-1 sm:flex">
            <TabButton active={tab === "suggest"} onClick={() => setTab("suggest")}>
              Qu'est-ce qu'on mange ?
            </TabButton>
            <TabButton active={tab === "cook"} onClick={() => setTab("cook")}>
              Cuisine
            </TabButton>
          </nav>
          <button
            onClick={onEditProfile}
            className="hidden shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 sm:inline-flex"
            title="Modifier mon profil"
          >
            ⚙︎ Profil
          </button>
        </div>
      </div>
      {/* Mobile tabs */}
      <div className="flex gap-1 border-t border-slate-100 bg-white px-3 py-2 sm:hidden">
        <TabButton active={tab === "suggest"} onClick={() => setTab("suggest")} full>
          Suggestions
        </TabButton>
        <TabButton active={tab === "cook"} onClick={() => setTab("cook")} full>
          Cuisine
        </TabButton>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
  full = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${full ? "flex-1" : ""} rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------- Questionnaire ------------------------- */

function Questionnaire({
  initial,
  onSave,
}: {
  initial: Profile;
  onSave: (p: Profile) => void;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [hasAllergies, setHasAllergies] = useState(
    initial.allergies !== "Aucune" && initial.allergies !== "",
  );

  const toggleCuisine = (c: string) => {
    setP((prev) => {
      const set = new Set(prev.cuisines);
      if (set.has(c)) set.delete(c);
      else set.add(c);
      return { ...prev, cuisines: [...set] };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Profil culinaire
          </p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Dis-nous en plus sur toi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            L'IA adapte les suggestions à tes goûts. Modifiable à tout moment.
          </p>
        </div>

        <div className="space-y-5">
          <Field label="Ton objectif ?">
            <ChipGroup
              options={GOALS}
              value={p.goal}
              onChange={(v) => setP((s) => ({ ...s, goal: v }))}
            />
          </Field>

          <Field label="Allergies ou intolérances ?">
            <div className="flex gap-2">
              <Chip
                active={!hasAllergies}
                onClick={() => {
                  setHasAllergies(false);
                  setP((s) => ({ ...s, allergies: "Aucune" }));
                }}
              >
                Non
              </Chip>
              <Chip active={hasAllergies} onClick={() => setHasAllergies(true)}>
                Oui
              </Chip>
            </div>
            {hasAllergies && (
              <input
                type="text"
                value={p.allergies === "Aucune" ? "" : p.allergies}
                onChange={(e) => setP((s) => ({ ...s, allergies: e.target.value }))}
                placeholder="ex: gluten, arachides, lactose…"
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            )}
          </Field>

          <Field label="Régime alimentaire">
            <ChipGroup
              options={DIETS}
              value={p.diet}
              onChange={(v) => setP((s) => ({ ...s, diet: v }))}
            />
          </Field>

          <Field label="Budget moyen par repas">
            <ChipGroup
              options={BUDGETS}
              value={p.budget}
              onChange={(v) => setP((s) => ({ ...s, budget: v }))}
            />
          </Field>

          <Field label="Temps de préparation max">
            <ChipGroup
              options={TIMES}
              value={p.time}
              onChange={(v) => setP((s) => ({ ...s, time: v }))}
            />
          </Field>

          <Field label="Cuisines préférées (plusieurs possibles)">
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((c) => (
                <Chip key={c} active={p.cuisines.includes(c)} onClick={() => toggleCuisine(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </Field>
        </div>

        <button
          onClick={() => onSave(p)}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-base font-bold text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] transition hover:brightness-110 active:scale-[0.99]"
        >
          Enregistrer mon profil
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} active={value === o} onClick={() => onChange(o)}>
          {o}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-[0_1px_0_rgba(16,185,129,0.15)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------- Suggest Tab ------------------------- */

function SuggestTab({
  profile,
  suggestions,
  loading,
  error,
  meals,
  addMeal,
  removeMeal,
  onEditProfile,
  onGoToCook,
}: {
  profile: Profile;
  suggestions: MealSuggestion[];
  loading: boolean;
  error: string | null;
  meals: string[];
  addMeal: (v: string) => void;
  removeMeal: (i: number) => void;
  onEditProfile: () => void;
  onGoToCook: () => void;
}) {
  const [input, setInput] = useState("");
  const list = suggestions.length > 0 ? suggestions : QUICK_MEALS;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          Suggestions personnalisées
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Qu'est-ce qu'on mange&nbsp;?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
          L'IA te propose des repas adaptés à ton profil. Ajoute ce qui te tente puis lance la
          génération de ta liste.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ProfilePill label={profile.goal} />
          <ProfilePill label={profile.diet} />
          <ProfilePill label={profile.budget} />
          <ProfilePill label={profile.time} />
          {profile.cuisines.slice(0, 2).map((c) => (
            <ProfilePill key={c} label={c} />
          ))}
          <button
            onClick={onEditProfile}
            className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-semibold text-slate-500 hover:border-emerald-400 hover:text-emerald-700"
          >
            Modifier mon profil
          </button>
        </div>
      </section>

      {/* Suggestions grid */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold tracking-tight">Idées de repas pour toi</h2>
          {loading && (
            <span className="text-xs font-medium text-slate-400">L'IA cuisine…</span>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading && suggestions.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : list.map((s) => (
                <MealCard
                  key={s.name}
                  suggestion={s}
                  added={meals.some((m) => m.toLowerCase() === s.name.toLowerCase())}
                  onAdd={() => addMeal(s.name)}
                />
              ))}
        </div>
      </section>

      {/* Custom add */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-6">
        <h2 className="text-base font-bold">Ajoute un autre repas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Une envie précise&nbsp;? Écris-la directement.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addMeal(input);
                setInput("");
              }
            }}
            placeholder="ex: pâtes carbonara, poulet rôti…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={() => {
              addMeal(input);
              setInput("");
            }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.6)] transition hover:brightness-110 active:scale-[0.98]"
          >
            Ajouter
          </button>
        </div>
      </section>

      {/* Selected meals */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold tracking-tight">Ta sélection</h2>
          <span className="text-xs font-medium text-slate-400">
            {meals.length} repas
          </span>
        </div>

        {meals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-400">
            Aucun repas sélectionné. Clique sur une suggestion ci-dessus.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meals.map((m, i) => (
              <SelectedMealCard key={i} name={m} onRemove={() => removeMeal(i)} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <button
        disabled={meals.length === 0}
        onClick={onGoToCook}
        className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-base font-extrabold text-white shadow-[0_20px_40px_-15px_rgba(16,185,129,0.6)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 3v8a3 3 0 003 3v7M17 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        Générer ma liste de courses
        <span className="opacity-70 transition group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  );
}

function ProfilePill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      {label}
    </span>
  );
}

function MealCard({
  suggestion,
  added,
  onAdd,
}: {
  suggestion: MealSuggestion;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-15px_rgba(15,23,42,0.15)]">
      <div className="text-3xl">{suggestion.emoji}</div>
      <h3 className="mt-3 text-base font-bold leading-tight tracking-tight">
        {suggestion.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{suggestion.description}</p>
      <button
        onClick={onAdd}
        disabled={added}
        className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
          added
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-900 text-white hover:bg-emerald-600"
        }`}
      >
        {added ? "✓ Ajouté" : "+ Ajouter ce repas"}
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="h-8 w-8 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-slate-100" />
      <div className="mt-4 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
    </div>
  );
}

function SelectedMealCard({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg">
          🍽️
        </div>
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      </div>
      <button
        onClick={onRemove}
        aria-label="Retirer"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-500"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------- Cook Tab ------------------------- */

function CookTab({
  meals,
  addMeal,
  removeMeal,
  ingredients,
  recipes,
  choices,
  setChoices,
  total,
  genLoading,
  genError,
  onGenerate,
  onSaveHistory,
  step,
}: {
  meals: string[];
  addMeal: (v: string) => void;
  removeMeal: (i: number) => void;
  ingredients: Ingredient[];
  recipes: RecipeInfo[];
  choices: Choices;
  setChoices: React.Dispatch<React.SetStateAction<Choices>>;
  total: number;
  genLoading: boolean;
  genError: string | null;
  onGenerate: () => void;
  onSaveHistory: () => void;
  step: number;
}) {
  const [input, setInput] = useState("");
  const hasList = ingredients.length > 0;

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          Cuisine · Étape {Math.min(step, 4)}/4
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Tes repas de la semaine
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Ajoute ce que tu veux manger. L'IA génère ta liste de courses complète.
        </p>
        <Stepper current={step} />
      </section>

      {/* Step 1 */}
      <StepBlock number={1} title="Saisie des repas" active={step === 1}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addMeal(input);
                setInput("");
              }
            }}
            placeholder="ex: pâtes carbonara, poulet rôti…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            onClick={() => {
              addMeal(input);
              setInput("");
            }}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            Ajouter
          </button>
        </div>

        {meals.length === 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Suggestions rapides
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_MEALS.map((s) => (
                <button
                  key={s.name}
                  onClick={() => addMeal(s.name)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700"
                >
                  {s.emoji} {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {meals.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {meals.map((m, i) => (
              <SelectedMealCard key={i} name={m} onRemove={() => removeMeal(i)} />
            ))}
          </div>
        )}
      </StepBlock>

      {/* Step 2 */}
      <StepBlock number={2} title="Génération automatique" active={step === 2}>
        {genError && (
          <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {genError}
          </div>
        )}
        <button
          disabled={meals.length === 0 || genLoading}
          onClick={onGenerate}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 text-base font-extrabold text-white shadow-[0_16px_36px_-16px_rgba(16,185,129,0.6)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
        >
          {genLoading
            ? "✨ L'IA prépare ta liste…"
            : hasList
              ? "🔄 Régénérer la liste"
              : "🤖 Générer ma liste de courses"}
        </button>

        {recipes.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recettes de référence
            </p>
            <div className="space-y-2">
              {recipes.map((r) => (
                <a
                  key={r.meal + r.sourceUrl}
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      pour {r.meal} · via {r.source}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">Voir ↗</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </StepBlock>

      {/* Step 3 */}
      <StepBlock number={3} title="Choix de qualité" active={step === 3 && hasList}>
        {!hasList ? (
          <p className="text-sm text-slate-400">
            Génère d'abord ta liste pour choisir la qualité de chaque produit.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {ingredients.map((ing) => {
                const selected = choices[ing.name] ?? 0;
                return (
                  <div
                    key={ing.name}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]"
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                      <h3 className="truncate text-sm font-bold">{ing.name}</h3>
                      <span className="shrink-0 text-xs font-medium text-slate-400">
                        {ing.quantity}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {ing.options.map((opt, idx) => {
                        const active = selected === idx;
                        const tier = ["Standard", "Qualité", "Premium"][idx] ?? "";
                        return (
                          <button
                            key={idx}
                            onClick={() =>
                              setChoices((c) => ({ ...c, [ing.name]: idx }))
                            }
                            className={`flex flex-col items-start rounded-xl border-2 p-3 text-left transition ${
                              active
                                ? "border-emerald-500 bg-emerald-50/70 shadow-[0_6px_16px_-10px_rgba(16,185,129,0.5)]"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                active ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {tier}
                            </span>
                            <span className="mt-1 text-xs font-medium text-slate-700">
                              {opt.label}
                            </span>
                            <span className="mt-1 text-base font-extrabold text-slate-900">
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

            <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                  Total estimé
                </p>
                <p className="text-3xl font-extrabold">{total.toFixed(2)}€</p>
                <p className="mt-0.5 text-xs text-white/60">
                  {ingredients.length} produits · {meals.length} repas
                </p>
              </div>
              <button
                onClick={onSaveHistory}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20"
              >
                💾 Sauvegarder cette liste
              </button>
            </div>
          </>
        )}
      </StepBlock>

      {/* Step 4 */}
      <StepBlock number={4} title="Choix du magasin" active={step === 3 && hasList}>
        {!hasList ? (
          <p className="text-sm text-slate-400">
            Choisis d'abord tes produits pour envoyer ton panier en magasin.
          </p>
        ) : (
          <StoreCart ingredients={ingredients} choices={choices} />
        )}
      </StepBlock>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  const steps = ["Repas", "Génération", "Qualité", "Magasin"];
  return (
    <div className="mt-6 flex items-center gap-2">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold transition ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-slate-900 text-white ring-4 ring-emerald-100"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                active ? "text-slate-900" : done ? "text-emerald-700" : "text-slate-400"
              }`}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`ml-1 hidden h-[2px] flex-1 rounded-full sm:block ${
                  done ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepBlock({
  number,
  title,
  active,
  children,
}: {
  number: number;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="relative">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold ${
            active
              ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_6px_14px_-6px_rgba(16,185,129,0.6)]"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {number}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Étape {number}/4
          </p>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.03)] sm:p-6">
        {children}
      </div>
    </section>
  );
}

/* ------------------------- Store Cart ------------------------- */

function StoreCart({
  ingredients,
  choices,
}: {
  ingredients: Ingredient[];
  choices: Choices;
}) {
  const [storeIdx, setStoreIdx] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const store = storeIdx !== null ? STORES[storeIdx] : null;

  const items = useMemo(
    () =>
      ingredients.map((ing) => {
        const idx = choices[ing.name] ?? 0;
        const opt = ing.options[idx];
        return {
          key: ing.name,
          query: ing.name,
          label: `${ing.quantity} ${ing.name}`,
          option: opt?.label ?? "",
          price: opt?.price ?? 0,
        };
      }),
    [ingredients, choices],
  );

  const openOne = (query: string, key: string) => {
    if (!store) return;
    window.open(store.search(query), "_blank", "noopener,noreferrer");
    setAdded((prev) => new Set(prev).add(key));
  };

  const openAll = () => {
    if (!store) return;
    items
      .filter((i) => !added.has(i.key))
      .forEach((it, idx) => {
        setTimeout(() => {
          window.open(store.search(it.query), "_blank", "noopener,noreferrer");
        }, idx * 250);
      });
    setAdded(new Set(items.map((i) => i.key)));
  };

  const copyList = async () => {
    const text = items.map((i) => `• ${i.label} (${i.option})`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  if (!store) {
    return (
      <div>
        <p className="mb-3 text-sm text-slate-500">Où veux-tu faire tes courses&nbsp;?</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STORES.map((s, i) => (
            <button
              key={s.name}
              onClick={() => {
                setStoreIdx(i);
                setAdded(new Set());
              }}
              className={`rounded-2xl bg-gradient-to-br ${s.accent} px-4 py-5 text-sm font-extrabold text-white shadow-[0_10px_25px_-12px_rgba(15,23,42,0.35)] transition hover:brightness-110 active:scale-[0.98]`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const done = added.size;
  const totalItems = items.length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Magasin sélectionné
          </p>
          <p className="text-base font-extrabold">{store.name}</p>
        </div>
        <button
          onClick={() => setStoreIdx(null)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-700"
        >
          Changer
        </button>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
          style={{ width: `${totalItems ? (done / totalItems) * 100 : 0}%` }}
        />
      </div>
      <p className="mb-4 text-xs font-medium text-slate-500">
        {done}/{totalItems} produits envoyés
      </p>

      <ul className="space-y-2">
        {items.map((it) => {
          const isAdded = added.has(it.key);
          return (
            <li
              key={it.key}
              className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                isAdded ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-semibold ${
                    isAdded ? "text-emerald-900" : "text-slate-800"
                  }`}
                >
                  {it.label}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {it.option} · {it.price.toFixed(2)}€
                </p>
              </div>
              <button
                onClick={() => openOne(it.query, it.key)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  isAdded
                    ? "bg-white text-emerald-700 hover:bg-emerald-100"
                    : "bg-slate-900 text-white hover:bg-emerald-600"
                }`}
              >
                {isAdded ? "Rouvrir" : "Ajouter"}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={openAll}
          className={`flex-1 rounded-xl bg-gradient-to-r ${store.accent} py-3 text-sm font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(15,23,42,0.35)]`}
        >
          🛒 Tout envoyer sur {store.name}
        </button>
        <button
          onClick={copyList}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {copied ? "✓ Copié" : "Copier la liste"}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Les magasins n'autorisent pas l'ajout automatique — chaque produit s'ouvre pré-recherché,
        prêt à ajouter en un clic.
      </p>
    </div>
  );
}
