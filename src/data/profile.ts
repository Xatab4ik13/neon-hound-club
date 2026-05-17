// Профиль райдера. Ранги и XP вынесены в src/data/ranks.ts + rank-state.ts.

export const ME = {
  nick: "ASPHALT_DOG",
  city: "Москва",
  bike: "Yamaha MT-09",
  joined: "март 2024",
  totals: { tickets: 7, wins: 1, orders: 4, bikes: 1 },
};

export type ActiveTicket = {
  id: string;
  title: string;
  myTickets: number;
  totalTickets: number;
  deadline: string;
  /** ISO-таймстемп закрытия розыгрыша — для live-таймера. */
  deadlineAt: string;
  image: string;
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
    myTickets: 12,
    totalTickets: 3000,
    deadline: "вс · 23:59",
    deadlineAt: nextWeekday(0, 23, 59),
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80",
  },
  {
    id: "r2",
    title: "GoPro Hero 12 + комплект",
    myTickets: 3,
    totalTickets: 500,
    deadline: "пт · 20:00",
    deadlineAt: nextWeekday(5, 20, 0),
    image:
      "https://images.unsplash.com/photo-1502945015378-0e284ca1a5be?w=800&q=80",
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
