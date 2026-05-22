// Челленджи клуба. Список задач, за которые райдер получает XP и/или билеты.
// Сейчас данные хранятся здесь как seed; в админке (позже) будут CRUD-категории
// и сами челленджи с настройкой XP/билетов. Поэтому модель уже категорийная,
// без сезонов/дат — челленджи живут вечно, пока админ их не выключит.
//
// Часть задач разовые (onboarding), часть «повторяющиеся» (например, журнал
// поездок или комментарии в ленте сбрасываются админом вручную).
// Hell AI — ступенчатый прогресс: чем больше общается, тем больше XP.

export type QuestCategory =
  | "onboarding"
  | "ride"
  | "social"
  | "shop"
  | "ai"
  | "referral"
  | "app";

export type QuestKind = "one-time" | "repeatable";

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  /** Текущий прогресс. */
  progress: number;
  /** Целевое значение. */
  goal: number;
  /** Единица измерения для UI. */
  unit: string;
  /** Награда в XP. */
  xp: number;
  /** Награда в билетах (0 если только опыт). */
  tickets: number;
  /** Разовое задание или повторяющееся. */
  kind: QuestKind;
  /** Уже забрана награда. */
  claimed?: boolean;
  /** Видна только блогерам/админам. */
  bloggerOnly?: boolean;
  /** Дополнительная пометка (например про реферала: «+1 билет другу»). */
  bonus?: string;
  /** Ссылка на страницу с действием. */
  action?: { label: string; to: string };
  /**
   * Для Hell AI: ступенчатая шкала наград. Игрок получает XP за каждый
   * пройденный порог. UI показывает прогресс к следующему порогу.
   */
  ladder?: Array<{ at: number; xp: number; reached?: boolean }>;
};

// ─── Балансировка XP ────────────────────────────────────────────────────
// Pit Crew → 500 XP, Road Captain → 2 000 XP.
// Сумма базовых наград подобрана так, чтобы пройдя всё, райдер
// оказался на пороге Road Captain.
//
//   Профиль + мотоцикл     300
//   Накатать 500 км        200
//   5 комментариев         100
//   Заказ из магазина      250  + 1 билет
//   Пригласи друга         400  + 1 билет (и другу)
//   Скачать PWA            200  + 1 билет
//   Hell AI (5 ступеней)   до 600 (50/100/150/150/150)
//   ─────────────────────────────────
//   Итого                 ≈ 2 050 XP

export const CLUB_QUESTS: Quest[] = [
  {
    id: "onboarding-profile",
    title: "Заполни профиль и добавь мотоцикл",
    description:
      "Аватар, город, мотоцикл в гараже — это нужно для розыгрышей и доставки.",
    category: "onboarding",
    progress: 1,
    goal: 2,
    unit: "из 2",
    xp: 300,
    tickets: 0,
    kind: "one-time",
    action: { label: "В гараж", to: "/club/garage" },
  },
  {
    id: "ride-500",
    title: "Накатать 500 км",
    description: "Запиши поездки в журнал байка — суммарно 500 км.",
    category: "ride",
    progress: 312,
    goal: 500,
    unit: "км",
    xp: 200,
    tickets: 0,
    kind: "repeatable",
    action: { label: "Открыть журнал", to: "/club/garage" },
  },
  {
    id: "social-comments",
    title: "5 комментариев в ленте",
    description: "Поддержи движ — оставь 5 комментариев в клубной ленте.",
    category: "social",
    progress: 2,
    goal: 5,
    unit: "комментариев",
    xp: 100,
    tickets: 0,
    kind: "repeatable",
    action: { label: "В ленту", to: "/club" },
  },
  {
    id: "social-posts-blogger",
    title: "5 постов в ленту",
    description: "Только для блогеров. Опубликуй 5 постов в клубной ленте.",
    category: "social",
    progress: 0,
    goal: 5,
    unit: "постов",
    xp: 100,
    tickets: 0,
    kind: "repeatable",
    bloggerOnly: true,
    action: { label: "В кабинет блогера", to: "/blogger" },
  },
  {
    id: "shop-order",
    title: "Заказ из магазина",
    description: "Любая покупка в клубном магазине — даст билет и опыт.",
    category: "shop",
    progress: 0,
    goal: 1,
    unit: "заказ",
    xp: 250,
    tickets: 1,
    kind: "repeatable",
    action: { label: "В магазин", to: "/club/shop" },
  },
  {
    id: "referral-friend",
    title: "Пригласи друга",
    description:
      "Друг регистрируется по твоей ссылке. Билет получите оба, плюс опыт тебе.",
    category: "referral",
    progress: 0,
    goal: 1,
    unit: "друг",
    xp: 400,
    tickets: 1,
    kind: "one-time",
    bonus: "+1 билет другу",
    action: { label: "Реферальная ссылка", to: "/club/invite" },
  },
  {
    id: "app-install",
    title: "Установи приложение",
    description:
      "Добавь клуб на главный экран — это PWA с пуш-уведомлениями. Откроем гайд под твоё устройство.",
    category: "app",
    progress: 0,
    goal: 1,
    unit: "установка",
    xp: 200,
    tickets: 1,
    kind: "one-time",
    action: { label: "Как установить", to: "/club/install" },
  },
  {
    id: "ai-chat",
    title: "Общайся с Hell AI",
    description:
      "Спрашивай по своему мото — чем больше вопросов, тем больше XP. Прогресс по ступеням.",
    category: "ai",
    progress: 12,
    goal: 50,
    unit: "вопросов",
    xp: 600, // суммарно по всей шкале
    tickets: 0,
    kind: "repeatable",
    ladder: [
      { at: 5,  xp: 50,  reached: true },
      { at: 10, xp: 100, reached: true },
      { at: 20, xp: 150 },
      { at: 35, xp: 150 },
      { at: 50, xp: 150 },
    ],
    action: { label: "Открыть Hell AI", to: "/club/hell-ai" },
  },
];

export function questPct(q: Quest) {
  return Math.min(100, Math.round((q.progress / q.goal) * 100));
}

export function questCompleted(q: Quest) {
  return q.progress >= q.goal;
}

/** Сколько XP уже «закрыто» в ступенчатой задаче (Hell AI). */
export function ladderEarnedXp(q: Quest): number {
  if (!q.ladder) return 0;
  return q.ladder
    .filter((s) => q.progress >= s.at)
    .reduce((sum, s) => sum + s.xp, 0);
}

/** Следующая непройденная ступень (для UI «до +XP осталось N»). */
export function nextLadderStep(q: Quest) {
  if (!q.ladder) return null;
  return q.ladder.find((s) => q.progress < s.at) ?? null;
}

export function questsSummary(quests: Quest[]) {
  const done = quests.filter(questCompleted).length;
  const total = quests.length;

  const ticketsEarned = quests
    .filter((q) => q.claimed && q.tickets > 0)
    .reduce((sum, q) => sum + q.tickets, 0);

  const ticketsAvailable = quests
    .filter((q) => questCompleted(q) && !q.claimed && q.tickets > 0)
    .reduce((sum, q) => sum + q.tickets, 0);

  return { done, total, ticketsEarned, ticketsAvailable };
}

export const CATEGORY_LABEL: Record<QuestCategory, string> = {
  onboarding: "Старт",
  ride: "Покатушки",
  social: "Лента",
  shop: "Магазин",
  ai: "Hell AI",
  referral: "Друзья",
  app: "Приложение",
};
