// Каталог тиров Hell Pass. Используется и на /club/hell-pass (список),
// и на /club/hell-pass/$tier (детальная страница с полным описанием).

import {
  Ticket,
  Percent,
  Sparkles,
  Zap,
  GraduationCap,
  MessageSquare,
  Trophy,
  Coins,
  
  Infinity as InfinityIcon,
  type LucideIcon,
} from "lucide-react";

export type Perk = {
  icon: LucideIcon;
  /** Короткая строка для карточки списка. */
  label: string;
  /** Числовое/короткое значение (3, 10%, ×2). */
  value?: string;
  /** Подсвечивать значение цветом тира. */
  accent?: boolean;
  /** Развёрнутое объяснение на детальной странице — что это даёт и как работает. */
  detail?: string;
};

export type Tier = {
  slug: "silver" | "gold" | "platinum";
  id: string;
  name: string;
  price: number;
  /** Цвет тира — для подсветки. */
  color: string;
  /** Из какого тира наследуются все плюшки. */
  inheritsFrom?: string;
  /** Короткое описание под заголовком на обеих страницах. */
  tagline: string;
  /** Кому подходит — текстовый абзац на детальной. */
  forWhom: string;
  /** Что внутри по группам — для детальной страницы. */
  groups: { title: string; perks: Perk[] }[];
  /** Плоский список для карточки (формируется из groups). */
  perks: Perk[];
  recommended?: boolean;
  ultimate?: boolean;
};

// ─── SILVER ─────────────────────────────────────────────────────────────

const SILVER_GROUPS: { title: string; perks: Perk[] }[] = [
  {
    title: "Розыгрыши и билеты",
    perks: [
      {
        icon: Ticket,
        value: "3",
        label: "билета в месяц в любой розыгрыш",
        detail:
          "Каждый месяц на счёт падает 3 билета. Можно потратить на один розыгрыш или раскидать по разным. Билеты копятся и не сгорают.",
      },
      {
        icon: Trophy,
        label: "Доступ к эксклюзивным розыгрышам",
        detail:
          "Раз в месяц закрытый розыгрыш только для подписчиков Hell Pass — туда не пускают тех, кто покупает билеты разово.",
      },
    ],
  },
  {
    title: "AI-механик и клуб",
    perks: [
      {
        icon: Sparkles,
        value: "30",
        label: "Hell AI-вопросов про твой мото в месяц",
        detail:
          "Hell AI знает твой байк из профиля. 30 вопросов в месяц — от «что за стук» до «какое масло».",
      },
      {
        icon: MessageSquare,
        label: "Комментарии в ленте клуба",
        detail:
          "Без подписки лента работает только на чтение. Silver открывает комментарии под постами Hell и других райдеров.",
      },
      {
        icon: Zap,
        value: "×1.25",
        label: "Буст XP клуба",
        detail:
          "Любая активность в клубе приносит на 25% больше очков опыта за челленджи. Быстрее растёт ранг — быстрее открываются кастомизации профиля.",
      },
    ],
  },
  {
    title: "Мерч и школа",
    perks: [
      {
        icon: Percent,
        value: "5%",
        label: "Скидка на мерч HELLHOUND",
        detail:
          "Стандартная скидка в магазине. Считается до промокодов и распродаж — не складывается с ними, берётся максимальная.",
      },
      {
        icon: GraduationCap,
        value: "−20%",
        label: "Скидка на школу HELLHOUND",
        detail:
          "−20% на любой курс школы — от базового тренинга до трек-дней. Скидка применяется автоматически при оплате из личного кабинета.",
      },
      {
        icon: Coins,
        value: "1 / 200 ₽",
        label: "Кешбэк билетами с мерча",
        detail:
          "За каждые 200 ₽ потраченные на мерч начисляется 1 билет в розыгрыш. Автоматически, через 14 дней после доставки.",
      },
    ],
  },
];

// ─── GOLD ───────────────────────────────────────────────────────────────

