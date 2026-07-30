import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChefHat, Home, Loader2, ShoppingCart, User, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Onboarding } from "@/components/meallist/Onboarding";
import { MealPicker } from "@/components/meallist/MealPicker";
import { RecipeSheet } from "@/components/meallist/RecipeSheet";
import { WeekCalendar } from "@/components/meallist/WeekCalendar";
import { GroceryList } from "@/components/meallist/GroceryList";
import { generateIngredients } from "@/lib/generate-ingredients.functions";
import { suggestMeals } from "@/lib/suggest-meals.functions";
import {
  DAYS,
  KEYS,
  SLOTS,
  STORES,
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
      { title: "MealList — Planifie ta semaine, remplis ton panier" },
      {
        name: "description",
        content:
          "MealList planifie tes repas de la semaine, génère ta liste de courses consolidée et l'envoie dans ton magasin en un clic.",
      },
      { property: "og:title", content: "MealList — Planifie ta semaine, remplis ton panier" },
      {
        property: "og:description",
        content:
          "Calendrier hebdomadaire, recettes sourcées et liste de courses triée par rayon pour ton magasin préféré.",
      },
    ],
  }),
  component: App,
});

type Tab = "accueil" | "cuisine" | "courses" | "profil";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "accueil", label: "Accueil", icon: Home },
  { id: "cuisine", label: "Cuisine", icon: ChefHat },
  { id: "courses", label: "Courses", icon: ShoppingCart },
  { id: "profil", label: "Profil", icon: User },
];

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("accueil");
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [week, setWeek] = useState<Week>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [picker, setPicker] = useState<{ open: boolean; day?: number; slot?: SlotId }>({ open: false });
  const [recipeMeal, setRecipeMeal] = useState<string | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);

  useEffect(() => {
    const p = load<Profile>(KEYS.profile, emptyProfile);
    setProfile(p);
    setWeek(load<Week>(KEYS.week, {}));
    setCart(load<CartItem[]>(KEYS.cart, []));
    setShowOnboarding(!p.done);
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

  const total = useMemo(() => cartTotal(cart), [cart]);
  const store = storeById(profile.store);
  const plannedMeals = useMemo(
    () => Object.values(week).filter((m): m is Meal => !!m),
    [week],
  );

  const addIngredientsFor = async (meals: string[]) => {
    if (meals.length === 0) return;
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
      toast.success(`✓ ${incoming.length} ingrédients ajoutés au panier`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Génération impossible");
    } finally {
      setCartLoading(false);
    }
  };

  const placeMeal = (meal: Meal) => {
    setWeek((prev) => {
      if (picker.day !== undefined && picker.slot) {
        return { ...prev, [`${picker.day}-${picker.slot}`]: meal };
      }
      for (let d = 0; d < DAYS.length; d++) {
        for (const s of SLOTS) {
          const k = `${d}-${s.id}`;
          if (!prev[k]) return { ...prev, [k]: meal };
        }
      }
      return prev;
    });
    setPicker({ open: false });
    toast.success(`${meal.name} planifié`);
  };

  const generateWeek = async () => {
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
            next[k] = { id: uid(), name: sug.name, emoji: sug.emoji, description: sug.description };
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

  const validateWeek = async () => {
    if (plannedMeals.length === 0) {
      toast.error("Planifie au moins un repas avant de valider.");
      return;
    }
    setTab("courses");
    await addIngredientsFor(plannedMeals.map((m) => m.name));
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <Onboarding
        initial={profile}
        onDone={(p) => {
          setProfile(p);
          setShowOnboarding(false);
          setTab("cuisine");
          toast.success("Profil enregistré");
        }}
        onCancel={profile.done ? () => setShowOnboarding(false) : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
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
                  "rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tab === t.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setTab("courses")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          >
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span>{cart.length}</span>
            <span className="hidden text-muted-foreground sm:inline">· {total.toFixed(2)} €</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 pb-28 sm:px-8 sm:py-12 md:pb-12">
        {tab === "accueil" && (
          <div className="space-y-10">
            <section className="rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
              <p className="text-sm font-medium text-primary">
                Magasin : {store?.name ?? "non défini"}
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Planifie ta semaine, on remplit ton panier.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
                Des repas adaptés à ton profil, des recettes sourcées, et une liste de courses consolidée et triée
                par rayon pour {store?.name ?? "ton magasin"}.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="h-12 text-base" onClick={() => setTab("cuisine")}>
                  <ChefHat className="mr-2 h-4 w-4" /> Ouvrir mon calendrier
                </Button>
                <Button variant="outline" className="h-12 text-base" onClick={() => setPicker({ open: true })}>
                  Trouver un repas
                </Button>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              {[
                ["Repas planifiés", `${plannedMeals.length}`, "sur 21 créneaux"],
                ["Produits au panier", `${cart.length}`, store?.name ?? "—"],
                ["Total estimé", `${total.toFixed(2)} €`, profile.budget],
              ].map(([label, value, hint]) => (
                <div key={label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === "cuisine" && (
          <div className="space-y-8">
            <WeekCalendar
              week={week}
              generating={generatingWeek}
              onGenerateWeek={() => void generateWeek()}
              onAdd={(day, slot) => setPicker({ open: true, day, slot })}
              onOpenMeal={(m) => setRecipeMeal(m.name)}
              onRemove={(key) =>
                setWeek((prev) => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                })
              }
              onMove={(fromKey, toKey) =>
                setWeek((prev) => {
                  const next = { ...prev };
                  const moved = next[fromKey];
                  next[fromKey] = next[toKey];
                  next[toKey] = moved;
                  if (!next[fromKey]) delete next[fromKey];
                  return next;
                })
              }
            />

            <div className="sticky bottom-20 z-20 md:bottom-4">
              <Button
                className="h-14 w-full text-base shadow-lg"
                onClick={() => void validateWeek()}
                disabled={cartLoading}
              >
                {cartLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="mr-2 h-4 w-4" />
                )}
                Valider mon panier complet ({plannedMeals.length} repas)
              </Button>
            </div>
          </div>
        )}

        {tab === "courses" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ta liste de courses</h2>
              <p className="mt-2 text-base text-muted-foreground">
                Ingrédients consolidés, triés par rayon de {store?.name ?? "ton magasin"}.
              </p>
            </div>
            <GroceryList
              items={cart}
              store={profile.store}
              loading={cartLoading}
              onSelectOption={(id, idx) =>
                setCart((prev) => prev.map((i) => (i.id === id ? { ...i, selected: idx } : i)))
              }
              onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
              onClear={() => {
                setCart([]);
                toast.success("Panier vidé");
              }}
            />
          </div>
        )}

        {tab === "profil" && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ton profil</h2>
              <p className="mt-2 text-base text-muted-foreground">
                Ces réglages pilotent les suggestions et les prix affichés.
              </p>
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {[
                ["Régimes", profile.diets.length ? profile.diets.join(", ") : "Aucune restriction"],
                ["Allergies", profile.allergies || "Aucune"],
                ["Temps max", profile.timeMax],
                ["Fréquence", profile.frequency],
                ["Budget", profile.budget],
                ["Cuisines", profile.cuisines.length ? profile.cuisines.join(", ") : "Toutes"],
                ["À éviter", profile.dislikes.length ? profile.dislikes.join(", ") : "Rien"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-6 px-5 py-4">
                  <span className="text-sm font-medium text-muted-foreground">{k}</span>
                  <span className="text-right text-base text-foreground">{v}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Magasin principal</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {STORES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setProfile((p) => ({ ...p, store: s.id as StoreId }));
                      toast.success(`Magasin : ${s.name}`);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300",
                      profile.store === s.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span className="text-2xl" aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="font-medium text-foreground">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" className="h-12" onClick={() => setShowOnboarding(true)}>
              Refaire l'onboarding
            </Button>
          </div>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Tes données restent sur ton appareil. Aucun compte, aucune inscription.
        </p>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
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

      <MealPicker
        open={picker.open}
        onOpenChange={(v) => setPicker((p) => ({ ...p, open: v }))}
        profile={profile}
        slotLabel={picker.slot ? SLOTS.find((s) => s.id === picker.slot)?.label : undefined}
        onPick={placeMeal}
        onAddToCart={(meal) => {
          setPicker({ open: false });
          setTab("courses");
          void addIngredientsFor([meal.name]);
        }}
      />

      <RecipeSheet
        mealName={recipeMeal}
        onOpenChange={(v) => !v && setRecipeMeal(null)}
        onAddToCart={(name) => {
          setRecipeMeal(null);
          setTab("courses");
          void addIngredientsFor([name]);
        }}
      />
    </div>
  );
}
