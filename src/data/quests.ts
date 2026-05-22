// Челленджи клуба. Перебалансированы под цель: выполнив все базовые задания,
// райдер добирается примерно до ранга Road Captain (≈2 000 XP).
//
// Награды — XP и/или билеты. Часть задач разовые (onboarding), часть
// перезапускается каждый сезон. Hell AI — ступенчатый прогресс: чем больше
// общается, тем больше XP получает.

export type QuestCategory =
  | "onboarding"
  | "ride"
  | "social"
  | "shop"
  | "ai"
  | "referral"
  | "app";

export type QuestKind = "one-time" | "monthly";

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
  /** Разовое задание или повторяющееся каждый месяц. */
  kind: QuestKind;
  /** Уже забрана награда. */
  claimed?: boolean;
  /** Видна только блогерам/админам. */
  bloggerOnly?: boolean;
  /** Дополнительная пометка (например про реферала: «+1 билет другу»). */
  bonus?: string;
  /** Ссылка на страницу с действием (приглашение, скачивание PWA и т.д.). */
  action?: { label: string; to: string };
  /**
   * Для Hell AI: ступенчатая шкала наград. Игрок получает XP за каждый
   * пройденный порог. UI показывает прогресс к следующему порогу.
   */
  ladder?: Array<{ at: number; xp: number; reached?: boolean }>;
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

// ─── Балансировка XP ────────────────────────────────────────────────────
// Pit Crew → 500 XP, Road Captain → 2 000 XP.
// Сумма базовых наград ниже подобрана так, чтобы пройдя всё, райдер
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

export const CURRENT_SEASON: Season = {
  id: "s-may-2026",
  label: "Май 2026",
  endsAt: endOfMonth(),
  quests: [
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
      description: "Запиши поездки в журнал байка — суммарно 500 км за месяц.",
      category: "ride",
      progress: 312,
      goal: 500,
      unit: "км",
      xp: 200,
      tickets: 0,
      kind: "monthly",
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
      kind: "monthly",
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
      kind: "monthly",
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
      kind: "monthly",
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
      // Ссылка ведёт на инструкцию — на самой странице определим iOS/Android/Desktop.
      action: { label: "Как установить", to: "/club/install" },
    },
    {
      id: "ai-chat",
      title: "Общайся с Hell AI",
      description:
        "Спрашивай по своему мото — чем больше вопросов, тем больше XP. Шкала повторяется каждый месяц.",
      category: "ai",
      progress: 12,
      goal: 50,
      unit: "вопросов",
      xp: 600, // суммарно по всей шкале
      tickets: 0,
      kind: "monthly",
      ladder: [
        { at: 5,  xp: 50,  reached: true },
        { at: 10, xp: 100, reached: true },
        { at: 20, xp: 150 },
        { at: 35, xp: 150 },
        { at: 50, xp: 150 },
      ],
      action: { label: "Открыть Hell AI", to: "/club/hell-ai" },
    },
  ],
};

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

export function seasonSummary(s: Season) {
  const visible = s.quests; // фильтрация по роли — на стороне UI
  const done = visible.filter(questCompleted).length;
  const total = visible.length;

  const xpEarned = visible.reduce((sum, q) => {
    if (q.ladder) return sum + ladderEarnedXp(q);
    if (q.claimed || questCompleted(q)) return sum + q.xp;
    return sum;
  }, 0);

  const ticketsEarned = visible
    .filter((q) => q.claimed && q.tickets > 0)
    .reduce((sum, q) => sum + q.tickets, 0);

  const ticketsAvailable = visible
    .filter((q) => questCompleted(q) && !q.claimed && q.tickets > 0)
    .reduce((sum, q) => sum + q.tickets, 0);

  return { done, total, xpEarned, ticketsEarned, ticketsAvailable };
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
