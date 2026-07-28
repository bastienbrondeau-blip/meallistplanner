import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  generateIngredients,
  type Ingredient,
  type RecipeInfo,
} from "@/lib/generate-ingredients.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MealList — Cuisine libre & courses malines" },
      {
        name: "description",
        content:
          "Compose tes repas, découvre de vraies recettes sourcées et génère ta liste de courses en un clin d'œil.",
      },
      { property: "og:title", content: "MealList — Cuisine libre & courses malines" },
      {
        property: "og:description",
        content: "Compose tes repas, découvre de vraies recettes sourcées et génère ta liste de courses en un clin d'œil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MealList,
});

type Choices = Record<string, number>;

type HistoryEntry = {
  id: string;
  createdAt: number;
  meals: string[];
  ingredients: Ingredient[];
  recipes: RecipeInfo[];
  choices: Choices;
  total: number;
};

type WorkspaceState = {
  meals: string[];
  ingredients: Ingredient[];
  recipes: RecipeInfo[];
  choices: Choices;
};

const STORAGE_KEY = "meallist-workspace-v2";
const HISTORY_KEY = "meallist-history-v2";

type Store = {
  name: string;
  color: string;
  search: (q: string) => string;
};

const STORES: Store[] = [
  {
    name: "Carrefour",
    color: "bg-[#004E9F] hover:bg-[#003a75]",
    search: (q) => `https://www.carrefour.fr/s?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Leclerc",
    color: "bg-[#0066B3] hover:bg-[#00518f]",
    search: (q) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(q)}`,
  },
  {
    name: "Amazon Fresh",
    color: "bg-[#FF9900] hover:bg-[#e08700]",
    search: (q) => `https://www.amazon.fr/s?i=amazonfresh&k=${encodeURIComponent(q)}`,
  },
  {
    name: "Intermarché",
    color: "bg-[#E30613] hover:bg-[#b8050f]",
    search: (q) => `https://www.intermarche.com/recherche?q=${encodeURIComponent(q)}`,
  },
];

const SUGGESTIONS = [
  "Pâtes carbonara",
  "Poulet rôti",
  "Salade César",
  "Curry de légumes",
  "Saumon teriyaki",
  "Tacos au bœuf",
  "Ratatouille",
  "Risotto champignons",
];

type Tab = "repas" | "recettes" | "courses" | "panier" | "historique";

const NAV: {
  id: Tab;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { id: "repas", label: "Repas", icon: "🍽️", desc: "Compose ta semaine" },
  { id: "recettes", label: "Recettes", icon: "📖", desc: "Sources vérifiées" },
  { id: "courses", label: "Liste", icon: "🧾", desc: "Qualité & prix" },
  { id: "panier", label: "Panier", icon: "🛒", desc: "Envoi en magasin" },
  { id: "historique", label: "Historique", icon: "🗂️", desc: "Listes passées" },
];

