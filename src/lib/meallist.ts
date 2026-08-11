export type StoreId = "carrefour" | "leclerc" | "amazonfresh" | "intermarche";

export const STORES: {
  id: StoreId;
  name: string;
  emoji: string;
  search: (q: string) => string;
}[] = [
  {
    id: "carrefour",
    name: "Carrefour",
    emoji: "🛒",
    search: (q) => `https://www.carrefour.fr/s?q=${encodeURIComponent(q)}`,
  },
  {
    id: "leclerc",
    name: "Leclerc",
    emoji: "🧺",
    search: (q) => `https://www.e.leclerc/recherche?q=${encodeURIComponent(q)}`,
  },
  {
    id: "amazonfresh",
    name: "Amazon Fresh",
    emoji: "📦",
    search: (q) => `https://www.amazon.fr/s?i=amazonfresh&k=${encodeURIComponent(q)}`,
  },
  {
    id: "intermarche",
    name: "Intermarché",
    emoji: "🏷️",
    search: (q) => `https://www.intermarche.com/recherche?q=${encodeURIComponent(q)}`,
  },
];

export const storeById = (id: StoreId | null) => STORES.find((s) => s.id === id) ?? null;

export type Mode = "fitness" | "classic";

export type Profile = {
  mode: Mode | null;
  goal: string;
  goalTarget: string;
  weight: string;
  height: string;
  sex: string;
  sessions: string;
  training: string;
  activity: string;
  diet: string;
  hasAllergies: boolean;
  allergies: string;
  budget: string;
  timeMax: string;
  cuisines: string[];
  people: number;
  store: StoreId;
  done: boolean;
};

export const emptyProfile: Profile = {
  mode: null,
  goal: "Maintenir",
  goalTarget: "",
  weight: "",
  height: "",
  sex: "Homme",
  sessions: "2-3",
  training: "Mixte",
  activity: "Modéré",
  diet: "Omnivore",
  hasAllergies: false,
  allergies: "",
  budget: "Moyen (50-100 €)",
  timeMax: "30 min",
  cuisines: [],
  people: 2,
  store: "carrefour",
  done: false,
};

export const GOALS = ["Perte de poids", "Prise de masse", "Sèche", "Maintenir"];
export const SEXES = ["Homme", "Femme", "Autre"];
export const SESSIONS = ["0-1", "2-3", "4-5", "6+"];
export const TRAININGS = ["Force", "Cardio", "HIIT", "Mixte"];
export const ACTIVITIES = ["Sédentaire", "Modéré", "Actif", "Très actif"];
export const DIETS_FITNESS = ["Omnivore", "Végétarien", "Végan"];
export const DIETS_CLASSIC = ["Omnivore", "Végétarien", "Végan", "Sans gluten"];
export const BUDGETS = ["Cheap (< 50 €)", "Moyen (50-100 €)", "Premium (> 100 €)"];
export const TIMES = ["5 min", "15 min", "30 min", "1h+", "Pas d'importance"];
export const CUISINES = ["Italienne", "Asiatique", "Française", "Méditerranéenne", "Mexicaine", "Mixte"];
export const PEOPLE_PRESETS = [1, 2, 4, 6];


export type Macros = {
  calories: string;
  proteines: string;
  glucides: string;
  lipides: string;
};

export type Meal = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  macros?: Macros;
};

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const SLOTS = [
  { id: "matin", label: "Matin", hint: "Petit-déjeuner" },
  { id: "midi", label: "Midi", hint: "Déjeuner" },
  { id: "soir", label: "Soir", hint: "Dîner" },
] as const;
export type SlotId = (typeof SLOTS)[number]["id"];

export type Week = Record<string, Meal | undefined>; // key: `${dayIndex}-${slotId}`

export type CartOption = { label: string; price: number; tier: string };
export type CartItem = {
  id: string;
  name: string;
  quantity: string;
  aisle: string;
  options: CartOption[];
  selected: number;
  from: string[];
};

export const AISLE_ORDER = [
  "Fruits & légumes",
  "Boucherie",
  "Poissonnerie",
  "Crèmerie",
  "Boulangerie",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Autre",
];

export const aisleRank = (a: string) => {
  const i = AISLE_ORDER.indexOf(a);
  return i === -1 ? AISLE_ORDER.length : i;
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const KEYS = {
  profile: "ml.profile.v3",
  week: "ml.week.v3",
  cart: "ml.cart.v3",
  basket: "ml.basket.v3",
};

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, it) => sum + (it.options[it.selected]?.price ?? 0), 0);
}

export function mergeItems(existing: CartItem[], incoming: CartItem[]) {
  const out = existing.map((i) => ({ ...i }));
  for (const inc of incoming) {
    const match = out.find((o) => o.name.toLowerCase().trim() === inc.name.toLowerCase().trim());
    if (match) {
      match.quantity = match.quantity === inc.quantity ? match.quantity : `${match.quantity} + ${inc.quantity}`;
      match.from = Array.from(new Set([...match.from, ...inc.from]));
    } else {
      out.push({ ...inc });
    }
  }
  return out;
}

export function profileSummary(p: Profile) {
  const rows: [string, string][] = [
    ["Mode", p.mode === "fitness" ? "Fitness" : "Cuisine classique"],
    ["Régime", p.diet],
    ["Allergies", p.hasAllergies ? p.allergies || "Oui" : "Aucune"],
    ["Budget", p.budget],
    ["Temps de prep", p.timeMax],
  ];
  if (p.mode === "fitness") {
    rows.splice(1, 0, ["Objectif", p.goal], ["Poids", p.weight ? `${p.weight} kg` : "—"], ["Taille", p.height ? `${p.height} cm` : "—"], ["Activité", p.activity]);
  } else {
    rows.push(["Cuisines", p.cuisines.length ? p.cuisines.join(", ") : "Toutes"]);
  }
  return rows;
}
