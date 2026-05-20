// Mock-данные СДЭК-трекинга для заказа.
// Без реальной интеграции — пока витрина: статусы, точки маршрута, ETA.

export type CdekStatus =
  | "created"
  | "accepted"
  | "warehouse_from"
  | "in_transit"
  | "warehouse_to"
  | "delivering"
  | "delivered";

export type CdekPoint = {
  status: CdekStatus;
  city: string;
  label: string;
  /** Дата/время в формате «дд.мм · чч:мм» (мок). */
  at: string;
  done: boolean;
};

export type CdekTrack = {
  /** Номер накладной СДЭК. */
  trackNumber: string;
  status: CdekStatus;
  /** Откуда → куда. */
  from: string;
  to: string;
  /** Ожидаемая дата доставки. */
  eta: string;
  points: CdekPoint[];
};

export const CDEK_STATUS_LABEL: Record<CdekStatus, string> = {
  created: "Заказ создан",
  accepted: "Принят отправителем",
  warehouse_from: "На складе отправителя",
  in_transit: "В пути",
  warehouse_to: "На складе получателя",
  delivering: "Передан курьеру",
  delivered: "Вручён",
};

const STEP_ORDER: CdekStatus[] = [
  "created",
  "accepted",
  "warehouse_from",
  "in_transit",
  "warehouse_to",
  "delivering",
  "delivered",
];

export function cdekProgressPct(status: CdekStatus) {
  const i = STEP_ORDER.indexOf(status);
  if (i < 0) return 0;
  return Math.round((i / (STEP_ORDER.length - 1)) * 100);
}

/** Мок-генератор треков по orderId. */
export function mockTrackForOrder(orderId: string): CdekTrack | null {
  const TRACKS: Record<string, CdekTrack> = {
    o1: {
      trackNumber: "10074456321",
      status: "in_transit",
      from: "Москва, склад HELLHOUND",
      to: "Санкт-Петербург, ПВЗ на Невском 22",
      eta: "21.05 · до 18:00",
      points: [
        { status: "created", city: "Москва", label: "Заказ оформлен", at: "16.05 · 14:32", done: true },
        { status: "accepted", city: "Москва", label: "Принят курьером СДЭК", at: "17.05 · 09:10", done: true },
        { status: "warehouse_from", city: "Москва", label: "На складе отправителя", at: "17.05 · 19:40", done: true },
        { status: "in_transit", city: "Тверь", label: "Транзит → Санкт-Петербург", at: "18.05 · 11:05", done: true },
        { status: "warehouse_to", city: "Санкт-Петербург", label: "На складе получателя", at: "ожидается 20.05", done: false },
        { status: "delivering", city: "Санкт-Петербург", label: "Курьер выехал", at: "ожидается 21.05", done: false },
        { status: "delivered", city: "Санкт-Петербург", label: "Вручено получателю", at: "ожидается 21.05", done: false },
      ],
    },
    o2: {
      trackNumber: "10072218904",
      status: "delivered",
      from: "Москва, склад HELLHOUND",
      to: "Краснодар, ПВЗ на Красной 145",
      eta: "вручено 14.04 · 13:22",
      points: [
        { status: "created", city: "Москва", label: "Заказ оформлен", at: "10.04 · 11:08", done: true },
        { status: "accepted", city: "Москва", label: "Принят курьером СДЭК", at: "10.04 · 17:20", done: true },
        { status: "warehouse_from", city: "Москва", label: "На складе отправителя", at: "11.04 · 08:30", done: true },
        { status: "in_transit", city: "Воронеж", label: "Транзит → Краснодар", at: "12.04 · 14:00", done: true },
        { status: "warehouse_to", city: "Краснодар", label: "На складе получателя", at: "13.04 · 10:15", done: true },
        { status: "delivering", city: "Краснодар", label: "Курьер выехал", at: "14.04 · 09:40", done: true },
        { status: "delivered", city: "Краснодар", label: "Вручено получателю", at: "14.04 · 13:22", done: true },
      ],
    },
    o4: {
      trackNumber: "10071100553",
      status: "delivered",
      from: "Москва, склад HELLHOUND",
      to: "Москва, ПВЗ на Профсоюзной 84",
      eta: "вручено 01.03 · 16:05",
      points: [
        { status: "created", city: "Москва", label: "Заказ оформлен", at: "27.02 · 18:42", done: true },
        { status: "accepted", city: "Москва", label: "Принят курьером СДЭК", at: "28.02 · 11:30", done: true },
        { status: "warehouse_from", city: "Москва", label: "На складе отправителя", at: "28.02 · 16:00", done: true },
        { status: "in_transit", city: "Москва", label: "Передача между складами", at: "01.03 · 08:20", done: true },
        { status: "warehouse_to", city: "Москва", label: "На складе получателя", at: "01.03 · 11:15", done: true },
        { status: "delivering", city: "Москва", label: "Курьер выехал", at: "01.03 · 14:00", done: true },
        { status: "delivered", city: "Москва", label: "Вручено получателю", at: "01.03 · 16:05", done: true },
      ],
    },
  };
  return TRACKS[orderId] ?? null;
}
