import { useEffect, useState } from "react";
import { Check, Copy, ListChecks, LayoutGrid, Printer, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AISLE_ORDER,
  KEYS,
  STORES,
  aisleRank,
  cartTotal,
  load,
  save,
  storeById,
  type CartItem,
  type StoreId,
} from "@/lib/meallist";
import { cn } from "@/lib/utils";

type View = "simple" | "detail";

export function GroceryList({
  items,
  store,
  people,
  loading,
  onSelectOption,
  onRemove,
  onClear,
  onStoreChange,
}: {
  items: CartItem[];
  store: StoreId;
  people: number;
  loading: boolean;
  onSelectOption: (id: string, idx: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onStoreChange: (id: StoreId) => void;
}) {
  const [view, setView] = useState<View>("simple");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [clicked, setClicked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setClicked(load<Record<string, boolean>>(KEYS.clicked, {}));
  }, []);

  const markClicked = (name: string) => {
    setClicked((prev) => {
      const next = { ...prev, [name.toLowerCase()]: true };
      save(KEYS.clicked, next);
      return next;
    });
  };

  const s = storeById(store) ?? STORES[0];
  const total = cartTotal(items);
  const aisles = Array.from(new Set(items.map((i) => i.aisle))).sort((a, b) => aisleRank(a) - aisleRank(b));
  const doneCount = items.filter((i) => checked[i.id]).length;
  const inBasket = items.filter((i) => clicked[i.name.toLowerCase()]).length;

  const listText = (plain: boolean) =>
    [...items]
      .sort((a, b) => aisleRank(a.aisle) - aisleRank(b.aisle))
      .map((i) =>
        plain ? `- ${i.name} — ${i.quantity}` : `- ${i.name} (${i.quantity}) — ${i.options[i.selected]?.label ?? ""}`,
      )
      .join("\n");

  const copyList = async (detailed: boolean) => {
    try {
      await navigator.clipboard.writeText(listText(!detailed));
      toast.success("Liste copiée — colle-la dans ton panier en ligne");
    } catch {
      toast.error("Copie impossible sur ce navigateur");
    }
  };

  const openStore = (id: StoreId) => {
    const target = storeById(id) ?? STORES[0];
    onStoreChange(id);
    items.slice(0, 8).forEach((it, idx) => {
      markClicked(it.name);
      setTimeout(() => {
        window.open(target.search(it.options[it.selected]?.label || it.name), "_blank", "noopener,noreferrer");
      }, idx * 350);
    });
    toast.success(`Produits envoyés vers ${target.name}`);
  };

  const addOne = (item: CartItem) => {
    markClicked(item.name);
    window.open(s.search(item.options[item.selected]?.label || item.name), "_blank", "noopener,noreferrer");
    toast.success(`${item.name} envoyé vers ${s.name}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52 rounded-xl" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-3xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-soft">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h3 className="mt-4 text-xl font-semibold text-foreground">Aucun ingrédient pour l'instant</h3>
        <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
          Remplis ta semaine dans l'onglet Cuisine puis clique sur « Générer ma liste de courses ».
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {items.length} produits · Pour {people} personne{people > 1 ? "s" : ""} · triés par rayon
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            💰 {total.toFixed(2)} €<span className="ml-2 text-sm font-normal text-muted-foreground">estimé</span>
          </p>
          <p className="mt-1 text-sm font-medium text-primary">
            ✅ {inBasket}/{items.length} articles envoyés au panier {s.name}
          </p>
        </div>
        <div className="no-print inline-flex rounded-2xl border border-border bg-muted p-1">
          {(
            [
              { id: "simple" as View, label: "Mode Simple", icon: ListChecks },
              { id: "detail" as View, label: "Mode Détaillé", icon: LayoutGrid },
            ]
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                view === v.id
                  ? "bg-background text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <v.icon className="h-4 w-4" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "simple" ? (
        <div className="space-y-5">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {doneCount}/{items.length} coché{doneCount > 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => void copyList(false)}>
                <Copy className="mr-2 h-4 w-4" /> Copier la liste
              </Button>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Imprimer
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
            {aisles.map((aisle) => (
              <div key={aisle}>
                <p className="border-b border-border bg-muted px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {AISLE_ORDER.includes(aisle) ? aisle : "Autre"}
                </p>
                {items
                  .filter((i) => i.aisle === aisle)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setChecked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      aria-pressed={!!checked[item.id]}
                      className="flex w-full items-center gap-4 border-b border-border px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-secondary"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200",
                          checked[item.id] ? "border-primary bg-primary text-primary-foreground" : "border-border",
                        )}
                      >
                        {checked[item.id] && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-base text-foreground transition-all",
                          checked[item.id] && "text-muted-foreground line-through",
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.quantity}</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {aisles.map((aisle) => (
            <section key={aisle} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {AISLE_ORDER.includes(aisle) ? aisle : "Autre"}
              </h3>
              <div className="space-y-4">
                {items
                  .filter((i) => i.aisle === aisle)
                  .map((item) => (
                    <div key={item.id} className="rounded-3xl border border-border bg-card p-6 shadow-card">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.quantity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {clicked[item.name.toLowerCase()] && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                              Dans le panier
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label={`Retirer ${item.name}`}
                            onClick={() => onRemove(item.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                        {item.options.map((opt, idx) => {
                          const active = item.selected === idx;
                          return (
                            <button
                              key={opt.label + idx}
                              type="button"
                              onClick={() => onSelectOption(item.id, idx)}
                              aria-pressed={active}
                              className={cn(
                                "rounded-2xl border p-3.5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                active
                                  ? "border-primary bg-primary/[0.07] shadow-soft"
                                  : "border-border bg-background hover:border-primary/40 hover:bg-secondary",
                              )}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                  {opt.tier}
                                </span>
                                {active && <Check className="h-4 w-4 text-primary" />}
                              </span>
                              <span className="mt-1.5 block text-sm text-foreground">{opt.label}</span>
                              <span className="mt-1 block text-base font-semibold text-foreground">
                                {opt.price.toFixed(2)} €
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <Button
                        onClick={() => addOne(item)}
                        className="mx-auto mt-5 flex h-14 w-full items-center justify-center rounded-2xl text-base font-semibold shadow-cta transition-all duration-300 hover:brightness-110 active:scale-[0.99] sm:max-w-md"
                      >
                        <ShoppingCart className="mr-2 h-5 w-5" /> Ajouter au panier
                      </Button>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </>
      )}

      <div className="no-print space-y-4 rounded-3xl border border-border bg-card p-6 shadow-card">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Où veux-tu faire tes courses&nbsp;?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ta liste reste sauvegardée : tu peux revenir et continuer où tu t'es arrêté.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STORES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => openStore(st.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card",
                st.id === s.id ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-background hover:border-primary/40",
              )}
            >
              <span className="text-2xl" aria-hidden>
                {st.emoji}
              </span>
              <span className="text-sm font-semibold text-foreground">Ouvrir {st.name}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => void copyList(view === "detail")}>
            <Copy className="mr-2 h-4 w-4" /> Copier la liste
          </Button>
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
          <Button variant="ghost" className="h-12 rounded-xl" onClick={onClear}>
            <Trash2 className="mr-2 h-4 w-4" /> Vider la liste
          </Button>
        </div>
      </div>

      <div className="no-print sticky bottom-20 z-20 md:bottom-4">
        <Button
          onClick={() => openStore(s.id)}
          className="gradient-cta h-16 w-full rounded-2xl text-base font-semibold shadow-cta transition-all duration-300 hover:brightness-110 active:scale-[0.995]"
        >
          <ShoppingCart className="mr-2 h-5 w-5" /> Tout envoyer vers {s.name} · {total.toFixed(2)} €
        </Button>
      </div>
    </div>
  );
}
