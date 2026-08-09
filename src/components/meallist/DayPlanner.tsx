import { ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS, SLOTS, type Meal, type SlotId, type Week } from "@/lib/meallist";
import { cn } from "@/lib/utils";

export function DayPlanner({
  week,
  day,
  onDayChange,
  fitness,
  generating,
  onGenerateWeek,
  onAdd,
  onOpenMeal,
  onRemove,
}: {
  week: Week;
  day: number;
  onDayChange: (d: number) => void;
  fitness: boolean;
  generating: boolean;
  onGenerateWeek: () => void;
  onAdd: (day: number, slot: SlotId) => void;
  onOpenMeal: (m: Meal) => void;
  onRemove: (key: string) => void;
}) {
  const filled = (d: number) => SLOTS.filter((s) => week[`${d}-${s.id}`]).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ta semaine</h2>
          <p className="mt-1 text-base text-muted-foreground">Navigue jour par jour et remplis tes 3 repas.</p>
        </div>
        <Button variant="outline" className="h-11" onClick={onGenerateWeek} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Générer ma semaine
        </Button>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            aria-label="Jour précédent"
            onClick={() => onDayChange((day + DAYS.length - 1) % DAYS.length)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-primary">Jour {day + 1} / 7</p>
            <h3 className="text-3xl font-semibold uppercase tracking-tight text-foreground sm:text-4xl">
              {DAYS[day]}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            aria-label="Jour suivant"
            onClick={() => onDayChange((day + 1) % DAYS.length)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div key={day} className="animate-in fade-in slide-in-from-right-4 mt-8 space-y-4 duration-300">
          {SLOTS.map((slot) => {
            const key = `${day}-${slot.id}`;
            const meal = week[key];
            return (
              <div key={slot.id} className="rounded-2xl border border-border bg-background p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">{slot.label}</p>
                  <p className="text-xs text-muted-foreground">{slot.hint}</p>
                </div>

                {meal ? (
                  <div className="mt-4 flex items-start gap-4">
                    <span className="text-3xl" aria-hidden>
                      {meal.emoji}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenMeal(meal)}
                      className="min-w-0 flex-1 text-left transition-opacity hover:opacity-80"
                    >
                      <span className="block text-lg font-semibold text-foreground">{meal.name}</span>
                      <span className="block text-sm text-muted-foreground">{meal.description}</span>
                      {fitness && meal.macros && (
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          {[
                            ["Cal", meal.macros.calories],
                            ["Prot", meal.macros.proteines],
                            ["Gluc", meal.macros.glucides],
                            ["Lip", meal.macros.lipides],
                          ].map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {k} {v}
                            </span>
                          ))}
                        </span>
                      )}
                      <span className="mt-2 block text-xs font-medium text-primary">Voir la recette →</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Retirer ${meal.name}`}
                      onClick={() => onRemove(key)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdd(day, slot.id)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                  >
                    <Plus className="h-4 w-4" /> Ajouter un repas
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {DAYS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => onDayChange(i)}
            aria-current={i === day ? "true" : undefined}
            className={cn(
              "min-w-28 shrink-0 rounded-2xl border p-4 text-left transition-all duration-300",
              i === day
                ? "border-primary bg-primary/10 shadow-card"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <span className={cn("block text-sm font-semibold", i === day ? "text-primary" : "text-foreground")}>
              {d}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{filled(i)}/3 repas</span>
            <span className="mt-2 flex gap-1">
              {SLOTS.map((s) => (
                <span
                  key={s.id}
                  className={cn("h-1.5 flex-1 rounded-full", week[`${i}-${s.id}`] ? "bg-primary" : "bg-muted")}
                />
              ))}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
