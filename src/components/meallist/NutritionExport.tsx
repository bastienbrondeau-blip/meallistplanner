import { Activity, Copy, Download, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Meal } from "@/lib/meallist";

const num = (v?: string) => {
  if (!v) return 0;
  const m = v.replace(",", ".").match(/[\d.]+/);
  return m ? Number(m[0]) : 0;
};

export function NutritionExport({ meals }: { meals: Meal[] }) {
  const withMacros = meals.filter((m) => m.macros);
  if (meals.length === 0) return null;

  const totals = withMacros.reduce(
    (acc, m) => ({
      calories: acc.calories + num(m.macros?.calories),
      proteines: acc.proteines + num(m.macros?.proteines),
      glucides: acc.glucides + num(m.macros?.glucides),
      lipides: acc.lipides + num(m.macros?.lipides),
    }),
    { calories: 0, proteines: 0, glucides: 0, lipides: 0 },
  );
  const perDay = (v: number) => Math.round(v / 7);

  const rows = [
    ["Repas", "Calories", "Proteines (g)", "Glucides (g)", "Lipides (g)"],
    ...meals.map((m) => [
      m.name,
      String(num(m.macros?.calories) || ""),
      String(num(m.macros?.proteines) || ""),
      String(num(m.macros?.glucides) || ""),
      String(num(m.macros?.lipides) || ""),
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meallist-semaine.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        meals
          .map((m) =>
            m.macros
              ? `${m.name} — ${m.macros.calories} kcal · P ${m.macros.proteines} · G ${m.macros.glucides} · L ${m.macros.lipides}`
              : m.name,
          )
          .join("\n"),
      );
      toast.success("Semaine copiée, prête à coller dans ton tracker");
    } catch {
      toast.error("Copie impossible sur ce navigateur");
    }
  };

  const stats = [
    { label: "Calories / jour", value: perDay(totals.calories) ? `${perDay(totals.calories)} kcal` : "—" },
    { label: "Protéines / jour", value: perDay(totals.proteines) ? `${perDay(totals.proteines)} g` : "—" },
    { label: "Glucides / jour", value: perDay(totals.glucides) ? `${perDay(totals.glucides)} g` : "—" },
    { label: "Lipides / jour", value: perDay(totals.lipides) ? `${perDay(totals.lipides)} g` : "—" },
  ];

  return (
    <section className="rounded-3xl border border-border bg-card p-7 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Exporter vers ton tracker</h2>
          <p className="text-sm text-muted-foreground">
            Bilan nutritionnel de la semaine, prêt pour MyFitnessPal, Yazio ou Cronometer.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{st.label}</p>
            <p className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">{st.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Flame className="h-4 w-4 text-primary" /> {meals.length} repas planifiés · {withMacros.length} avec macros
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button className="h-12 rounded-xl" onClick={download}>
          <Download className="mr-2 h-4 w-4" /> Télécharger le CSV
        </Button>
        <Button variant="outline" className="h-12 rounded-xl" onClick={() => void copy()}>
          <Copy className="mr-2 h-4 w-4" /> Copier le résumé
        </Button>
      </div>
    </section>
  );
}
