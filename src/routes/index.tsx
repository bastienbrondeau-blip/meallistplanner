import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChefHat,
  Clock,
  History,
  Home,
  Loader2,
  Plus,
  Settings2,
  ShoppingCart,
  Sparkles,
  Star,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Setup } from "@/components/meallist/Setup";
import { MacroBadges, MealPicker } from "@/components/meallist/MealPicker";
import { RecipeSheet } from "@/components/meallist/RecipeSheet";
import { DayPlanner } from "@/components/meallist/DayPlanner";
import { GroceryList } from "@/components/meallist/GroceryList";
import { NutritionExport } from "@/components/meallist/NutritionExport";
import { generateIngredients } from "@/lib/generate-ingredients.functions";
import { suggestMeals, type MealSuggestion } from "@/lib/suggest-meals.functions";
import {
  DAYS,
  KEYS,
  PEOPLE_PRESETS,
  SLOTS,
  cartTotal,
  emptyProfile,
  isWeekend,
  load,
  mergeItems,
  save,
  storeById,
  uid,
  type CartItem,
  type Favorite,
  type HistoryEntry,
  type Meal,
  type Profile,
  type SlotId,
  type StoreId,
  type Week,
} from "@/lib/meallist";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MealList — Ton assistant culinaire IA" },
      {
        name: "description",
        content:
          "MealList planifie ta semaine de repas (mode Fitness ou Cuisine classique) et génère ta liste de courses avec choix de qualité et prix.",
      },
      { property: "og:title", content: "MealList — Ton assistant culinaire IA" },
      {
        property: "og:description",
        content:
          "Suggestions de repas personnalisées, calendrier jour par jour et liste de courses IA prête pour ton magasin.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Tab = "accueil" | "cuisine" | "favoris" | "historique";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "accueil", label: "Accueil", icon: Home },
  { id: "cuisine", label: "Cuisine", icon: ChefHat },
  { id: "favoris", label: "Favoris", icon: Star },
  { id: "historique", label: "Historique", icon: History },
];

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("accueil");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showSetup, setShowSetup] = useState(false);
  const [week, setWeek] = useState<Week>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [basket, setBasket] = useState<Meal[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [day, setDay] = useState(0);
  const [picker, setPicker] = useState<{ open: boolean; day?: number; slot?: SlotId }>({ open: false });
  const [recipeMeal, setRecipeMeal] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugError, setSugError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [customPeople, setCustomPeople] = useState("");
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [allergyGate, setAllergyGate] = useState<null | "week" | "list">(null);
  const [allergyOk, setAllergyOk] = useState(false);

  useEffect(() => {
    const p = load<Profile>(KEYS.profile, emptyProfile);
    setProfile({ ...emptyProfile, ...p });
    setWeek(load<Week>(KEYS.week, {}));
    setCart(load<CartItem[]>(KEYS.cart, []));
    setBasket(load<Meal[]>(KEYS.basket, []));
    setFavorites(load<Favorite[]>(KEYS.favorites, []));
    setHistory(load<HistoryEntry[]>(KEYS.history, []));
    setShowSetup(!p.done);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(KEYS.profile, profile);
  }, [profile, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEYS.week, week);
  }, [week, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEYS.cart, cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEYS.basket, basket);
  }, [basket, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEYS.favorites, favorites);
  }, [favorites, hydrated]);
  useEffect(() => {
    if (hydrated) save(KEYS.history, history);
  }, [history, hydrated]);

  const fitness = profile.mode === "fitness";
  const store = storeById(profile.store);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const plannedMeals = useMemo(() => Object.values(week).filter((m): m is Meal => !!m), [week]);
  const weekComplete = useMemo(
    () => DAYS.every((_, d) => SLOTS.every((s) => !!week[`${d}-${s.id}`])),
    [week],
  );
  const prepHours = Math.round(plannedMeals.length * 0.4);

  const isFav = (name: string) => favorites.some((f) => f.name.toLowerCase() === name.toLowerCase());
  const toggleFav = (m: { name: string; emoji: string; description: string; macros?: Meal["macros"] }) => {
    setFavorites((prev) =>
      prev.some((f) => f.name.toLowerCase() === m.name.toLowerCase())
        ? prev.filter((f) => f.name.toLowerCase() !== m.name.toLowerCase())
        : [...prev, { name: m.name, emoji: m.emoji, description: m.description, macros: m.macros }],
    );
  };

  const fetchSuggestions = async () => {
    setSugLoading(true);
    setSugError(null);
    try {
      const res = await suggestMeals({
        data: {
          profile: { ...profile, store: store?.name ?? "Carrefour" },
          count: 10,
          people: profile.people,
        },
      });
      setSuggestions(res.suggestions);
    } catch (e) {
      setSugError(e instanceof Error ? e.message : "Suggestions indisponibles");
    } finally {
      setSugLoading(false);
    }
  };

  useEffect(() => {
    if (hydrated && profile.done && suggestions.length === 0 && !sugLoading && !sugError) void fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile.done]);

  const addToBasket = (m: Meal) => {
    setBasket((prev) => (prev.some((x) => x.name === m.name) ? prev : [...prev, m]));
    toast.success(`${m.name} ajouté à ta sélection`);
  };

  const requireAllergyCheck = (target: "week" | "list", run: () => void) => {
    if (profile.hasAllergies && profile.allergies.trim() && !allergyOk) {
      setAllergyGate(target);
      return;
    }
    run();
  };

  const autoGenerateWeek = async () => {
    setGeneratingWeek(true);
    try {
      const base = { profile: { ...profile, store: store?.name ?? "Carrefour" }, people: profile.people };
      const [bf, quick, gourmand] = await Promise.all([
        suggestMeals({ data: { ...base, slot: "Petit-déjeuner", count: 7 } }),
        suggestMeals({ data: { ...base, slot: "Déjeuner / Dîner", complexity: "simple", count: 8 } }),
        suggestMeals({ data: { ...base, slot: "Déjeuner / Dîner", complexity: "gourmand", count: 6 } }),
      ]);
      const toMeal = (s: MealSuggestion): Meal => ({
        id: uid(),
        name: s.name,
        emoji: s.emoji,
        description: s.description,
        macros: s.macros,
      });
      const next: Week = { ...week };
      let bi = 0;
      let qi = 0;
      let gi = 0;
      for (let d = 0; d < DAYS.length; d++) {
        const mk = `${d}-matin`;
        const bfs = bf.suggestions[bi++ % Math.max(bf.suggestions.length, 1)];
        if (bfs) next[mk] = toMeal(bfs);
        for (const slot of ["midi", "soir"] as SlotId[]) {
          const k = `${d}-${slot}`;
          const pool = isWeekend(d) ? gourmand.suggestions : quick.suggestions;
          const idx = isWeekend(d) ? gi++ : qi++;
          const s = pool[idx % Math.max(pool.length, 1)];
          if (s) next[k] = toMeal(s);
        }
      }
      // Les repas déjà sélectionnés à la main prennent le dessus sur midi/soir
      let bIdx = 0;
      for (let d = 0; d < DAYS.length && bIdx < basket.length; d++) {
        for (const slot of ["midi", "soir"] as SlotId[]) {
          const b = basket[bIdx];
          if (b && bIdx < basket.length) {
            next[`${d}-${slot}`] = { ...b, id: uid() };
            bIdx++;
          }
        }
      }
      setWeek(next);
      setTab("cuisine");
      toast.success("Ta semaine est prête, petit-déjeuners inclus");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setGeneratingWeek(false);
    }
  };

  const generateGroceries = async () => {
    const meals = plannedMeals.map((m) => m.name);
    if (meals.length === 0) {
      toast.error("Planifie au moins un repas avant de générer la liste.");
      return;
    }
    setCartLoading(true);
    try {
      const res = await generateIngredients({
        data: {
          meals,
          store: store?.name ?? "Carrefour",
          budget: profile.budget,
          people: profile.people,
          allergies: profile.hasAllergies ? profile.allergies : "",
        },
      });
      const incoming: CartItem[] = res.ingredients.map((i) => ({
        id: uid(),
        name: i.name,
        quantity: i.quantity,
        aisle: i.aisle,
        options: i.options,
        selected: 0,
        from: meals,
      }));
      const merged = mergeItems(cart, incoming);
      setCart(merged);
      setHistory((prev) =>
        [
          {
            id: uid(),
            date: new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
            people: profile.people,
            store: profile.store,
            total: cartTotal(merged),
            meals: Object.entries(week)
              .filter(([, m]) => !!m)
              .map(([k, m]) => ({
                day: DAYS[Number(k.split("-")[0])] ?? "",
                slot: SLOTS.find((s) => s.id === k.split("-")[1])?.label ?? "",
                name: m!.name,
                emoji: m!.emoji,
              })),
            items: merged,
          },
          ...prev,
        ].slice(0, 10),
      );
      toast.success(`✓ ${incoming.length} ingrédients générés pour ${profile.people} personne(s)`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setCartLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (showSetup) {
    return (
      <Setup
        initial={profile}
        onDone={(p) => {
          setProfile(p);
          setShowSetup(false);
          setSuggestions([]);
          setSugError(null);
          setAllergyOk(false);
          setTab("accueil");
          toast.success("Profil enregistré");
        }}
        onCancel={profile.done ? () => setShowSetup(false) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted">
      <header className="no-print sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-foreground">MealList</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Ton assistant culinaire IA</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground sm:inline">
              {fitness ? "Mode Fitness" : "Cuisine classique"}
            </span>
            <Button variant="outline" size="icon" aria-label="Modifier mon profil" onClick={() => setShowSetup(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 pb-28 sm:px-8 sm:py-12 md:pb-16">
        {tab === "accueil" && (
          <div className="space-y-12">
            <section>
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Qu'est-ce qu'on mange&nbsp;?
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                {fitness
                  ? `Suggestions riches en protéines, calibrées pour ton objectif « ${profile.goal} ».`
                  : "Des suggestions choisies selon ton régime, ton budget et tes cuisines préférées."}
              </p>
            </section>

            {profile.hasAllergies && profile.allergies.trim() && (
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4">
                <AlertTriangle className="h-5 w-5 text-accent" />
                <p className="text-sm text-secondary-foreground">
                  <span className="font-semibold">Allergies détectées :</span> {profile.allergies}. Aucun aliment
                  allergène ne sera inclus.
                </p>
              </div>
            )}

            <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Pour combien de personnes&nbsp;?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les quantités de ta liste de courses seront calculées pour ce nombre.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {PEOPLE_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, people: n }))}
                    aria-pressed={profile.people === n}
                    className={cn(
                      "h-12 w-14 rounded-2xl border text-base font-semibold transition-all duration-300",
                      profile.people === n
                        ? "border-primary bg-primary/[0.07] text-primary shadow-soft"
                        : "border-border bg-background text-foreground hover:border-primary/40",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={customPeople}
                    onChange={(e) => setCustomPeople(e.target.value)}
                    type="number"
                    inputMode="numeric"
                    placeholder="Autre"
                    className="h-12 w-24 rounded-2xl text-base"
                  />
                  <Button
                    variant="outline"
                    className="h-12 rounded-2xl"
                    disabled={!Number(customPeople)}
                    onClick={() => setProfile((p) => ({ ...p, people: Math.max(1, Number(customPeople)) }))}
                  >
                    Ok
                  </Button>
                </div>
                <span className="text-sm font-medium text-primary">
                  Sélectionné : {profile.people} personne{profile.people > 1 ? "s" : ""}
                </span>
              </div>
            </section>

            <section className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Suggestions pour toi</h2>
                <Button variant="ghost" onClick={() => void fetchSuggestions()} disabled={sugLoading}>
                  <Sparkles className={cn("mr-2 h-4 w-4", sugLoading && "animate-pulse")} /> Rafraîchir
                </Button>
              </div>

              {sugError && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {sugError}
                </p>
              )}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {sugLoading &&
                  Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-3xl" />)}
                {!sugLoading &&
                  suggestions.map((s) => (
                    <article
                      key={s.name}
                      className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-3xl" aria-hidden>
                          {s.emoji}
                        </span>
                        <button
                          type="button"
                          aria-label={`Ajouter ${s.name} aux favoris`}
                          onClick={() => toggleFav(s)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-accent"
                        >
                          <Star className={cn("h-5 w-5", isFav(s.name) && "fill-accent text-accent")} />
                        </button>
                      </div>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{s.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {[s.time, s.price].filter(Boolean).join(" · ")}
                      </p>
                      {fitness && s.macros && <MacroBadges macros={s.macros} />}
                      <div className="mt-5 flex-1" />
                      <Button
                        className="h-12 w-full text-base font-semibold shadow-cta transition-all hover:brightness-110"
                        onClick={() =>
                          addToBasket({
                            id: uid(),
                            name: s.name,
                            emoji: s.emoji,
                            description: s.description,
                            macros: s.macros,
                          })
                        }
                      >
                        <Plus className="mr-1.5 h-4 w-4" /> Ajouter
                      </Button>
                    </article>
                  ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Ajoute une autre recette</h2>
              <div className="flex gap-3">
                <Input
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && custom.trim()) {
                      addToBasket({ id: uid(), name: custom.trim(), emoji: "🍽️", description: "Ajouté par toi" });
                      setCustom("");
                    }
                  }}
                  placeholder="ex: pâtes carbonara, poulet rôti…"
                  className="h-13 flex-1 text-base"
                />
                <Button
                  className="h-13 px-6"
                  disabled={!custom.trim()}
                  onClick={() => {
                    addToBasket({ id: uid(), name: custom.trim(), emoji: "🍽️", description: "Ajouté par toi" });
                    setCustom("");
                  }}
                >
                  Ajouter
                </Button>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Recettes sélectionnées <span className="text-muted-foreground">({basket.length})</span>
              </h2>
              {basket.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center text-base text-muted-foreground">
                  Aucune recette pour l'instant. Ajoute une suggestion ou ton propre plat.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {basket.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
                    >
                      <span className="text-2xl" aria-hidden>
                        {m.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{m.name}</p>
                        <p className="text-sm text-muted-foreground">{m.description}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Retirer ${m.name}`}
                        onClick={() => setBasket((prev) => prev.filter((x) => x.id !== m.id))}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Button
              onClick={() => requireAllergyCheck("week", () => void autoGenerateWeek())}
              disabled={generatingWeek}
              className="gradient-cta h-16 w-full rounded-2xl text-lg font-semibold shadow-cta transition-all duration-300 hover:brightness-110"
            >
              {generatingWeek ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <UtensilsCrossed className="mr-2 h-5 w-5" />
              )}
              Générer ma semaine
            </Button>
          </div>
        )}

        {tab === "cuisine" && (
          <div className="space-y-10">
            <DayPlanner
              week={week}
              day={day}
              onDayChange={setDay}
              fitness={fitness}
              generating={generatingWeek}
              onGenerateWeek={() => requireAllergyCheck("week", () => void autoGenerateWeek())}
              onAdd={(d, slot) => setPicker({ open: true, day: d, slot })}
              onOpenMeal={(m) => setRecipeMeal(m.name)}
              onRemove={(key) =>
                setWeek((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
            />

            {weekComplete && (
              <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-card">
                <p className="text-lg font-semibold text-foreground">
                  💰 Coût estimé : {total > 0 ? `${total.toFixed(2)} €` : "à générer"} · ⏱️ Temps de prep total : ~
                  {prepHours} h
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Semaine complète pour {profile.people} personne{profile.people > 1 ? "s" : ""}.
                </p>
              </div>
            )}

            <Button
              onClick={() => requireAllergyCheck("list", () => void generateGroceries())}
              disabled={cartLoading}
              className="gradient-cta h-16 w-full rounded-2xl text-lg font-semibold shadow-cta transition-all duration-300 hover:brightness-110"
            >
              {cartLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-5 w-5" />
              )}
              Générer ma liste de courses ({plannedMeals.length} repas)
            </Button>

            {plannedMeals.length > 0 && <NutritionExport meals={plannedMeals} />}

            <section className="space-y-6">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ta liste de courses</h2>
                <p className="mt-2 text-base text-muted-foreground">
                  Pour {profile.people} personne{profile.people > 1 ? "s" : ""} · ingrédients consolidés, choix de
                  qualité, total en direct.
                </p>
              </div>
              <GroceryList
                items={cart}
                store={profile.store}
                people={profile.people}
                loading={cartLoading}
                onStoreChange={(id: StoreId) => setProfile((p) => ({ ...p, store: id }))}
                onSelectOption={(id, idx) =>
                  setCart((prev) => prev.map((i) => (i.id === id ? { ...i, selected: idx } : i)))
                }
                onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
                onClear={() => {
                  setCart([]);
                  toast.success("Liste vidée");
                }}
              />
            </section>
          </div>
        )}

        {tab === "favoris" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Mes recettes favorites</h2>
              <p className="mt-2 text-base text-muted-foreground">
                Ton répertoire personnel, réutilisable à chaque semaine.
              </p>
            </div>
            {favorites.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center text-base text-muted-foreground">
                Clique sur l'étoile ⭐ d'une recette pour la sauvegarder ici.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {favorites.map((f) => (
                  <article key={f.name} className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-card">
                    <div className="flex items-start justify-between">
                      <span className="text-3xl" aria-hidden>
                        {f.emoji}
                      </span>
                      <button
                        type="button"
                        aria-label={`Retirer ${f.name} des favoris`}
                        onClick={() => toggleFav(f)}
                        className="rounded-lg p-1.5 text-accent transition-colors hover:text-destructive"
                      >
                        <Star className="h-5 w-5 fill-accent" />
                      </button>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">{f.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                    {fitness && f.macros && <MacroBadges macros={f.macros} />}
                    <div className="mt-4 flex-1" />
                    <Button
                      className="h-12 w-full font-semibold"
                      onClick={() => addToBasket({ id: uid(), ...f })}
                    >
                      <Plus className="mr-1.5 h-4 w-4" /> Ajouter à ma sélection
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "historique" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Historique</h2>
              <p className="mt-2 text-base text-muted-foreground">Tes 10 dernières semaines générées.</p>
            </div>
            {history.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center text-base text-muted-foreground">
                Aucune semaine générée pour l'instant.
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <article key={h.id} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="text-lg font-semibold text-foreground">{h.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {h.people} pers. · {storeById(h.store)?.name} · {h.total.toFixed(2)} € · {h.items.length}{" "}
                        produits
                      </p>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {h.meals.map((m) => `${m.emoji} ${m.name}`).join(" · ")}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        className="h-11 rounded-xl"
                        onClick={() => {
                          const next: Week = {};
                          h.meals.forEach((m) => {
                            const d = DAYS.indexOf(m.day);
                            const slot = SLOTS.find((s) => s.label === m.slot)?.id;
                            if (d >= 0 && slot) next[`${d}-${slot}`] = { id: uid(), name: m.name, emoji: m.emoji, description: "Depuis ton historique" };
                          });
                          setWeek(next);
                          setProfile((p) => ({ ...p, people: h.people, store: h.store }));
                          setTab("cuisine");
                          toast.success("Semaine relancée");
                        }}
                      >
                        Relancer cette semaine
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={() => {
                          setCart(h.items);
                          setTab("cuisine");
                          toast.success("Liste chargée");
                        }}
                      >
                        Voir la liste
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-11 rounded-xl"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(h.items.map((i) => `- ${i.name} — ${i.quantity}`).join("\n"))
                            .then(() => toast.success("Liste copiée"))
                            .catch(() => toast.error("Copie impossible"));
                        }}
                      >
                        Copier cette liste
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-14 text-center text-sm text-muted-foreground">
          Total estimé : {total.toFixed(2)} € · Tes données restent sur ton appareil, aucun compte requis.
        </p>
      </main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Navigation mobile"
      >
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  tab === t.id ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <Dialog open={allergyGate !== null} onOpenChange={(v) => !v && setAllergyGate(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-accent" /> Tes allergies détectées
            </DialogTitle>
            <DialogDescription className="text-base">
              <span className="font-semibold text-foreground">{profile.allergies}</span>
              <br />
              On s'assure qu'aucun aliment allergène n'est inclus dans tes recettes ni dans ta liste de courses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" className="h-12 rounded-xl" onClick={() => setShowSetup(true)}>
              Modifier
            </Button>
            <Button
              className="gradient-cta h-12 rounded-xl font-semibold shadow-cta"
              onClick={() => {
                const target = allergyGate;
                setAllergyOk(true);
                setAllergyGate(null);
                if (target === "week") void autoGenerateWeek();
                if (target === "list") void generateGroceries();
              }}
            >
              Confirmer &amp; Générer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MealPicker
        open={picker.open}
        onOpenChange={(v) => setPicker((p) => ({ ...p, open: v }))}
        profile={profile}
        slotLabel={picker.slot ? SLOTS.find((s) => s.id === picker.slot)?.hint : undefined}
        complexity={picker.day !== undefined && isWeekend(picker.day) ? "gourmand" : "simple"}
        isFavorite={isFav}
        onToggleFavorite={toggleFav}
        onPick={(meal) => {
          setWeek((prev) => {
            if (picker.day !== undefined && picker.slot) {
              return { ...prev, [`${picker.day}-${picker.slot}`]: meal };
            }
            return prev;
          });
          setPicker({ open: false });
          toast.success(`${meal.name} planifié`);
        }}
      />

      <RecipeSheet
        mealName={recipeMeal}
        onOpenChange={(v) => !v && setRecipeMeal(null)}
        onAddToCart={(name) => {
          setRecipeMeal(null);
          void (async () => {
            setCartLoading(true);
            try {
              const res = await generateIngredients({
                data: {
                  meals: [name],
                  store: store?.name ?? "Carrefour",
                  budget: profile.budget,
                  people: profile.people,
                  allergies: profile.hasAllergies ? profile.allergies : "",
                },
              });
              setCart((prev) =>
                mergeItems(
                  prev,
                  res.ingredients.map((i) => ({
                    id: uid(),
                    name: i.name,
                    quantity: i.quantity,
                    aisle: i.aisle,
                    options: i.options,
                    selected: 0,
                    from: [name],
                  })),
                ),
              );
              toast.success("Ingrédients ajoutés à ta liste");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Génération impossible");
            } finally {
              setCartLoading(false);
            }
          })();
        }}
      />
    </div>
  );
}
