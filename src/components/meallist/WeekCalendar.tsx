import { Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS, SLOTS, type Meal, type SlotId, type Week } from "@/lib/meallist";
import { cn } from "@/lib/utils";

export function WeekCalendar({
  week,
  onAdd,
  onOpenMeal,
  onRemove,
  onGenerateWeek,
  generating,
  onMove,
}: {
  week: Week;
  onAdd: (day: number, slot: SlotId) => void;
  onOpenMeal: (meal: Meal) => void;
  onRemove: (key: string) => void;
  onGenerateWeek: () => void;
  generating: boolean;
  onMove: (fromKey: string, toKey: string) => void;
}) {
  const count = Object.values(week).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ta semaine</h2>
          <p className="mt-2 text-base text-muted-foreground">
            {count > 0 ? `${count} repas planifié${count > 1 ? "s" : ""}` : "Planifie tes repas jour par jour."}
          </p>
        </div>
        <Button className="h-12 text-base" onClick={onGenerateWeek} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Générer ma semaine
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <p className="px-1 pb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
            <div className="space-y-2">
              {SLOTS.map((slot) => {
                const key = `${dayIdx}-${slot.id}`;
                const meal = week[key];
                return (
                  <div
                    key={slot.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = e.dataTransfer.getData("text/plain");
                      if (from && from !== key) onMove(from, key);
                    }}
                  >
                    <p className="px-1 pb-1 text-xs text-muted-foreground">{slot.label}</p>
                    {meal ? (
                      <div
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", key)}
                        className="group relative w-full rounded-xl border border-border bg-background p-3 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenMeal(meal)}
                          className="flex w-full items-start gap-2 text-left"
                        >
                          <span className="text-xl" aria-hidden>
                            {meal.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{meal.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{meal.description}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Retirer ${meal.name}`}
                          onClick={() => onRemove(key)}
                          className="absolute right-1.5 top-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAdd(dayIdx, slot.id)}
                        className={cn(
                          "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-all duration-300",
                          "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                        )}
                      >
                        <Plus className="h-4 w-4" /> Ajouter
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Astuce : glisse-dépose un repas d'un créneau à l'autre pour réorganiser ta semaine.
      </p>
    </div>
  );
}
