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

async function resolveCity(opts: { fiasGuid?: string; postalCode?: string }): Promise<CdekCity[]> {
  const params = new URLSearchParams({ country_codes: "RU", size: "5" });
  if (opts.fiasGuid) params.set("fias_guid", opts.fiasGuid);
  if (opts.postalCode) params.set("postal_code", opts.postalCode);
  const cacheKey = `resolve:${opts.fiasGuid ?? ""}:${opts.postalCode ?? ""}`;
  const cached = citiesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 60 * 60_000) return cached.data;
  const data = await cdekFetch<CdekCity[]>(`/location/cities?${params.toString()}`);
  citiesCache.set(cacheKey, { at: Date.now(), data });
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

// ---------- Накладные (заказы СДЭК) ----------

export type CdekOrderInput = {
  /** Тариф (136 склад-ПВЗ, 137 склад-дверь и т.п.). */
  tariffCode: number;
  /** Внешний номер — наш orderId, чтобы СДЭК знал, к чему привязка. */
  externalNumber: string;
  recipient: {
    name: string;
    phone: string; // в международном формате, начиная с '+'
  };
  /** Если указан pvz code — to_location не нужен, передаём delivery_point. */
  toPvzCode?: string;
  /** Иначе курьер — нужен городский код и улица. */
  toLocation?: {
    cityCode: number;
    address: string;
  };
  items: Array<{
    name: string;
    wareKey: string; // артикул, передадим productId
    cost: number; // объявленная стоимость за шт., рубли
    weight: number; // граммы за шт.
    amount: number; // количество
  }>;
  packages: Array<{
    number: string;
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  }>;
  comment?: string;
};

export type CdekCreateOrderResult = {
  uuid: string;
};

async function createCdekOrder(input: CdekOrderInput): Promise<CdekCreateOrderResult> {
  const fromCity = Number(process.env.CDEK_FROM_CITY_CODE ?? 435);
  const senderName = process.env.CDEK_SENDER_NAME || "HELLHOUND Racing";
  const senderPhone = process.env.CDEK_SENDER_PHONE || "+79000000000";
  const shipmentPoint = process.env.CDEK_SHIPMENT_POINT || undefined;

  // Один пакет на позицию заказа. Внутри пакета — соответствующий item с amount=qty.
  // Каждый пакет ДОЛЖЕН иметь items, иначе СДЭК отвечает packages[i].items is empty.
  if (input.packages.length !== input.items.length) {
    throw new Error(
      `[cdek] createOrder: packages count (${input.packages.length}) must equal items count (${input.items.length})`,
    );
  }
  const body: Record<string, unknown> = {
    type: 1, // 1 — интернет-магазин
    tariff_code: input.tariffCode,
    number: input.externalNumber,
    comment: input.comment ?? `Order ${input.externalNumber.slice(0, 8)}`,
    sender: { name: senderName, phones: [{ number: senderPhone }] },
    recipient: { name: input.recipient.name, phones: [{ number: input.recipient.phone }] },
    from_location: { code: fromCity },
    packages: input.packages.map((p, i) => {
      const it = input.items[i]!;
      return {
        number: p.number,
        weight: Math.max(1, Math.round(p.weightG)),
        length: Math.max(1, Math.round(p.lengthCm)),
        width: Math.max(1, Math.round(p.widthCm)),
        height: Math.max(1, Math.round(p.heightCm)),
        items: [
          {
            name: it.name.slice(0, 255),
            ware_key: it.wareKey.slice(0, 50),
            cost: it.cost,
            weight: Math.max(1, it.weight),
            amount: it.amount,
            payment: { value: 0 },
          },
        ],
      };
    }),
  };

  if (input.toPvzCode) {
    body.delivery_point = input.toPvzCode;
  } else if (input.toLocation) {
    body.to_location = { code: input.toLocation.cityCode, address: input.toLocation.address };
  } else {
    throw new Error("[cdek] createOrder: need toPvzCode or toLocation");
  }
  if (shipmentPoint) body.shipment_point = shipmentPoint;

  type Resp = {
    entity?: { uuid: string };
    requests?: Array<{ state: string; errors?: Array<{ code: string; message: string }> }>;
  };
  const data = await cdekFetch<Resp>("/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const errs = data.requests?.flatMap((r) => r.errors ?? []) ?? [];
  if (errs.length) {
    throw new Error(`[cdek] createOrder: ${errs.map((e) => `${e.code} ${e.message}`).join("; ")}`);
  }
  if (!data.entity?.uuid) {
    throw new Error(`[cdek] createOrder: no uuid in response: ${JSON.stringify(data)}`);
  }
  return { uuid: data.entity.uuid };
}

export type CdekOrderInfo = {
  uuid: string;
  cdekNumber: string | null;
  statusCode: string | null;
  statusName: string | null;
};

async function getCdekOrder(uuid: string): Promise<CdekOrderInfo> {
  type Resp = {
    entity?: {
      uuid: string;
      cdek_number?: string;
      statuses?: Array<{ code: string; name: string; date_time: string }>;
    };
  };
  const data = await cdekFetch<Resp>(`/orders/${uuid}`);
  const last = data.entity?.statuses?.[data.entity.statuses.length - 1];
  return {
    uuid,
    cdekNumber: data.entity?.cdek_number ?? null,
    statusCode: last?.code ?? null,
    statusName: last?.name ?? null,
  };
}

// ---------- Печать квитанции (PDF накладной) ----------

/**
 * Запрашивает у СДЭК PDF-квитанцию по uuid накладной.
 * Двухшаговый процесс: POST /print/orders → uuid задания, GET /print/orders/{uuid} → опрос статуса и url PDF.
 * Возвращает бинарь PDF.
 */
async function printCdekOrder(orderUuid: string, opts?: { copyCount?: number }): Promise<Buffer> {
  type CreateResp = {
    entity?: { uuid: string };
    requests?: Array<{ state: string; errors?: Array<{ code: string; message: string }> }>;
  };
  const created = await cdekFetch<CreateResp>("/print/orders", {
    method: "POST",
    body: JSON.stringify({
      orders: [{ order_uuid: orderUuid }],
      copy_count: Math.max(1, Math.min(10, opts?.copyCount ?? 2)),
    }),
  });
  const errs = created.requests?.flatMap((r) => r.errors ?? []) ?? [];
  if (errs.length) throw new Error(`[cdek] print create: ${errs.map((e) => `${e.code} ${e.message}`).join("; ")}`);
  const printUuid = created.entity?.uuid;
  if (!printUuid) throw new Error("[cdek] print create: no uuid");

  type StatusResp = {
    entity?: { uuid: string; url?: string; statuses?: Array<{ code: string; name: string }> };
  };
  let url: string | null = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    const info = await cdekFetch<StatusResp>(`/print/orders/${printUuid}`);
    const last = info.entity?.statuses?.[info.entity.statuses.length - 1];
    if (info.entity?.url && (last?.code === "READY" || last?.code === "ACCEPTED" || !last)) {
      url = info.entity.url;
      break;
    }
    if (last?.code === "INVALID" || last?.code === "REMOVED") {
      throw new Error(`[cdek] print status: ${last.code} ${last.name}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!url) throw new Error("[cdek] print: timeout waiting for PDF");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`[cdek] print download: ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export const cdek = {
  searchCities,
  getPickupPoints,
  calculate,
  createOrder: createCdekOrder,
  getOrder: getCdekOrder,
  printOrder: printCdekOrder,
};
