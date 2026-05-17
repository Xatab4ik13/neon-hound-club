// Хранение байков в localStorage. Без БД, без авторизации.

const STORAGE_KEY = "hellhound:bikes";

export type StoredBike = {
  id: string;
  brand: string;
  model: string;
  year: number;
  custom?: boolean; // марка/модель введены вручную, не из NHTSA
  color?: string;
  nickname?: string;
  mileage?: string;
  purchaseDate?: string; // ISO yyyy-mm-dd
  mods?: string[];
  photo?: string; // base64 dataURL или http(s) URL
};

const SEED: StoredBike[] = [
  {
    id: "b1",
    brand: "Yamaha",
    model: "MT-09",
    year: 2022,
    color: "Cyan Metallic",
    nickname: "Гончая",
    mileage: "18 400 км",
    purchaseDate: "2023-04-12",
    mods: ["Akrapovič", "Power Commander", "Pazzo levers"],
    photo:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1000&q=80",
  },
];

export function loadBikes(): StoredBike[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as StoredBike[];
  } catch {
    return SEED;
  }
}

export function saveBikes(bikes: StoredBike[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bikes));
  } catch (err) {
    console.warn("Не удалось сохранить байки в localStorage", err);
  }
}

export function newBikeId(): string {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
