// NHTSA vPIC API — бесплатно, без ключа, CORS открыт.
// Кешируем результаты в localStorage чтобы не дёргать API на каждый рендер.

const BASE = "https://vpic.nhtsa.dot.gov/api";
const CACHE_PREFIX = "hellhound:nhtsa:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

type CacheEntry<T> = { data: T; expires: number };

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() > entry.expires) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, expires: Date.now() + CACHE_TTL_MS };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // если квота переполнена — игнорим, просто не кешируем
  }
}

/** Список всех мото-марок. */
export async function getMotorcycleMakes(): Promise<string[]> {
  const cached = readCache<string[]>("makes");
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE}/vehicles/GetMakesForVehicleType/motorcycle?format=json`,
    );
    if (!res.ok) throw new Error(`NHTSA ${res.status}`);
    const json = (await res.json()) as {
      Results: { MakeName: string }[];
    };
    const makes = Array.from(
      new Set(
        json.Results.map((r) => r.MakeName.trim()).filter(
          (n): n is string => !!n,
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));
    writeCache("makes", makes);
    return makes;
  } catch (err) {
    console.warn("NHTSA getMotorcycleMakes failed", err);
    return FALLBACK_MAKES;
  }
}

/** Модели для конкретной марки и года. */
export async function getModelsForMakeYear(
  make: string,
  year: number,
): Promise<string[]> {
  const key = `models:${make.toLowerCase()}:${year}`;
  const cached = readCache<string[]>(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE}/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelYear/${year}?format=json`,
    );
    if (!res.ok) throw new Error(`NHTSA ${res.status}`);
    const json = (await res.json()) as {
      Results: { Model_Name: string }[];
    };
    const models = Array.from(
      new Set(
        json.Results.map((r) => r.Model_Name.trim()).filter(
          (n): n is string => !!n,
        ),
      ),
    ).sort((a, b) => a.localeCompare(b));
    writeCache(key, models);
    return models;
  } catch (err) {
    console.warn("NHTSA getModelsForMakeYear failed", err);
    return [];
  }
}

/** Список годов от текущего до 1980. */
export function getYears(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now + 1; y >= 1980; y--) years.push(y);
  return years;
}

// Фолбэк если API недоступен — самые популярные мото-марки.
const FALLBACK_MAKES = [
  "Aprilia",
  "BMW",
  "Ducati",
  "Harley-Davidson",
  "Honda",
  "Husqvarna",
  "Indian",
  "Kawasaki",
  "KTM",
  "Moto Guzzi",
  "MV Agusta",
  "Royal Enfield",
  "Suzuki",
  "Triumph",
  "Yamaha",
];
