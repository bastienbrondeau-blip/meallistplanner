import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChefHat, Clock, History, Home, Loader2, Plus, Settings2, ShoppingCart, Sparkles, UtensilsCrossed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  SLOTS,
  cartTotal,
  emptyProfile,
  load,
  mergeItems,
  save,
  storeById,
  uid,
  type CartItem,
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

type Tab = "accueil" | "cuisine" | "historique";

const TABS: { id: Tab; label: string; icon: typeof Home; disabled?: boolean }[] = [
  { id: "accueil", label: "Accueil", icon: Home },
  { id: "cuisine", label: "Cuisine", icon: ChefHat },
  { id: "historique", label: "Historique", icon: History, disabled: true },
];

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("accueil");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showSetup, setShowSetup] = useState(false);
  const [week, setWeek] = useState<Week>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [basket, setBasket] = useState<Meal[]>([]);
  const [day, setDay] = useState(0);
  const [picker, setPicker] = useState<{ open: boolean; day?: number; slot?: SlotId }>({ open: false });
  const [recipeMeal, setRecipeMeal] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugError, setSugError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  useEffect(() => {
    const p = load<Profile>(KEYS.profile, emptyProfile);
    setProfile(p);
    setWeek(load<Week>(KEYS.week, {}));
    setCart(load<CartItem[]>(KEYS.cart, []));
    setBasket(load<Meal[]>(KEYS.basket, []));
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

  const fitness = profile.mode === "fitness";
  const store = storeById(profile.store);
  const total = useMemo(() => cartTotal(cart), [cart]);
  const plannedMeals = useMemo(() => Object.values(week).filter((m): m is Meal => !!m), [week]);

  const fetchSuggestions = async () => {
    setSugLoading(true);
    setSugError(null);
    try {
      const res = await suggestMeals({
        data: { profile: { ...profile, store: store?.name ?? "Carrefour" }, count: 8 },
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

  const generateWeekFromBasket = () => {
    if (basket.length === 0) {
      toast.error("Ajoute au moins un repas avant de générer ta semaine.");
      return;
    }
    const next: Week = { ...week };
    let i = 0;
    outer: for (let d = 0; d < DAYS.length; d++) {
      for (const s of ["midi", "soir"] as SlotId[]) {
        const k = `${d}-${s}`;
        if (!next[k]) {
          const m = basket[i++];
          if (!m) break outer;
          next[k] = { ...m, id: uid() };
        }
      }
    }
    setWeek(next);
    setTab("cuisine");
    toast.success("Repas placés dans ta semaine");
  };

  const autoGenerateWeek = async () => {
    setGeneratingWeek(true);
    try {
      const res = await suggestMeals({
        data: { profile: { ...profile, store: store?.name ?? "Carrefour" }, count: 14 },
      });
      const next: Week = { ...week };
      let i = 0;
      for (let d = 0; d < DAYS.length; d++) {
        for (const s of ["midi", "soir"] as SlotId[]) {
          const k = `${d}-${s}`;
          const sug = res.suggestions[i++];
          if (!next[k] && sug) {
            next[k] = {
              id: uid(),
              name: sug.name,
              emoji: sug.emoji,
              description: sug.description,
              macros: sug.macros,
            };
          }
        }
      }
      setWeek(next);
      toast.success("Ta semaine est prête");
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
        data: { meals, store: store?.name ?? "Carrefour", budget: profile.budget },
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
      setCart((prev) => mergeItems(prev, incoming));
      toast.success(`✓ ${incoming.length} ingrédients générés`);
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
          setTab("accueil");
          toast.success("Profil enregistré");
        }}
        onCancel={profile.done ? () => setShowSetup(false) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
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
                disabled={t.disabled}
                onClick={() => !t.disabled && setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                  t.disabled && "cursor-not-allowed opacity-40",
                  tab === t.id && !t.disabled
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline">
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
                      className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <span className="text-3xl" aria-hidden>
                        {s.emoji}
                      </span>
                      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{s.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> {[s.time, s.price].filter(Boolean).join(" · ")}
                      </p>
                      {fitness && s.macros && <MacroBadges macros={s.macros} />}
                      <div className="mt-5 flex-1" />
                      <Button
                        className="h-11 w-full"
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
                        <Plus className="mr-1.5 h-4 w-4" /> Ajouter ce repas
                      </Button>
                    </article>
                  ))}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Ajoute un autre repas</h2>
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
                Repas sélectionnés <span className="text-muted-foreground">({basket.length})</span>
              </h2>
              {basket.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center text-base text-muted-foreground">
                  Aucun repas pour l'instant. Ajoute une suggestion ou ton propre plat.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {basket.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
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
              onClick={generateWeekFromBasket}
              className="h-16 w-full bg-gradient-to-r from-primary to-primary/80 text-lg font-semibold shadow-lg transition-all hover:brightness-95"
            >
              <UtensilsCrossed className="mr-2 h-5 w-5" /> Générer ma semaine
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
              onGenerateWeek={() => void autoGenerateWeek()}
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

            <Button
              onClick={() => void generateGroceries()}
              disabled={cartLoading}
              className="h-16 w-full bg-gradient-to-r from-primary to-primary/80 text-lg font-semibold shadow-lg transition-all hover:brightness-95"
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
                  Ingrédients consolidés, choix de qualité par produit, total en direct.
                </p>
              </div>
              <GroceryList
                items={cart}
                store={profile.store}
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

        {tab === "historique" && (
          <p className="text-base text-muted-foreground">Bientôt disponible.</p>
        )}

        <p className="mt-14 text-center text-sm text-muted-foreground">
          Total estimé : {total.toFixed(2)} € · Tes données restent sur ton appareil, aucun compte requis.
        </p>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Navigation mobile"
      >
        <div className="grid grid-cols-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                disabled={t.disabled}
                onClick={() => !t.disabled && setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  t.disabled && "opacity-40",
                  tab === t.id && !t.disabled ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      <MealPicker
        open={picker.open}
        onOpenChange={(v) => setPicker((p) => ({ ...p, open: v }))}
        profile={profile}
        slotLabel={picker.slot ? SLOTS.find((s) => s.id === picker.slot)?.label : undefined}
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
                data: { meals: [name], store: store?.name ?? "Carrefour", budget: profile.budget },
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
