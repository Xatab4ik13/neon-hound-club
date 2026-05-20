// Профиль райдера. Ранги и XP вынесены в src/data/ranks.ts + rank-state.ts.

export const ME = {
  nick: "ASPHALT_DOG",
  city: "Москва",
  bike: "Yamaha MT-09",
  joined: "март 2024",
  totals: { tickets: 7, wins: 1, orders: 4, bikes: 1 },
};

export type RafflePrize = {
  /** Место в розыгрыше: 1 — главный приз, 2/3 и т.д. — доп. призы. */
  place: number;
  title: string;
  /** Короткое описание приза (модель, комплектация и т.п.). */
  note?: string;
  /** Оценочная стоимость в рублях — для шкалы «общий призовой фонд». */
  valueRub?: number;
  image?: string;
};

export type RaffleSpec = { label: string; value: string };

export type ActiveTicket = {
  id: string;
  title: string;
  /** Короткий подзаголовок, напр. «спортбайк 2024 · из салона». */
  subtitle?: string;
  myTickets: number;
  totalTickets: number;
  deadline: string;
  /** ISO-таймстемп закрытия розыгрыша — для live-таймера. */
  deadlineAt: string;
  image: string;
  /** Дополнительные фото для галереи на детальной странице. */
  gallery?: string[];
  /** Длинное описание (поддерживает абзацы через \n\n). */
  description?: string;
  /** Технические характеристики (выводятся таблицей). */
  specs?: RaffleSpec[];
  /** Все призы розыгрыша. Если не задано — единственный приз = title. */
  prizes?: RafflePrize[];
  /** Условия участия / что важно знать. */
  rules?: string[];
};

// Динамические дедлайны: ближайшее воскресенье 23:59 и ближайшая пятница 20:00.
function nextWeekday(targetDow: number, hour: number, minute: number) {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  const diff = (targetDow - now.getDay() + 7) % 7;
  if (diff === 0 && d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 7);
  } else {
    d.setDate(d.getDate() + diff);
  }
  return d.toISOString();
}

export const ACTIVE_TICKETS: ActiveTicket[] = [
  {
    id: "r1",
    title: "Yamaha R1",
    subtitle: "Спортбайк 2024 · 998 cc · из салона",
    myTickets: 12,
    totalTickets: 3000,
    deadline: "вс · 23:59",
    deadlineAt: nextWeekday(0, 23, 59),
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1600&q=80",
      "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=1600&q=80",
      "https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=1600&q=80",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1600&q=80",
    ],
    description: `Литровый супербайк, на котором ездит Hell сам. Тот самый R1 — с заводской электроникой, кватер-шифтером и режимом Track. Приз едет к победителю на эвакуаторе, в любую точку РФ за наш счёт.

Документы оформляем на победителя, регистрация в ГИБДД — наша забота. Берём на себя ПТС, СТС и страховку ОСАГО на первый год.`,
    specs: [
      { label: "Двигатель", value: "998 cc · рядный 4-цилиндровый" },
      { label: "Мощность", value: "200 л.с." },
      { label: "Сухая масса", value: "201 кг" },
      { label: "Год", value: "2024, новый из салона" },
      { label: "Цвет", value: "Icon Blue" },
    ],
    prizes: [
      {
        place: 1,
        title: "Yamaha R1 2024",
        note: "новый, с документами, доставка по РФ",
        valueRub: 2_400_000,
        image:
          "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
      },
      {
        place: 2,
        title: "Шлем Arai RX-7V",
        note: "размер и расцветка на выбор победителя",
        valueRub: 95_000,
        image:
          "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=1200&q=80",
      },
      {
        place: 3,
        title: "Комплект экипировки HELLHOUND",
        note: "куртка + перчатки + защита спины",
        valueRub: 42_000,
        image:
          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
      },
    ],
    rules: [
      "Розыгрыш в прямом эфире на YouTube HELLHOUND Racing.",
      "Победитель определяется ГСЧ по номеру билета.",
      "Участвовать могут только верифицированные аккаунты клуба (18+).",
      "Если победитель не выходит на связь 7 дней — приз уходит следующему номеру.",
    ],
  },
  {
    id: "r2",
    title: "GoPro Hero 12 + комплект",
    subtitle: "Камера + крепления + 2 аккума",
    myTickets: 3,
    totalTickets: 500,
    deadline: "пт · 20:00",
    deadlineAt: nextWeekday(5, 20, 0),
    image:
      "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=1600&q=80",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1600&q=80",
    ],
    description: `GoPro Hero 12 Black в полном «мото-комплекте»: крепление на шлем, на бак, на руль, два аккумулятора и быстрая зарядка. Снимать свои покатушки в 5.3K — теперь не оправдание, что «нечем».

Доставка по РФ за наш счёт.`,
    specs: [
      { label: "Модель", value: "GoPro Hero 12 Black" },
      { label: "Видео", value: "до 5.3K 60p · HyperSmooth 6.0" },
      { label: "В комплекте", value: "3 крепления + 2 аккума + зарядка" },
    ],
    prizes: [
      {
        place: 1,
        title: "GoPro Hero 12 Black + мото-комплект",
        valueRub: 65_000,
        image:
          "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=1200&q=80",
      },
      {
        place: 2,
        title: "Карта SanDisk Extreme PRO 256GB",
        valueRub: 5_500,
        image:
          "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&q=80",
      },
    ],
    rules: [
      "Розыгрыш в прямом эфире на YouTube HELLHOUND Racing.",
      "Победитель определяется ГСЧ по номеру билета.",
      "Доставка по РФ — за наш счёт.",
    ],
  },
];

export type WinRow = { id: string; title: string; date: string; status: string };
export const WIN_HISTORY: WinRow[] = [
  { id: "w1", title: "Перчатки HELLHOUND v1", date: "янв 2025", status: "Получено" },
];

export type Order = {
  id: string;
  title: string;
  date: string;
  price: string;
  status: "В пути" | "Доставлено" | "Waitlist" | "Ожидает оплаты";
};
export const ORDERS: Order[] = [
  { id: "o1", title: 'Худи HELLHOUND «Hell on wheels»', date: "02.05.26", price: "6 900 ₽", status: "В пути" },
  { id: "o2", title: "Кепка Race Pass", date: "14.04.26", price: "2 400 ₽", status: "Доставлено" },
  { id: "o3", title: "Перчатки HELLHOUND v2", date: "—", price: "—", status: "Waitlist" },
  { id: "o4", title: "Стикер-пак", date: "01.03.26", price: "600 ₽", status: "Доставлено" },
];

export type Bike = {
  id: string;
  brand: string;
  model: string;
  year: number;
  mileage: string;
  image: string;
};
export const GARAGE: Bike[] = [
  {
    id: "b1",
    brand: "Yamaha",
    model: "MT-09",
    year: 2022,
    mileage: "18 400 км",
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1000&q=80",
  },
];
