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

const FETCH_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Список всех мото-марок. */
export async function getMotorcycleMakes(): Promise<string[]> {
  const cached = readCache<string[]>("makes");
  if (cached && cached.length > 0) return cached;

  try {
    const res = await fetchWithTimeout(
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

async function fetchModelsRaw(url: string): Promise<string[]> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`NHTSA ${res.status}`);
  const json = (await res.json()) as { Results: { Model_Name: string }[] };
  return Array.from(
    new Set(
      json.Results.map((r) => r.Model_Name.trim()).filter(
        (n): n is string => !!n,
      ),
    ),
  ).sort((a, b) => a.localeCompare(b));
}

/** Модели для конкретной марки и года. Если по году пусто — пробуем без года. */
export async function getModelsForMakeYear(
  make: string,
  year: number,
): Promise<string[]> {
  const key = `models:${make.toLowerCase()}:${year}`;
  const cached = readCache<string[]>(key);
  if (cached && cached.length > 0) return cached;

  const safeMake = encodeURIComponent(make);
  try {
    let models = await fetchModelsRaw(
      `${BASE}/vehicles/GetModelsForMakeYear/make/${safeMake}/modelYear/${year}?format=json`,
    );
    // NHTSA часто не знает свежие/старые годы — фолбэк: все модели марки.
    if (models.length === 0) {
      const allKey = `models:${make.toLowerCase()}:all`;
      const cachedAll = readCache<string[]>(allKey);
      if (cachedAll && cachedAll.length > 0) {
        models = cachedAll;
      } else {
        models = await fetchModelsRaw(
          `${BASE}/vehicles/GetModelsForMake/${safeMake}?format=json`,
        );
        if (models.length > 0) writeCache(allKey, models);
      }
    }
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

// Фолбэк если API недоступен — расширенный список самых популярных мото-марок
// (мировые + те, что NHTSA не знает: советские/российские/китайские).
const FALLBACK_MAKES = [
  "Aprilia", "Bajaj", "Benelli", "Beta", "Bimota", "BMW",
  "Buell", "Can-Am", "CFMoto", "Ducati", "Energica", "Fantic",
  "GasGas", "Harley-Davidson", "Hero", "Honda", "Husaberg", "Husqvarna",
  "Hyosung", "Indian", "Jawa", "Kawasaki", "Keeway", "KTM",
  "Kymco", "Lifan", "Loncin", "Mash", "Moto Guzzi", "Moto Morini",
  "MV Agusta", "Norton", "Peugeot Motocycles", "Piaggio", "Polaris", "Qianjiang",
  "Regal Raptor", "Royal Enfield", "Sherco", "SWM", "Sym", "Suzuki",
  "Triumph", "TVS", "Ural", "Vespa", "Victory", "Voge",
  "Yamaha", "Zero Motorcycles", "ИЖ", "Минск", "Восход",
].sort((a, b) => a.localeCompare(b));