function MealList() {
  const [tab, setTab] = useState<Tab>("repas");
  const [meals, setMeals] = useState<string[]>([]);
  const [mealInput, setMealInput] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeInfo[]>([]);
  const [choices, setChoices] = useState<Choices>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const generate = useServerFn(generateIngredients);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<WorkspaceState>;
        if (Array.isArray(s.meals)) setMeals(s.meals);
        if (Array.isArray(s.ingredients)) setIngredients(s.ingredients);
        if (Array.isArray(s.recipes)) setRecipes(s.recipes);
        if (s.choices) setChoices(s.choices);
      }
      const rawH = localStorage.getItem(HISTORY_KEY);
      if (rawH) {
        const h = JSON.parse(rawH);
        if (Array.isArray(h)) setHistory(h);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ meals, ingredients, recipes, choices } satisfies WorkspaceState),
    );
  }, [meals, ingredients, recipes, choices, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history, hydrated]);

  const addMeal = (value?: string) => {
    const v = (value ?? mealInput).trim();
    if (!v) return;
    if (meals.some((m) => m.toLowerCase() === v.toLowerCase())) {
      setMealInput("");
      return;
    }
    setMeals((m) => [...m, v]);
    setMealInput("");
  };

  const removeMeal = (i: number) => setMeals((m) => m.filter((_, idx) => idx !== i));

  const total = useMemo(
    () =>
      ingredients.reduce((sum, ing) => {
        const idx = choices[ing.name] ?? 0;
        return sum + (ing.options[idx]?.price ?? 0);
      }, 0),
    [ingredients, choices],
  );

  const handleGenerate = async () => {
    if (meals.length === 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await generate({ data: { meals } });
      setIngredients(res.ingredients);
      setRecipes(res.recipes);
      const initial: Choices = {};
      res.ingredients.forEach((i) => (initial[i.name] = 0));
      setChoices(initial);
      setTab("recettes");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = () => {
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

  const restoreEntry = (entry: HistoryEntry) => {
    setMeals(entry.meals);
    setIngredients(entry.ingredients);
    setRecipes(entry.recipes);
    setChoices(entry.choices);
    setTab("courses");
  };

  const deleteEntry = (id: string) => setHistory((h) => h.filter((e) => e.id !== id));

  const clearWorkspace = () => {
    setMeals([]);
    setIngredients([]);
    setRecipes([]);
    setChoices({});
    setError(null);
  };

  const hasList = ingredients.length > 0;
  const counts: Record<Tab, number> = {
    repas: meals.length,
    recettes: recipes.length,
    courses: ingredients.length,
    panier: ingredients.length,
    historique: history.length,
  };

  const goTab = (t: Tab) => {
    setTab(t);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            🛒
          </div>
          <div>
            <p className="text-sm font-bold">MealList</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              {NAV.find((n) => n.id === tab)?.label}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium"
        >
          ☰
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-lg text-white shadow-sm">
                🛒
              </div>
              <div>
                <p className="text-base font-bold tracking-tight">MealList</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-400">
                  Studio de courses
                </p>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
              {NAV.map((n) => {
                const active = tab === n.id;
                const count = counts[n.id];
                return (
                  <button
                    key={n.id}
                    onClick={() => goTab(n.id)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                        active ? "bg-white/10" : "bg-slate-100 group-hover:bg-white"
                      }`}
                    >
                      {n.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{n.label}</span>
                        {count > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              active
                                ? "bg-white/15 text-white"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                      <span
                        className={`block text-[11px] ${active ? "text-white/60" : "text-slate-400"}`}
                      >
                        {n.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {hasList && (
              <div className="border-t border-slate-100 px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Total estimé
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{total.toFixed(2)}€</p>
                <p className="text-xs text-slate-500">
                  {ingredients.length} produits · {meals.length} repas
                </p>
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <button
            aria-label="Fermer le menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          />
        )}

        {/* Main */}
        <main className="min-h-screen flex-1">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
            <PageHeader
              tab={tab}
              onClear={clearWorkspace}
              canClear={meals.length > 0 || ingredients.length > 0}
            />

            {tab === "repas" && (
              <RepasTab
                meals={meals}
                mealInput={mealInput}
                setMealInput={setMealInput}
                addMeal={addMeal}
                removeMeal={removeMeal}
                loading={loading}
                error={error}
                hasList={hasList}
                onGenerate={handleGenerate}
              />
            )}

            {tab === "recettes" && (
              <RecettesTab
                recipes={recipes}
                openRecipe={openRecipe}
                setOpenRecipe={setOpenRecipe}
                onGoRepas={() => setTab("repas")}
                onGoCourses={() => setTab("courses")}
                hasList={hasList}
              />
            )}

            {tab === "courses" && (
              <CoursesTab
                ingredients={ingredients}
                choices={choices}
                setChoices={setChoices}
                total={total}
                onSave={saveToHistory}
                onGoPanier={() => setTab("panier")}
                onGoRepas={() => setTab("repas")}
              />
            )}

            {tab === "panier" && (
              <PanierTab
                ingredients={ingredients}
                choices={choices}
                total={total}
                onGoCourses={() => setTab("courses")}
              />
            )}

            {tab === "historique" && (
              <HistoryView
                history={history}
                onRestore={restoreEntry}
                onDelete={deleteEntry}
                onGoCuisine={() => setTab("repas")}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PageHeader({
  tab,
  onClear,
  canClear,
}: {
  tab: Tab;
  onClear: () => void;
  canClear: boolean;
}) {
  const current = NAV.find((n) => n.id === tab)!;
  return (
    <div className="mb-6 flex items-end justify-between border-b border-slate-200 pb-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
          {current.icon} {current.desc}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{current.label}</h1>
      </div>
      {canClear && tab === "repas" && (
        <button
          onClick={onClear}
          className="text-xs font-medium text-slate-400 hover:text-red-500"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: string;
  title: string;
  desc: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
      <p className="text-4xl">{icon}</p>
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function RepasTab({
  meals,
  mealInput,
  setMealInput,
  addMeal,
  removeMeal,
  loading,
  error,
  hasList,
  onGenerate,
}: {
  meals: string[];
  mealInput: string;
  setMealInput: (v: string) => void;
  addMeal: (v?: string) => void;
  removeMeal: (i: number) => void;
  loading: boolean;
  error: string | null;
  hasList: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-5">
      <Card>
        <h2 className="text-base font-bold">Ajoute un repas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Écris ce que tu veux manger cette semaine. Sans ordre imposé.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={mealInput}
            onChange={(e) => setMealInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMeal()}
            placeholder="ex: pâtes carbonara, boeuf bourguignon…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          <button
            onClick={() => addMeal()}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            Ajouter
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.filter((s) => !meals.some((m) => m.toLowerCase() === s.toLowerCase()))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                onClick={() => addMeal(s)}
                className="rounded-full border border-dashed border-emerald-300 bg-emerald-50/60 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                + {s}
              </button>
            ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Repas au menu</h2>
          <span className="text-xs text-slate-500">{meals.length} sélection(s)</span>
        </div>

        {meals.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-400">
            Aucun repas ajouté pour le moment.
          </p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {meals.map((m, i) => (
              <li
                key={i}
                className="group flex items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-3 pr-1.5 text-sm text-white shadow-sm"
              >
                <span>🍽️ {m}</span>
                <button
                  onClick={() => removeMeal(i)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs opacity-70 hover:bg-white/20 hover:opacity-100"
                  aria-label="Supprimer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          disabled={meals.length === 0 || loading}
          onClick={onGenerate}
          className="mt-5 w-full rounded-xl bg-slate-900 py-4 text-base font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {loading
            ? "✨ L'IA cuisine ta liste…"
            : hasList
              ? "🔄 Regénérer avec ces repas"
              : "🤖 Générer recettes & liste"}
        </button>
      </Card>
    </div>
  );
}

function RecettesTab({
  recipes,
  openRecipe,
  setOpenRecipe,
  onGoRepas,
  onGoCourses,
  hasList,
}: {
  recipes: RecipeInfo[];
  openRecipe: string | null;
  setOpenRecipe: (v: string | null) => void;
  onGoRepas: () => void;
  onGoCourses: () => void;
  hasList: boolean;
}) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="📖"
        title="Aucune recette encore"
        desc="Ajoute des repas et lance la génération pour découvrir des recettes sourcées."
        action={{ label: "Ajouter des repas", onClick: onGoRepas }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Recettes de référence</h2>
          <span className="text-xs text-slate-500">{recipes.length} recette(s)</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Sélectionnées par l'IA avec la source d'origine (Marmiton, 750g…).
        </p>

        <div className="mt-4 space-y-2">
          {recipes.map((r) => {
            const open = openRecipe === r.meal;
            return (
              <div
                key={r.meal}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  onClick={() => setOpenRecipe(open ? null : r.meal)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      pour <span className="text-slate-700">{r.meal}</span> · via {r.source}
                    </p>
                  </div>
                  <span className={`transition ${open ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {open && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
                    <p>{r.summary}</p>
                    {r.sourceUrl && (
                      <a
                        href={r.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        Voir la recette sur {r.source} ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {hasList && (
        <button
          onClick={onGoCourses}
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Passer à la liste de courses →
        </button>
      )}
    </div>
  );
}

function CoursesTab({
  ingredients,
  choices,
  setChoices,
  total,
  onSave,
  onGoPanier,
  onGoRepas,
}: {
  ingredients: Ingredient[];
  choices: Choices;
  setChoices: React.Dispatch<React.SetStateAction<Choices>>;
  total: number;
  onSave: () => void;
  onGoPanier: () => void;
  onGoRepas: () => void;
}) {
  if (ingredients.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="Pas encore de liste"
        desc="Génère d'abord ta liste depuis l'onglet Repas."
        action={{ label: "Ajouter des repas", onClick: onGoRepas }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Ta liste de courses</h2>
          <span className="text-xs text-slate-500">{ingredients.length} produits</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Choisis la qualité de chaque produit — le total se met à jour en direct.
        </p>

        <div className="mt-4 space-y-3">
          {ingredients.map((ing) => {
            const selected = choices[ing.name] ?? 0;
            return (
              <div key={ing.name} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">{ing.name}</h3>
                  <span className="text-xs text-slate-500">{ing.quantity}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ing.options.map((opt, idx) => {
                    const active = selected === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          setChoices((c) => ({ ...c, [ing.name]: idx }))
                        }
                        className={`flex items-center justify-between rounded-lg border-2 px-3 py-2 text-left transition ${
                          active
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-medium text-slate-800">{opt.label}</span>
                        <span className="ml-2 text-sm font-bold">{opt.price.toFixed(2)}€</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl bg-slate-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">Total estimé</p>
          <p className="text-3xl font-bold">{total.toFixed(2)}€</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onSave}
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/20"
          >
            💾 Sauvegarder
          </button>
          <button
            onClick={onGoPanier}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-400"
          >
            🛒 Envoyer au magasin →
          </button>
        </div>
      </div>
    </div>
  );
}

function PanierTab({
  ingredients,
  choices,
  total,
  onGoCourses,
}: {
  ingredients: Ingredient[];
  choices: Choices;
  total: number;
  onGoCourses: () => void;
}) {
  if (ingredients.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Panier vide"
        desc="Génère ta liste avant de choisir un magasin."
        action={{ label: "Ajouter des repas", onClick: onGoCourses }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Envoyer au magasin</h2>
          <span className="text-xs text-slate-500">Total {total.toFixed(2)}€</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Chaque produit s'ouvre pré-recherché sur le site du magasin, prêt à ajouter.
        </p>
        <StoreCart ingredients={ingredients} choices={choices} />
      </Card>
    </div>
  );
}

function StoreCart({
  ingredients,
  choices,
}: {
  ingredients: Ingredient[];
  choices: Choices;
}) {
  const [store, setStore] = useState<Store | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const items = useMemo(
    () =>
      ingredients.map((ing) => {
        const idx = choices[ing.name] ?? 0;
        const opt = ing.options[idx];
        return {
          key: ing.name,
          query: `${ing.name}`,
          label: `${ing.quantity} ${ing.name}`,
          option: opt?.label ?? "",
          price: opt?.price ?? 0,
        };
      }),
    [ingredients, choices],
  );

  const pickStore = (s: Store) => {
    setStore(s);
    setAdded(new Set());
  };

  const openOne = (query: string, key: string) => {
    if (!store) return;
    window.open(store.search(query), "_blank", "noopener,noreferrer");
    setAdded((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const openAll = () => {
    if (!store) return;
    const remaining = items.filter((i) => !added.has(i.key));
    remaining.forEach((it, idx) => {
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
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STORES.map((s) => (
            <button
              key={s.name}
              onClick={() => pickStore(s)}
              className={`flex items-center justify-center rounded-xl px-3 py-4 text-sm font-bold text-white shadow-sm transition active:scale-[0.98] ${s.color}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const done = added.size;
  const total = items.length;

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Magasin sélectionné
          </p>
          <p className="text-base font-bold">{store.name}</p>
        </div>
        <button
          onClick={() => setStore(null)}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          Changer
        </button>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {done}/{total} produits envoyés au panier
      </p>

      <ul className="space-y-2">
        {items.map((it) => {
          const isAdded = added.has(it.key);
          return (
            <li
              key={it.key}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
                isAdded ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <p
                  className={`truncate text-sm font-medium ${
                    isAdded
                      ? "text-emerald-900 line-through decoration-emerald-400"
                      : "text-slate-800"
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
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
                  isAdded ? "bg-white text-emerald-700 hover:bg-emerald-100" : `${store.color} text-white`
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
          className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white shadow-md ${store.color}`}
        >
          🛒 Tout envoyer sur {store.name}
        </button>
        <button
          onClick={copyList}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copied ? "✓ Copié" : "Copier la liste"}
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Astuce : autorise les pop-ups pour ouvrir tous les produits d'un coup. Les magasins n'autorisent pas
        l'ajout automatique — chaque produit s'ouvre pré-recherché, il suffit de cliquer « Ajouter » sur leur
        site.
      </p>
    </div>
  );
}

function HistoryView({
  history,
  onRestore,
  onDelete,
  onGoCuisine,
}: {
  history: HistoryEntry[];
  onRestore: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onGoCuisine: () => void;
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon="🗂️"
        title="Aucun historique"
        desc="Génère une liste et sauvegarde-la pour la retrouver ici."
        action={{ label: "Aller cuisiner", onClick: onGoCuisine }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {history.map((e) => {
        const date = new Date(e.createdAt);
        return (
          <div
            key={e.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {date.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="mt-1 truncate text-base font-semibold">
                  {e.meals.slice(0, 3).join(", ")}
                  {e.meals.length > 3 && ` +${e.meals.length - 3}`}
                </p>
                <p className="text-xs text-slate-500">
                  {e.ingredients.length} produits · {e.recipes.length} recettes
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-700">{e.total.toFixed(2)}€</p>
              </div>
            </div>

            {e.recipes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.recipes.map((r) => (
                  <a
                    key={r.meal + r.sourceUrl}
                    href={r.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-200"
                    title={r.title}
                  >
                    {r.meal} · {r.source} ↗
                  </a>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onRestore(e)}
                className="flex-1 rounded-lg bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Rouvrir
              </button>
              <button
                onClick={() => onDelete(e.id)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 hover:border-red-200 hover:text-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
