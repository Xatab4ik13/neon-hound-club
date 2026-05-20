// Сезонные челленджи клуба. Срок жизни — месяц/сезон.
// Цель: удержать подписчиков Hell Pass через ежемесячные задачи с наградой в билетах.

export type QuestCategory = "ride" | "club" | "shop" | "content";

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  /** Текущий прогресс. */
  progress: number;
  /** Целевое значение. */
  goal: number;
  /** Единица измерения для UI: «км», «постов», «заказов» и т.п. */
  unit: string;
  /** Награда в билетах. */
  reward: number;
  /** Дополнительный бонус (текст, например «+50 XP» или «бейдж Road Warrior»). */
  bonus?: string;
  /** Уже забрана награда. */
  claimed?: boolean;
  /** Требует Hell Pass (тир и выше). */
  requiresPass?: "silver" | "gold" | "platinum";
};

export type Season = {
  id: string;
  label: string;
  endsAt: string;
  quests: Quest[];
};

function endOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 0).toISOString();
}

export const CURRENT_SEASON: Season = {
  id: "s-may-2026",
  label: "Май 2026",
  endsAt: endOfMonth(),
  quests: [
    {
      id: "q1",
      title: "Накатать 500 км",
      description: "Запиши поездки в гараже — суммарно 500 км за месяц.",
      category: "ride",
      progress: 312,
      goal: 500,
      unit: "км",
      reward: 5,
      bonus: "+50 XP",
    },
    {
      id: "q2",
      title: "Сервис-апдейт",
      description: "Добавь любую запись в журнал обслуживания байка.",
      category: "ride",
      progress: 1,
      goal: 1,
      unit: "запись",
      reward: 2,
      claimed: true,
    },
    {
      id: "q3",
      title: "5 постов в ленте",
      description: "Опубликуй пять постов в клубной ленте за сезон.",
      category: "club",
      progress: 2,
      goal: 5,
      unit: "постов",
      reward: 3,
    },
    {
      id: "q4",
      title: "Заказ из магазина",
      description: "Любая покупка в магазине клуба — даст билет автоматически.",
      category: "shop",
      progress: 0,
      goal: 1,
      unit: "заказ",
      reward: 4,
      bonus: "+ кешбэк билетами",
    },
    {
      id: "q5",
      title: "Road Captain",
      description: "Опубликуй трек поездки 200+ км с фото. Только Hell Pass Gold+.",
      category: "content",
      progress: 0,
      goal: 1,
      unit: "трек",
      reward: 8,
      bonus: "бейдж Road Captain",
      requiresPass: "gold",
    },
  ],
};

export function questPct(q: Quest) {
  return Math.min(100, Math.round((q.progress / q.goal) * 100));
}

export function questCompleted(q: Quest) {
  return q.progress >= q.goal;
}

export function seasonSummary(s: Season) {
  const done = s.quests.filter(questCompleted).length;
  const total = s.quests.length;
  const ticketsEarned = s.quests
    .filter((q) => q.claimed)
    .reduce((sum, q) => sum + q.reward, 0);
  const ticketsAvailable = s.quests
    .filter((q) => questCompleted(q) && !q.claimed)
    .reduce((sum, q) => sum + q.reward, 0);
  return { done, total, ticketsEarned, ticketsAvailable };
}

export const CATEGORY_LABEL: Record<QuestCategory, string> = {
  ride: "Покатушки",
  club: "Клуб",
  shop: "Магазин",
  content: "Контент",
};
