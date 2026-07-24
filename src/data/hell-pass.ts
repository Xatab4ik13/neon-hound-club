// Каталог тиров Hell Pass. Используется и на /hell-pass, и на /club/hell-pass.

import {
  PlumpTicket,
  PlumpAI,
  PlumpSticker,
  PlumpStore,
  PlumpComment,
  PlumpGift,
  PlumpMelt,
  PlumpDiamond,
  type LucideIcon,
} from "@/components/ui/icons";

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
    title: "Билеты",
    perks: [
      {
        icon: PlumpTicket,
        value: "3",
        label: "билета в месяц",
        detail:
          "Каждый месяц на счёт падает 3 билета. Можно потратить на один розыгрыш или раскидать по разным. Билеты копятся и не сгорают.",
      },
    ],
  },
  {
    title: "Hell AI и клуб",
    perks: [
      {
        icon: PlumpAI,
        value: "15",
        label: "Hell AI-вопросов про твой мото в сутки",
        detail:
          "Hell AI знает твой байк из профиля. 15 вопросов в день — от «что за стук» до «какое масло». В 5 раз больше бесплатных 3/день.",
      },
      {
        icon: PlumpMelt,
        value: "×1.25",
        label: "Буст XP клуба",
        detail:
          "Любая активность в клубе приносит на 25% больше очков опыта за челленджи. Быстрее растёт ранг — быстрее открываются кастомизации профиля.",
      },
    ],
  },
  {
    title: "Стикеры",
    perks: [
      {
        icon: PlumpSticker,
        label: "Все стикерпаки клуба — бесплатно",
        detail:
          "Полный доступ ко всем стикерпакам HELLHOUND, включая платные (Special, Hell Minions и все будущие). Действует, пока Silver активен.",
      },
    ],
  },
  {
    title: "Мерч",
    perks: [
      {
        icon: PlumpStore,
        value: "5%",
        label: "Скидка на мерч HELLHOUND",
        detail:
          "Стандартная скидка в магазине. Считается до промокодов и распродаж — не складывается с ними, берётся максимальная.",
      },
    ],
  },
];

// ─── GOLD ───────────────────────────────────────────────────────────────

const GOLD_GROUPS: { title: string; perks: Perk[] }[] = [
  {
    title: "Билеты",
    perks: [
      {
        icon: PlumpTicket,
        value: "10",
        accent: true,
        label: "билетов в месяц (вместо 3)",
        detail:
          "10 билетов в месяц вместо трёх. По цене Gold это примерно вдвое выгоднее, чем покупать билеты разово.",
      },
    ],
  },
  {
    title: "Hell AI и клуб",
    perks: [
      {
        icon: PlumpAI,
        value: "40",
        accent: true,
        label: "Hell AI-вопросов про твой мото в сутки",
        detail:
          "40 запросов в день к Hell AI — этого хватает, чтобы прогнать диагностику по сезонным проблемам и держать байк в форме без визитов к дилеру.",
      },
      {
        icon: PlumpMelt,
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
        icon: PlumpStore,
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
    title: "VIP",
    perks: [
      {
        icon: PlumpComment,
        accent: true,
        label: "VIP-чат с Hell",
        detail:
          "Прямой чат с Hell. Только для Platinum — маленький круг, никакого шума. Пиши свой вопрос — Hell отвечает лично.",
      },
    ],
  },
  {
    title: "Билеты и розыгрыши",
    perks: [
      {
        icon: PlumpTicket,
        value: "30",
        accent: true,
        label: "билетов в месяц (вместо 10)",
        detail:
          "30 билетов каждый месяц. Самая выгодная пачка билетов в клубе.",
      },
      {
        icon: PlumpGift,
        accent: true,
        label: "Закрытый Platinum-розыгрыш раз в месяц",
        detail:
          "Раз в месяц — отдельный розыгрыш только для Platinum. Маленький пул участников, крупные лоты.",
      },
    ],
  },
  {
    title: "Hell AI и клуб",
    perks: [
      {
        icon: PlumpAI,
        value: "∞",
        accent: true,
        label: "Hell AI без ограничений",
        detail:
          "Спрашивай Hell AI сколько надо — без лимита по количеству вопросов. Хоть каждый день перед выездом.",
      },
      {
        icon: PlumpMelt,
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
        icon: PlumpStore,
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
    color: "#B6FF3C",
    tagline: "Вход в клуб. Билеты, Hell AI, все стикерпаки бесплатно, скидка 5%.",
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
    color: "#FF8A3C",
    inheritsFrom: "Silver",
    tagline: "Больше билетов и Hell AI-вопросов, скидка 10%. Все стикерпаки — с Silver.",
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
    price: 2190,
    color: "#F000C0",
    inheritsFrom: "Gold",
    tagline: "VIP-чат с Hell, Hell AI без лимита, закрытый розыгрыш, скидка 15%.",
    forWhom:
      "Для тех, кто живёт мото и хочет быть в центре клуба. Прямой чат с Hell, самые крупные лоты и эксклюзивные розыгрыши только для Platinum.",
    groups: PLATINUM_GROUPS,
    perks: flat(PLATINUM_GROUPS),
    ultimate: true,
  },
];

export function getTier(slug: string): Tier | undefined {
  return TIERS.find((t) => t.slug === slug);
}
