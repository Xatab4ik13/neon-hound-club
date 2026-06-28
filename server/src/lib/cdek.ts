/**
 * Клиент СДЭК API v2.
 *
 * Использование:
 *   import { cdek } from "./lib/cdek.js";
 *   const cities = await cdek.searchCities("крас");
 *   const pvz = await cdek.getPickupPoints(435);
 *   const { totalSum, periodMin, periodMax } = await cdek.calculate({...});
 *
 * Все вызовы идут через серверный OAuth-токен (client_credentials), кеш в памяти 50 минут.
 * Если CDEK_CLIENT_ID/SECRET пустые — все методы кидают понятную ошибку.
 *
 * Док: https://api-docs.cdek.ru/
 */

const CDEK_BASE_URL = process.env.CDEK_BASE_URL ?? "https://api.cdek.ru/v2";

type TokenCache = { token: string; expiresAt: number } | null;
let tokenCache: TokenCache = null;

function ensureCreds() {
  // CDEK_ACCOUNT / CDEK_SECURE_PASSWORD — официальная терминология договора;
  // CDEK_CLIENT_ID / CDEK_CLIENT_SECRET — старые имена, оставлены ради совместимости.
  const id = process.env.CDEK_ACCOUNT || process.env.CDEK_CLIENT_ID;
  const secret = process.env.CDEK_SECURE_PASSWORD || process.env.CDEK_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("[cdek] CDEK_ACCOUNT/CDEK_SECURE_PASSWORD are not configured");
  }
  return { id, secret };
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const { id, secret } = ensureCreds();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
  });
  const res = await fetch(`${CDEK_BASE_URL}/oauth/token?parameters`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[cdek] oauth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60_000, (data.expires_in - 60) * 1000),
  };
  return data.access_token;
}

async function cdekFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${CDEK_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    // токен протух — сбросим и попробуем ещё раз
    tokenCache = null;
    const t2 = await getToken();
    const res2 = await fetch(`${CDEK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${t2}`,
        ...(init.headers ?? {}),
      },
    });
    if (!res2.ok) throw new Error(`[cdek] ${path} → ${res2.status} ${await res2.text()}`);
    return res2.json() as Promise<T>;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[cdek] ${path} → ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Города (для автокомплита) ----------

export type CdekCity = {
  code: number;
  city: string;
  region: string;
  country_code: string;
  postal_codes?: string[];
};

const citiesCache = new Map<string, { at: number; data: CdekCity[] }>();

async function searchCities(query: string, limit = 10): Promise<CdekCity[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const cached = citiesCache.get(q);
  if (cached && Date.now() - cached.at < 10 * 60_000) return cached.data;
  const params = new URLSearchParams({ country_codes: "RU", size: String(limit), city: query });
  const data = await cdekFetch<CdekCity[]>(`/location/cities?${params.toString()}`);
  citiesCache.set(q, { at: Date.now(), data });
  return data;
}

// ---------- ПВЗ ----------

export type CdekPvz = {
  code: string;
  name: string;
  address_comment?: string;
  type: "PVZ" | "POSTAMAT";
  owner_code: string;
  location: {
    city_code: number;
    city: string;
    address: string;
    address_full: string;
    longitude: number;
    latitude: number;
  };
  work_time: string;
  is_handout: boolean;
  is_reception: boolean;
};

const pvzCache = new Map<number, { at: number; data: CdekPvz[] }>();

async function getPickupPoints(cityCode: number): Promise<CdekPvz[]> {
  const cached = pvzCache.get(cityCode);
  if (cached && Date.now() - cached.at < 30 * 60_000) return cached.data;
  const params = new URLSearchParams({
    city_code: String(cityCode),
    type: "PVZ",
    country_code: "RU",
    is_handout: "true",
  });
  const data = await cdekFetch<CdekPvz[]>(`/deliverypoints?${params.toString()}`);
  pvzCache.set(cityCode, { at: Date.now(), data });
  return data;
}

// ---------- Калькулятор ----------

/**
 * Тарифы:
 *   136 — Посылка склад-склад (отправляем со склада → ПВЗ получателя). Самый дешёвый.
 *   137 — Посылка склад-дверь (со склада → курьер до двери).
 */
export const CDEK_TARIFFS = { pvz: 136, courier: 137 } as const;
export type CdekDeliveryMode = keyof typeof CDEK_TARIFFS;

export type CdekPackageInput = {
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type CdekCalcInput = {
  toCityCode: number;
  mode: CdekDeliveryMode;
  /** Аггрегированная посылка по всей корзине. Минимум 1 шт. */
  packages: CdekPackageInput[];
};

export type CdekCalcResult = {
  tariffCode: number;
  totalSum: number; // рубли
  periodMin: number; // дней
  periodMax: number;
  currency: string;
};

async function calculate(input: CdekCalcInput): Promise<CdekCalcResult> {
  const fromCity = Number(process.env.CDEK_FROM_CITY_CODE ?? 435); // Краснодар по умолчанию
  const tariffCode = CDEK_TARIFFS[input.mode];
  const body = {
    tariff_code: tariffCode,
    from_location: { code: fromCity },
    to_location: { code: input.toCityCode },
    packages: input.packages.map((p, i) => ({
      number: String(i + 1),
      weight: Math.max(1, Math.round(p.weightG)),
      length: Math.max(1, Math.round(p.lengthCm)),
      width: Math.max(1, Math.round(p.widthCm)),
      height: Math.max(1, Math.round(p.heightCm)),
    })),
  };
  type Resp = {
    total_sum: number;
    currency: string;
    period_min: number;
    period_max: number;
    errors?: Array<{ code: string; message: string }>;
  };
  const data = await cdekFetch<Resp>("/calculator/tariff", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (data.errors?.length) {
    throw new Error(`[cdek] calc errors: ${data.errors.map((e) => e.message).join("; ")}`);
  }
  return {
    tariffCode,
    totalSum: Math.ceil(data.total_sum),
    periodMin: data.period_min,
    periodMax: data.period_max,
    currency: data.currency ?? "RUB",
  };
}

export const cdek = {
  searchCities,
  getPickupPoints,
  calculate,
};
