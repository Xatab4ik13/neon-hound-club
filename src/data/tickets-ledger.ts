// Журнал билетов: единая валюта клуба.
// Все операции по билетам — поступления и списания — здесь.
// Мок-данные. Когда подключим Cloud — заменим на server fn,
// сохранив тот же DTO-формат.

export type TicketSource =
  | "pass"        // ежемесячное начисление по Hell Pass
  | "purchase"    // прямая покупка билетов
  | "cashback"    // кешбэк с заказа в магазине
  | "raffle"      // вложил билет(ы) в розыгрыш (списание)
  | "reward"      // награда за квест / челлендж
  | "admin"       // ручное начисление/списание от админа
  | "refund";     // возврат

export type TicketEntry = {
  id: string;
  /** ISO timestamp */
  at: string;
  /** Положительное — поступление, отрицательное — списание */
  delta: number;
  source: TicketSource;
  /** Короткое пояснение для пользователя. */
  note: string;
  /** Опц. ссылка на объект (заказ/розыгрыш/квест). */
  ref?: { kind: "order" | "raffle" | "quest"; id: string; label?: string };
};

export const SOURCE_META: Record<
  TicketSource,
  { label: string; tone: "green" | "pink" | "amber" | "violet" | "neutral" | "red" }
> = {
  pass:     { label: "Hell Pass",  tone: "violet"  },
  purchase: { label: "Покупка",    tone: "pink"    },
  cashback: { label: "Кешбэк",     tone: "green"   },
  raffle:   { label: "Розыгрыш",   tone: "amber"   },
  reward:   { label: "Награда",    tone: "green"   },
  admin:    { label: "Админ",      tone: "neutral" },
  refund:   { label: "Возврат",    tone: "neutral" },
};

/** Мок: последние операции по билетам ASPHALT_DOG. */
export const TICKET_LEDGER: TicketEntry[] = [
  {
    id: "tx-031",
    at: "2026-05-18T09:12:00.000Z",
    delta: +30,
    source: "pass",
    note: "Ежемесячное начисление · Gold",
  },
  {
    id: "tx-030",
    at: "2026-05-15T20:44:00.000Z",
    delta: -3,
    source: "raffle",
    note: "Вложено в розыгрыш",
    ref: { kind: "raffle", id: "r1", label: "Yamaha R1" },
  },
  {
    id: "tx-029",
    at: "2026-05-12T14:03:00.000Z",
    delta: +34,
    source: "cashback",
    note: "Заказ HH-A4F2K1 · 6 900 ₽",
    ref: { kind: "order", id: "o1", label: "Худи «Hell on wheels»" },
  },
  {
    id: "tx-028",
    at: "2026-05-08T11:30:00.000Z",
    delta: +10,
    source: "reward",
    note: "Квест «Прокатай 500 км в мае»",
    ref: { kind: "quest", id: "q-may-mileage" },
  },
  {
    id: "tx-027",
    at: "2026-05-02T16:50:00.000Z",
    delta: +50,
    source: "purchase",
    note: "Пак «50 билетов» · 990 ₽",
  },
  {
    id: "tx-026",
    at: "2026-04-29T22:11:00.000Z",
    delta: -5,
    source: "raffle",
    note: "Вложено в розыгрыш",
    ref: { kind: "raffle", id: "r2", label: "GoPro Hero 12" },
  },
  {
    id: "tx-025",
    at: "2026-04-18T09:05:00.000Z",
    delta: +30,
    source: "pass",
    note: "Ежемесячное начисление · Gold",
  },
  {
    id: "tx-024",
    at: "2026-04-14T19:21:00.000Z",
    delta: +12,
    source: "cashback",
    note: "Заказ HH-9KX3 · 2 400 ₽",
    ref: { kind: "order", id: "o2", label: "Кепка Race Pass" },
  },
  {
    id: "tx-023",
    at: "2026-04-05T13:00:00.000Z",
    delta: +5,
    source: "admin",
    note: "Компенсация за задержку доставки",
  },
];

/** Итоги по операциям — суммарные приход/расход и баланс. */
export function summarizeLedger(entries: TicketEntry[]) {
  let income = 0;
  let outcome = 0;
  for (const e of entries) {
    if (e.delta > 0) income += e.delta;
    else outcome += -e.delta;
  }
  return { income, outcome, balance: income - outcome };
}
