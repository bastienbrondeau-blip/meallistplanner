import { Check, Copy, ExternalLink, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  aisleRank,
  cartTotal,
  storeById,
  type CartItem,
  type StoreId,
} from "@/lib/meallist";
import { cn } from "@/lib/utils";

export function GroceryList({
  items,
  store,
  loading,
  onSelectOption,
  onRemove,
  onClear,
}: {
  items: CartItem[];
  store: StoreId | null;
  loading: boolean;
  onSelectOption: (id: string, idx: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const s = storeById(store);
  const total = cartTotal(items);
  const aisles = Array.from(new Set(items.map((i) => i.aisle))).sort((a, b) => aisleRank(a) - aisleRank(b));
  const minutes = Math.max(10, Math.round(items.length * 1.5));

  const copyList = async () => {
    const text = items
      .map((i) => `- ${i.name} (${i.quantity}) — ${i.options[i.selected]?.label ?? ""}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Liste copiée dans le presse-papier");
  };

  const openAll = () => {
    if (!s) return;
    items.forEach((it, idx) => {
      setTimeout(() => {
        window.open(s.search(it.options[it.selected]?.label || it.name), "_blank", "noopener,noreferrer");
      }, idx * 350);
    });
    toast.success(`${items.length} produits envoyés vers ${s.name}`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-52 rounded-lg" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold text-foreground">Ton panier est vide</h3>
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
          Planifie des repas dans l'onglet Cuisine puis valide ton panier complet : les ingrédients arrivent ici,
          consolidés et triés par rayon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {items.length} produits · {s?.name ?? "magasin non défini"} · ~{minutes} min de courses
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{total.toFixed(2)} €</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void copyList()}>
            <Copy className="mr-2 h-4 w-4" /> Copier
          </Button>
          <Button variant="ghost" onClick={onClear}>
            <Trash2 className="mr-2 h-4 w-4" /> Vider
          </Button>
          <Button onClick={openAll} disabled={!s} className="min-w-48">
            <ShoppingBag className="mr-2 h-4 w-4" /> Tout ajouter chez {s?.name ?? "…"}
          </Button>
        </div>
      </div>

      {aisles.map((aisle) => (
        <section key={aisle} className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{aisle}</h3>
          <div className="space-y-3">
            {items
              .filter((i) => i.aisle === aisle)
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity}
                        {item.from.length > 0 && ` · pour ${item.from.join(", ")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Retirer ${item.name}`}
                      onClick={() => onRemove(item.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {item.options.map((opt, idx) => {
                      const active = item.selected === idx;
                      return (
                        <button
                          key={opt.label + idx}
                          type="button"
                          onClick={() => onSelectOption(item.id, idx)}
                          aria-pressed={active}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border bg-background hover:border-primary/40",
                          )}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {opt.tier}
                            </span>
                            {active && <Check className="h-4 w-4 text-primary" />}
                          </span>
                          <span className="mt-1 block text-sm text-foreground">{opt.label}</span>
                          <span className="mt-1 block text-base font-semibold text-foreground">
                            {opt.price.toFixed(2)} €
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {s && (
                    <a
                      href={s.search(item.options[item.selected]?.label || item.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      Ouvrir chez {s.name} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 z-20">
        <Button onClick={openAll} disabled={!s} className="h-14 w-full text-base shadow-lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Valider mon panier complet · {total.toFixed(2)} €
        </Button>
      </div>
    </div>
  );
}
