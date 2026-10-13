/**
 * Цены страницы Telegram (tg.hhr.pro). Единственный источник правды —
 * фронт только показывает, сумму заказа всегда считает сервер.
 */
export const TG_TICKET_PACKS = [
  { tickets: 1, price: 300 },
  { tickets: 3, price: 500 },
  { tickets: 5, price: 700 },
  { tickets: 10, price: 1000 },
  { tickets: 20, price: 1500 },
  { tickets: 50, price: 3000 },
] as const;

export const TG_CUSTOM_MIN = 100;
export const TG_CUSTOM_MAX = 1000;
export const TG_CUSTOM_STEP = 50;
export const TG_CUSTOM_PRICE_PER_TICKET = 60;

export const TG_SHIRTS = {
  a: { name: "Сегодня ехал 299", price: 2500 },
  b: { name: "Еду к шалавам", price: 2600 },
} as const;
export type TgShirtId = keyof typeof TG_SHIRTS;
export const TG_SIZES = ["S", "M", "L", "XL", "XXL"] as const;

/** Посылка на одну футболку для расчёта СДЭК (можно переопределить в env). */
export const TG_SHIRT_PACKAGE = {
  weightG: Number(process.env.TG_SHIRT_WEIGHT_G || 300),
  lengthCm: Number(process.env.TG_SHIRT_LENGTH_CM || 30),
  widthCm: Number(process.env.TG_SHIRT_WIDTH_CM || 25),
  heightCm: Number(process.env.TG_SHIRT_HEIGHT_CM || 3),
};

export type TicketChoice = { pack: number } | { custom: number };

export function priceTickets(c: TicketChoice): { tickets: number; price: number } | null {
  if ("pack" in c) {
    const p = TG_TICKET_PACKS[c.pack];
    return p ? { tickets: p.tickets, price: p.price } : null;
  }
  const n = c.custom;
  if (!Number.isInteger(n) || n < TG_CUSTOM_MIN || n > TG_CUSTOM_MAX || n % TG_CUSTOM_STEP !== 0) return null;
  return { tickets: n, price: n * TG_CUSTOM_PRICE_PER_TICKET };
}

export type ShirtLine = { id: TgShirtId; size: string; qty: number };

export function priceShirts(lines: ShirtLine[]): { total: number; qty: number; lines: (ShirtLine & { name: string; price: number })[] } | null {
  let total = 0;
  let qty = 0;
  const out: (ShirtLine & { name: string; price: number })[] = [];
  for (const l of lines) {
    const s = TG_SHIRTS[l.id];
    if (!s || !(TG_SIZES as readonly string[]).includes(l.size) || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 20) return null;
    total += s.price * l.qty;
    qty += l.qty;
    out.push({ ...l, name: s.name, price: s.price });
  }
  return { total, qty, lines: out };
}

export function shirtPackage(qty: number) {
  const p = TG_SHIRT_PACKAGE;
  return { weightG: p.weightG * qty, lengthCm: p.lengthCm, widthCm: p.widthCm, heightCm: p.heightCm * qty };
}

/** 8XXXXXXXXXX / 7XXXXXXXXXX / +7 (...) → +7XXXXXXXXXX, иначе null. */
export function normalizeRuPhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) d = "7" + d.slice(1);
  if (d.length === 10) d = "7" + d;
  return d.length === 11 && d.startsWith("7") ? `+${d}` : null;
}
