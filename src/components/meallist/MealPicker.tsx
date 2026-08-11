import { useEffect, useState } from "react";
import { Plus, RefreshCw, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { suggestMeals, type MealSuggestion } from "@/lib/suggest-meals.functions";
import { storeById, uid, type Meal, type Profile } from "@/lib/meallist";

export function MacroBadges({ macros }: { macros: NonNullable<Meal["macros"]> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {[
        ["Cal", macros.calories],
        ["Prot", macros.proteines],
        ["Gluc", macros.glucides],
        ["Lip", macros.lipides],
      ].map(([k, v]) => (
        <span key={k} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {k} {v}
        </span>
      ))}
    </div>
  );
}

export function MealPicker({
  open,
  onOpenChange,
  profile,
  slotLabel,
  complexity,
  onPick,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile;
  slotLabel?: string;
  complexity?: "simple" | "gourmand";
  onPick: (meal: Meal) => void;
  onAddToCart?: (meal: Meal) => void;
  isFavorite?: (name: string) => boolean;
  onToggleFavorite?: (meal: Meal) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [custom, setCustom] = useState("");
  const fitness = profile.mode === "fitness";

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await suggestMeals({
        data: {
          profile: { ...profile, store: storeById(profile.store)?.name ?? "Carrefour" },
          slot: slotLabel ?? "",
          complexity: complexity ?? "",
          people: profile.people,
          count: 8,
        },
      });
      setSuggestions(res.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger les suggestions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slotLabel, complexity]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl">Ajouter un repas{slotLabel ? ` · ${slotLabel}` : ""}</SheetTitle>
          <SheetDescription className="text-base">
            Suggestions personnalisées selon ton profil{fitness ? " et tes objectifs" : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <div className="flex gap-2">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onPick({ id: uid(), name: custom.trim(), emoji: "🍽️", description: "Ajouté manuellement" });
                  setCustom("");
                }
              }}
              placeholder="ex: pâtes carbonara, poulet rôti…"
              className="h-12 text-base"
            />
            <Button
              className="h-12"
              disabled={!custom.trim()}
              onClick={() => {
                onPick({ id: uid(), name: custom.trim(), emoji: "🍽️", description: "Ajouté manuellement" });
                setCustom("");
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Suggestions IA</p>
            <Button variant="ghost" size="sm" onClick={() => void fetchSuggestions()} disabled={loading}>
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              <span className="ml-1.5">Rafraîchir</span>
            </Button>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {loading &&
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}

          {!loading &&
            suggestions.map((s) => (
              <div
                key={s.name}
                className="rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-card"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden>
                    {s.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[s.time, s.price].filter(Boolean).join(" · ")}
                    </p>
                    {fitness && s.macros && <MacroBadges macros={s.macros} />}
                  </div>
                  {onToggleFavorite && (
                    <button
                      type="button"
                      aria-label={`Favori ${s.name}`}
                      onClick={() =>
                        onToggleFavorite({
                          id: uid(),
                          name: s.name,
                          emoji: s.emoji,
                          description: s.description,
                          macros: s.macros,
                        })
                      }
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-accent"
                    >
                      <Star className={isFavorite?.(s.name) ? "h-4 w-4 fill-accent text-accent" : "h-4 w-4"} />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      onPick({
                        id: uid(),
                        name: s.name,
                        emoji: s.emoji,
                        description: s.description,
                        macros: s.macros,
                      })
                    }
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Planifier
                  </Button>
                  {onAddToCart && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1"
                      onClick={() =>
                        onAddToCart({
                          id: uid(),
                          name: s.name,
                          emoji: s.emoji,
                          description: s.description,
                          macros: s.macros,
                        })
                      }
                    >
                      <ShoppingCart className="mr-1.5 h-4 w-4" /> Ingrédients
                    </Button>
                  )}
                </div>
              </div>
            ))}

          {!loading && suggestions.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
