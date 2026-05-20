// Завершённые розыгрыши пользователя: и выигранные, и проигранные.
// Источник правды для вкладки «Мои розыгрыши → Завершённые».

export type CompletedRaffleStatus = "won" | "lost";

export type CompletedRaffle = {
  id: string;
  title: string;
  /** Изображение приза/розыгрыша. */
  image: string;
  /** Дата завершения, формат «мес год». */
  date: string;
  status: CompletedRaffleStatus;
  /** Сколько билетов было у меня. */
  myTickets: number;
  /** Сколько билетов было всего. */
  totalTickets: number;
  /** Приз — если выиграл. */
  prize?: string;
  /** Кто выиграл главный приз (для проигранных). */
  winnerNick?: string;
  /** Статус доставки для выигранных. */
  delivery?: "Получено" | "В пути" | "Готовится";
};

export const COMPLETED_RAFFLES: CompletedRaffle[] = [
  {
    id: "cr1",
    title: "Перчатки HELLHOUND v1",
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    date: "янв 2025",
    status: "won",
    myTickets: 8,
    totalTickets: 1240,
    prize: "Перчатки HELLHOUND v1, размер M",
    delivery: "Получено",
  },
  {
    id: "cr2",
    title: "Honda CBR 600RR",
    image:
      "https://images.unsplash.com/photo-1558981852-426c6c22a060?w=1200&q=80",
    date: "дек 2024",
    status: "lost",
    myTickets: 4,
    totalTickets: 4820,
    winnerNick: "STREET_FOX",
  },
  {
    id: "cr3",
    title: "Шлем Arai RX-7V",
    image:
      "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=1200&q=80",
    date: "ноя 2024",
    status: "lost",
    myTickets: 2,
    totalTickets: 980,
    winnerNick: "NIGHTRIDER",
  },
  {
    id: "cr4",
    title: "Худи Founder S01",
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80",
    date: "окт 2024",
    status: "lost",
    myTickets: 6,
    totalTickets: 2100,
    winnerNick: "PIT_LANE_42",
  },
];
