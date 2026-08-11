import { useState } from "react";
import { ChevronLeft, ChevronRight, Dumbbell, Sparkles, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BUDGETS,
  CUISINES,
  DIETS_CLASSIC,
  DIETS_FITNESS,
  GOALS,
  SESSIONS,
  SEXES,
  TIMES,
  TRAININGS,
  profileSummary,
  type Mode,
  type Profile,
} from "@/lib/meallist";
import { cn } from "@/lib/utils";

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
        "rounded-2xl border px-4 py-4 text-left text-base transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/[0.07] font-semibold text-primary shadow-soft"
          : "border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft",
      )}
    >
      {children}
    </button>
  );
}

export function Setup({
  initial,
  onDone,
  onCancel,
}: {
  initial: Profile;
  onDone: (p: Profile) => void;
  onCancel?: () => void;
}) {
  const [p, setP] = useState<Profile>(initial);
  const [step, setStep] = useState(initial.mode ? 1 : 0);

  const pickMode = (mode: Mode) => {
    setP((prev) => ({ ...prev, mode }));
    setStep(1);
  };

  const toggleCuisine = (c: string) =>
    setP((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(c) ? prev.cuisines.filter((x) => x !== c) : [...prev.cuisines, c],
    }));

  const fitness = p.mode === "fitness";

  type Question = { title: string; hint: string; body: React.ReactNode; valid?: boolean };

  const allergyQuestion: Question = {
    title: "Allergies ou intolérances ?",
    hint: "Les ingrédients concernés seront exclus de tes recettes et de ta liste de courses.",
    valid: !p.hasAllergies || p.allergies.trim().length > 0,
    body: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
          <Chip active={!p.hasAllergies} onClick={() => setP({ ...p, hasAllergies: false, allergies: "" })}>
            Non
          </Chip>
          <Chip active={p.hasAllergies} onClick={() => setP({ ...p, hasAllergies: true })}>
            Oui
          </Chip>
        </div>
        {p.hasAllergies && (
          <div className="space-y-2">
            <Textarea
              value={p.allergies}
              onChange={(e) => setP({ ...p, allergies: e.target.value })}
              placeholder="ex: arachides, lactose, fruits de mer, gluten…"
              className="min-h-28 rounded-2xl text-base"
            />
            {!p.allergies.trim() && <p className="text-sm text-destructive">Précise tes allergies pour continuer.</p>}
          </div>
        )}
      </div>
    ),
  };

  const budgetQuestion: Question = {
    title: "Budget moyen par semaine ?",
    hint: "Détermine le niveau des produits proposés dans ta liste de courses.",
    body: (
      <div className="grid gap-3 sm:grid-cols-3">
        {BUDGETS.map((b) => (
          <Chip key={b} active={p.budget === b} onClick={() => setP({ ...p, budget: b })}>
            {b}
          </Chip>
        ))}
      </div>
    ),
  };

  const timeQuestion: Question = {
    title: "Temps de préparation max par repas ?",
    hint: "On écarte les recettes trop longues pour ton quotidien.",
    body: (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TIMES.map((t) => (
          <Chip key={t} active={p.timeMax === t} onClick={() => setP({ ...p, timeMax: t })}>
            {t}
          </Chip>
        ))}
      </div>
    ),
  };

  const questions: Question[] = fitness
    ? [
        {
          title: "Quel est ton objectif ?",
          hint: "On calibre les calories et les protéines de chaque repas sur cet objectif.",
          body: (
            <div className="grid gap-3 sm:grid-cols-2">
              {GOALS.map((g) => (
                <Chip key={g} active={p.goal === g} onClick={() => setP({ ...p, goal: g })}>
                  {g}
                </Chip>
              ))}
            </div>
          ),
        },
        {
          title: "Objectif chiffré ?",
          hint: "Facultatif, mais ça aide à doser les portions et le rythme.",
          body: (
            <Input
              value={p.goalTarget}
              onChange={(e) => setP({ ...p, goalTarget: e.target.value })}
              placeholder="ex: Gagner 5kg en 3 mois"
              className="h-13 rounded-2xl text-base"
            />
          ),
        },
        {
          title: "Poids actuel (kg) ?",
          hint: "Utilisé uniquement pour estimer tes besoins. Rien ne quitte ton appareil.",
          body: (
            <Input
              type="number"
              inputMode="numeric"
              value={p.weight}
              onChange={(e) => setP({ ...p, weight: e.target.value })}
              placeholder="ex: 72"
              className="h-13 rounded-2xl text-base"
            />
          ),
        },
        {
          title: "Taille (cm) ?",
          hint: "Combinée à ton poids pour estimer ton métabolisme de base.",
          body: (
            <Input
              type="number"
              inputMode="numeric"
              value={p.height}
              onChange={(e) => setP({ ...p, height: e.target.value })}
              placeholder="ex: 178"
              className="h-13 rounded-2xl text-base"
            />
          ),
        },
        {
          title: "Sexe ?",
          hint: "Les besoins caloriques moyens diffèrent légèrement.",
          body: (
            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              {SEXES.map((x) => (
                <Chip key={x} active={p.sex === x} onClick={() => setP({ ...p, sex: x })}>
                  {x}
                </Chip>
              ))}
            </div>
          ),
        },
        {
          title: "Séances d'entraînement par semaine ?",
          hint: "Plus tu t'entraînes, plus les portions proposées seront généreuses.",
          body: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SESSIONS.map((x) => (
                <Chip key={x} active={p.sessions === x} onClick={() => setP({ ...p, sessions: x })}>
                  {x}
                </Chip>
              ))}
            </div>
          ),
        },
        {
          title: "Type d'entraînement ?",
          hint: "Force = plus de protéines, cardio = plus de glucides.",
          body: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TRAININGS.map((x) => (
                <Chip key={x} active={p.training === x} onClick={() => setP({ ...p, training: x })}>
                  {x}
                </Chip>
              ))}
            </div>
          ),
        },
        allergyQuestion,
        {
          title: "Régime alimentaire ?",
          hint: "Toutes les suggestions respecteront ce choix, sans exception.",
          body: (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DIETS_FITNESS.map((d) => (
                <Chip key={d} active={p.diet === d} onClick={() => setP({ ...p, diet: d })}>
                  {d}
                </Chip>
              ))}
            </div>
          ),
        },
        budgetQuestion,
        timeQuestion,
      ]
    : [
        {
          title: "Régime alimentaire ?",
          hint: "Toutes les suggestions respecteront ce choix, sans exception.",
          body: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DIETS_CLASSIC.map((d) => (
                <Chip key={d} active={p.diet === d} onClick={() => setP({ ...p, diet: d })}>
                  {d}
                </Chip>
              ))}
            </div>
          ),
        },
        allergyQuestion,
        budgetQuestion,
        timeQuestion,
        {
          title: "Cuisines préférées ?",
          hint: "Choix multiple. Laisse vide pour recevoir de tout.",
          body: (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CUISINES.map((c) => (
                <Chip key={c} active={p.cuisines.includes(c)} onClick={() => toggleCuisine(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          ),
        },
      ];

  const totalQ = questions.length;
  const lastStep = totalQ + 1; // écran de résumé
  const qIndex = step - 1;
  const current = questions[qIndex];
  const canContinue = current ? current.valid !== false : true;

  if (step === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-5 py-12 sm:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Bienvenue sur MealList
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-foreground sm:text-5xl">
            Comment veux-tu utiliser MealList&nbsp;?
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Ce choix personnalise tes suggestions. Tu pourras le changer plus tard.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              {
                mode: "fitness" as Mode,
                icon: Dumbbell,
                title: "Mode Fitness",
                desc: "Optimisé pour tes objectifs (prise de masse, sèche, etc.) avec macros affichées.",
              },
              {
                mode: "classic" as Mode,
                icon: UtensilsCrossed,
                title: "Mode Cuisine Classique",
                desc: "Pour simplement bien manger, sans compter les calories.",
              },
            ].map((c) => (
              <button
                key={c.mode}
                type="button"
                onClick={() => pickMode(c.mode)}
                className="group flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-8 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <c.icon className="h-7 w-7" />
                </span>
                <span className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</span>
                <span className="text-base text-muted-foreground">{c.desc}</span>
                <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  Choisir <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </button>
            ))}
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="mt-8 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-muted">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {current ? `Question ${qIndex + 1}/${totalQ}` : "Résumé"} ·{" "}
              {fitness ? "Mode Fitness" : "Cuisine classique"}
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
          <div className="flex gap-1.5">
            {Array.from({ length: totalQ + 1 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i <= qIndex || !current ? "bg-primary" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>

        <div key={step} className="animate-in slide-in-from-right-4 fade-in flex-1 duration-300">
          {current ? (
            <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">{current.title}</h2>
              <p className="mt-2.5 text-base text-muted-foreground">{current.hint}</p>
              <div className="mt-8">{current.body}</div>
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-7 shadow-card sm:p-9">
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Récapitulatif de tes réponses</h2>
              <p className="mt-2.5 text-base text-muted-foreground">
                Vérifie tes réponses avant de confirmer. Tu pourras les modifier depuis l'en-tête.
              </p>
              <div className="mt-7 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                {profileSummary(p).map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-6 px-5 py-4">
                    <span className="text-sm font-medium text-muted-foreground">{k}</span>
                    <span className="text-right text-base text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between gap-4">
          <Button variant="ghost" className="h-12 rounded-xl" onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {current ? "Retour" : "Modifier"}
          </Button>
          {step < lastStep ? (
            <Button
              className="h-12 min-w-44 rounded-xl text-base shadow-cta transition-all hover:brightness-110"
              disabled={!canContinue}
              onClick={() => setStep((s) => s + 1)}
            >
              Continuer <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="gradient-cta h-12 min-w-44 rounded-xl text-base shadow-cta transition-all hover:brightness-110"
              onClick={() => onDone({ ...p, done: true })}
            >
              Confirmer <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