const GOLD_GROUPS: { title: string; perks: Perk[] }[] = [
  {
    title: "Розыгрыши и билеты",
    perks: [
      {
        icon: Ticket,
        value: "10",
        accent: true,
        label: "билетов в месяц (вместо 3)",
        detail:
          "10 билетов в месяц вместо трёх. По цене Gold это примерно вдвое выгоднее, чем покупать билеты разово.",
      },
    ],
  },
  {
    title: "AI-механик и клуб",
    perks: [
      {
        icon: Sparkles,
        value: "200",
        accent: true,
        label: "Hell AI-вопросов про твой мото в месяц",
        detail:
          "200 запросов к Hell AI — этого хватает, чтобы прогнать диагностику по сезонным проблемам и держать байк в форме без визитов к дилеру.",
      },
      {
        icon: Zap,
        value: "×1.5",
        accent: true,
        label: "Буст XP клуба",
        detail:
          "+50% к опыту за челленджи. Ранги Pit Crew → Road Captain закрываются заметно быстрее.",
      },
    ],
  },
  {
    title: "Мерч",
    perks: [
      {
        icon: Percent,
        value: "10%",
        accent: true,
        label: "Скидка на мерч HELLHOUND",
        detail:
          "10% постоянной скидки в магазине — на всё, включая новые коллекции в день выпуска.",
      },
    ],
  },
];

// ─── PLATINUM ───────────────────────────────────────────────────────────

const PLATINUM_GROUPS: { title: string; perks: Perk[] }[] = [
  {
    title: "Розыгрыши и билеты",
    perks: [
      {
        icon: Ticket,
        value: "30",
        accent: true,
        label: "билетов в месяц (вместо 10)",
        detail:
          "30 билетов каждый месяц. Самая выгодная пачка билетов в клубе.",
      },
      {
        icon: Sparkles,
        accent: true,
        label: "Закрытый Platinum-розыгрыш раз в сезон",
        detail:
          "Раз в 3 месяца — отдельный розыгрыш только для Platinum. Маленький пул участников, крупные лоты (тур, гир, иногда мотоцикл).",
      },
    ],
  },
  {
    title: "Hell AI",
    perks: [
      {
        icon: InfinityIcon,
        value: "∞",
        accent: true,
        label: "Hell AI без ограничений",
        detail:
          "Спрашивай Hell AI сколько надо — без лимита по количеству вопросов. Хоть каждый день перед выездом.",
      },
    ],
  },
  {
    title: "Клуб",
    perks: [
      {
        icon: Zap,
        value: "×2.0",
        accent: true,
        label: "Буст XP клуба",
        detail:
          "Удвоенный опыт за челленджи. Ранг Alpha Hound и Hell Legend становятся реально достижимыми за сезон.",
      },
    ],
  },
  {
    title: "Мерч",
    perks: [
      {
        icon: Percent,
        value: "15%",
        accent: true,
        label: "Скидка на мерч HELLHOUND",
        detail:
          "15% — максимальная скидка в магазине. Действует на всё, включая лимитированный мерч.",
      },
    ],
  },
];

// ─── EXPORT ─────────────────────────────────────────────────────────────

function flat(groups: { perks: Perk[] }[]): Perk[] {
  return groups.flatMap((g) => g.perks);
}

export const TIERS: Tier[] = [
  {
    slug: "silver",
    id: "PASS-01-SILVER",
    name: "Silver",
    price: 490,
    color: "#b8a48a",
    tagline: "Вход в клуб. Билеты, AI-помощник, скидки.",
    forWhom:
      "Для тех, кто катает в удовольствие и хочет участвовать в розыгрышах без переплаты. Минимум обязательств — максимум выгоды против разовых покупок.",
    groups: SILVER_GROUPS,
    perks: flat(SILVER_GROUPS),
  },
  {
    slug: "gold",
    id: "PASS-02-GOLD",
    name: "Gold",
    price: 1290,
    color: "#ffb648",
    inheritsFrom: "Silver",
    tagline: "Серьёзная подписка. Больше билетов и AI-вопросов, скидка 10%.",
    forWhom:
      "Для активных райдеров и коллекционеров мерча. Если хоть раз пожалел, что не успел купить лимитку — Gold решает.",
    groups: GOLD_GROUPS,
    perks: flat(GOLD_GROUPS),
    recommended: true,
  },
  {
    slug: "platinum",
    id: "PASS-03-PLATINUM",
    name: "Platinum",
    price: 2990,
    color: "#e8e4d6",
    inheritsFrom: "Gold",
    tagline: "Максимум. Hell AI на максималках, закрытые розыгрыши, лимитированный мерч в подарок.",
    forWhom:
      "Для тех, кто живёт мото и хочет быть в центре клуба. Самые крупные лоты, реальное влияние на канал, эксклюзивные предметы, недоступные нигде ещё.",
    groups: PLATINUM_GROUPS,
    perks: flat(PLATINUM_GROUPS),
    ultimate: true,
  },
];

export function getTier(slug: string): Tier | undefined {
  return TIERS.find((t) => t.slug === slug);
}
