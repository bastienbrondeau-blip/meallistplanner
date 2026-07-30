import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STORES, type Profile, type StoreId } from "@/lib/meallist";
import { cn } from "@/lib/utils";

const DIETS = [
  "Pas de restriction",
  "Végétarien",
  "Végan",
  "Sans gluten",
  "Sans lactose",
  "Keto",
  "Méditerranéen",
  "Halal",
];
const TIMES = ["15 min", "30 min", "45 min", "Aucune limite"];
const FREQ = ["Tous les jours", "3-4x par semaine", "Week-end seulement"];
const BUDGETS = ["5-10 € par repas", "10-15 € par repas", "15 € et + par repas"];
const CUISINES = ["Italienne", "Asiatique", "Française", "Méditerranéenne", "Mexicaine", "Fusion", "Indienne"];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border px-4 py-3 text-left text-base transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function Onboarding({
  initial,
  onDone,
  onCancel,
}: {
  initial: Profile;
  onDone: (p: Profile) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(initial);
  const [dislikeInput, setDislikeInput] = useState("");
  const total = 5;

  const toggle = (key: "diets" | "cuisines", v: string) =>
    setP((prev) => ({
      ...prev,
      [key]: prev[key].includes(v) ? prev[key].filter((x) => x !== v) : [...prev[key], v],
    }));

  const canNext = step === 3 ? p.store !== null : true;

  const screens = [
    {
      title: "Ton profil diététique",
      subtitle: "Pour ne jamais te proposer un plat que tu ne peux pas manger.",
      body: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {DIETS.map((d) => (
              <Chip key={d} active={p.diets.includes(d)} onClick={() => toggle("diets", d)}>
                {d}
              </Chip>
            ))}
          </div>
          <div className="space-y-2">
            <label htmlFor="allergies" className="text-sm font-medium text-foreground">
              Allergies ou intolérances
            </label>
            <Input
              id="allergies"
              value={p.allergies}
              onChange={(e) => setP({ ...p, allergies: e.target.value })}
              placeholder="ex: arachides, fruits de mer…"
              className="h-12 text-base"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Ton temps en cuisine",
      subtitle: "On adapte les recettes à ton rythme.",
      body: (
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Temps de préparation max</p>
            <div className="grid grid-cols-2 gap-3">
              {TIMES.map((t) => (
                <Chip key={t} active={p.timeMax === t} onClick={() => setP({ ...p, timeMax: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Fréquence de cuisson</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {FREQ.map((f) => (
                <Chip key={f} active={p.frequency === f} onClick={() => setP({ ...p, frequency: f })}>
                  {f}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Budget & goûts",
      subtitle: "Des suggestions qui collent à ton portefeuille et à tes envies.",
      body: (
        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Budget moyen par repas</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {BUDGETS.map((b) => (
                <Chip key={b} active={p.budget === b} onClick={() => setP({ ...p, budget: b })}>
                  {b}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Cuisines préférées</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CUISINES.map((c) => (
                <Chip key={c} active={p.cuisines.includes(c)} onClick={() => toggle("cuisines", c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="dislikes" className="text-sm font-medium text-foreground">
              Aliments que tu n'aimes pas <span className="text-muted-foreground">(5 max)</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="dislikes"
                value={dislikeInput}
                onChange={(e) => setDislikeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dislikeInput.trim() && p.dislikes.length < 5) {
                    e.preventDefault();
                    setP({ ...p, dislikes: [...p.dislikes, dislikeInput.trim()] });
                    setDislikeInput("");
                  }
                }}
                placeholder="ex: coriandre"
                className="h-12 text-base"
                disabled={p.dislikes.length >= 5}
              />
              <Button
                type="button"
                variant="secondary"
                className="h-12"
                disabled={!dislikeInput.trim() || p.dislikes.length >= 5}
                onClick={() => {
                  setP({ ...p, dislikes: [...p.dislikes, dislikeInput.trim()] });
                  setDislikeInput("");
                }}
              >
                Ajouter
              </Button>
            </div>
            {p.dislikes.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {p.dislikes.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm text-foreground"
                  >
                    {d}
                    <button
                      type="button"
                      aria-label={`Retirer ${d}`}
                      onClick={() => setP({ ...p, dislikes: p.dislikes.filter((x) => x !== d) })}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Ton magasin principal",
      subtitle: "On ne te proposera que des produits réellement disponibles là-bas.",
      body: (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {STORES.map((s) => {
              const active = p.store === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setP({ ...p, store: s.id as StoreId })}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
                  )}
                >
                  <span className="text-3xl" aria-hidden>
                    {s.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-semibold text-foreground">{s.name}</span>
                    <span className="block text-sm text-muted-foreground">Prix et rayons adaptés</span>
                  </span>
                  {active && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
          {!p.store && (
            <p className="flex items-center gap-2 text-sm text-destructive">
              Choisis un magasin pour continuer.
            </p>
          )}
        </div>
      ),
    },
    {
      title: "Tout est prêt",
      subtitle: "Voici ton profil. Tu pourras le modifier à tout moment dans l'onglet Profil.",
      body: (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {[
            ["Régimes", p.diets.length ? p.diets.join(", ") : "Aucune restriction"],
            ["Allergies", p.allergies || "Aucune"],
            ["Temps max", p.timeMax],
            ["Fréquence", p.frequency],
            ["Budget", p.budget],
            ["Cuisines", p.cuisines.length ? p.cuisines.join(", ") : "Toutes"],
            ["À éviter", p.dislikes.length ? p.dislikes.join(", ") : "Rien"],
            ["Magasin", STORES.find((s) => s.id === p.store)?.name ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-6 px-5 py-4">
              <span className="text-sm font-medium text-muted-foreground">{k}</span>
              <span className="text-right text-base text-foreground">{v}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const current = screens[step];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Étape {step + 1} sur {total}
            </span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Fermer
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <div key={step} className="animate-in slide-in-from-right-6 fade-in flex-1 duration-300">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{current.title}</h2>
          <p className="mt-3 text-base text-muted-foreground">{current.subtitle}</p>
          <div className="mt-8">{current.body}</div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            className="h-12"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Retour
          </Button>
          {step < total - 1 ? (
            <Button className="h-12 min-w-40 text-base" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Continuer <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button className="h-12 min-w-40 text-base" onClick={() => onDone({ ...p, done: true })}>
              Commencer <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
