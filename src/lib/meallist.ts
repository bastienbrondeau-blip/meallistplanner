export type StoreId = "carrefour" | "lidl" | "intermarche" | "auchan" | "amazonfresh";

export const STORES: {
  id: StoreId;
  name: string;
  emoji: string;
  tint: string;
  search: (q: string) => string;
}[] = [
  {
    id: "carrefour",
    name: "Carrefour",
    emoji: "🛒",
    tint: "bg-[oklch(0.95_0.03_250)]",
    search: (q) => `https://www.carrefour.fr/s?q=${encodeURIComponent(q)}`,
  },
  {
    id: "lidl",
    name: "Lidl",
    emoji: "🏷️",
    tint: "bg-[oklch(0.95_0.04_95)]",
    search: (q) => `https://www.lidl.fr/q/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "intermarche",
    name: "Intermarché",
    emoji: "🧺",
    tint: "bg-[oklch(0.95_0.04_30)]",
    search: (q) => `https://www.intermarche.com/recherche?q=${encodeURIComponent(q)}`,
  },
  {
    id: "auchan",
    name: "Auchan",
    emoji: "🥬",
    tint: "bg-[oklch(0.95_0.05_150)]",
    search: (q) => `https://www.auchan.fr/recherche?text=${encodeURIComponent(q)}`,
  },
  {
    id: "amazonfresh",
    name: "Amazon Fresh",
    emoji: "📦",
    tint: "bg-[oklch(0.95_0.04_70)]",
    search: (q) => `https://www.amazon.fr/s?i=amazonfresh&k=${encodeURIComponent(q)}`,
  },
];

export const storeById = (id: StoreId | null) => STORES.find((s) => s.id === id) ?? null;

export type Profile = {
  diets: string[];
  allergies: string;
  timeMax: string;
  frequency: string;
  budget: string;
  cuisines: string[];
  dislikes: string[];
  store: StoreId | null;
  done: boolean;
};

export const emptyProfile: Profile = {
  diets: [],
  allergies: "",
  timeMax: "30 min",
  frequency: "3-4x par semaine",
  budget: "10-15 € par repas",
  cuisines: [],
  dislikes: [],
  store: null,
  done: false,
};

export type Meal = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
export const SLOTS = [
  { id: "matin", label: "Matin" },
  { id: "midi", label: "Midi" },
  { id: "soir", label: "Soir" },
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
  profile: "ml.profile.v2",
  week: "ml.week.v2",
  cart: "ml.cart.v2",
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
