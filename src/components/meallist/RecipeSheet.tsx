import { useEffect, useState } from "react";
import { ExternalLink, Clock, Users, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecipeDetail, type RecipeDetail } from "@/lib/recipe-detail.functions";

export function RecipeSheet({
  mealName,
  onOpenChange,
  onAddToCart,
}: {
  mealName: string | null;
  onOpenChange: (v: boolean) => void;
  onAddToCart?: (name: string) => void;
}) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mealName) return;
    let cancelled = false;
    setLoading(true);
    setRecipe(null);
    setError(null);
    getRecipeDetail({ data: { meal: mealName } })
      .then((r) => !cancelled && setRecipe(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mealName]);

  return (
    <Sheet open={!!mealName} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl">{recipe?.title ?? mealName ?? ""}</SheetTitle>
          <SheetDescription className="text-base">
            {recipe?.source ? `Recette de référence · ${recipe.source}` : "Recette de référence"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-8 px-4 pb-10">
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2 rounded-lg" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {recipe && (
            <>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                  <Clock className="h-4 w-4" /> {recipe.time}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
                  <Users className="h-4 w-4" /> {recipe.servings}
                </span>
              </div>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-foreground">Ingrédients</h3>
                <ul className="space-y-2">
                  {recipe.ingredients.map((i) => (
                    <li key={i} className="flex gap-2 text-base text-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {i}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-foreground">Étapes</h3>
                <ol className="space-y-4">
                  {recipe.steps.map((s, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {i + 1}
                      </span>
                      <p className="text-base leading-relaxed text-foreground">{s}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="mb-3 text-lg font-semibold text-foreground">Nutrition (par portion)</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Calories", recipe.nutrition.calories],
                    ["Protéines", recipe.nutrition.proteines],
                    ["Glucides", recipe.nutrition.glucides],
                    ["Lipides", recipe.nutrition.lipides],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className="text-base font-semibold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-3">
                {onAddToCart && mealName && (
                  <Button className="flex-1" onClick={() => onAddToCart(mealName)}>
                    <ShoppingCart className="mr-2 h-4 w-4" /> Ajouter au panier
                  </Button>
                )}
                {recipe.sourceUrl && (
                  <Button variant="outline" asChild className="flex-1">
                    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                      Voir la source <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
