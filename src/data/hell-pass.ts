// Каталог тиров Hell Pass. Используется и на /club/hell-pass (список),
// и на /club/hell-pass/$tier (детальная страница с полным описанием).

import {
  Ticket,
  Percent,
  Sparkles,
  Zap,
  BadgeCheck,
  GraduationCap,
  MessageSquare,
  Vote,
  Trophy,
  ShoppingBag,
  Coins,
  Crown,
  Gift,
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
        value: "20",
        label: "AI-вопросов про твой мото в месяц",
        detail:
          "AI знает твой байк из профиля. Можно задать 20 вопросов в месяц — от «что за стук» до «какое масло».",
      },
      {
        icon: MessageSquare,
        label: "Комментарии в ленте клуба",
        detail:
          "Без подписки лента работает только на чтение. Silver открывает комментарии под постами Hell и других райдеров.",
      },
      {
        icon: Vote,
        value: "×1",
        label: "Голос за следующее видео",
        detail:
          "Раз в неделю Hell выкладывает на голосование 2–3 темы для следующего ролика. Silver даёт обычный голос.",
      },
      {
        icon: Zap,
        value: "×1.25",
        label: "Буст XP клуба",
        detail:
          "Любая активность в клубе приносит на 25% больше очков опыта. Быстрее растёт ранг — быстрее значки.",
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
  {
    title: "Коллекция",
    perks: [
      {
        icon: BadgeCheck,
        accent: true,
        label: "Месячный значок «Silver S01» в коллекцию",
        detail:
          "Каждый месяц подписки — новый дизайн значка Silver со штампом месяца. Пропустил месяц — значок уже не получить.",
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
      {
        icon: Trophy,
        value: "+3",
        accent: true,
        label: "бонусных билета в месячный эксклюзив",
        detail:
          "Поверх 10 обычных — ещё 3 билета именно в закрытый розыгрыш месяца. Эти 3 нельзя потратить на другие лоты.",
      },
    ],
  },
  {
    title: "AI-механик и клуб",
    perks: [
      {
        icon: Sparkles,
        value: "100",
        accent: true,
        label: "AI-вопросов про твой мото в месяц",
        detail:
          "100 запросов к AI-механику — этого хватает, чтобы прогнать диагностику по сезонным проблемам и держать байк в форме без визитов к дилеру.",
      },
      {
        icon: Vote,
        value: "×2",
        label: "Вес голоса за следующее видео",
        detail:
          "Голос Gold-подписчика считается за два. Реально влияешь на то, что Hell снимет следующим.",
      },
      {
        icon: Zap,
        value: "×1.5",
        accent: true,
        label: "Буст XP клуба",
        detail:
          "+50% к опыту за любую активность. Ранги Pit Crew → Road Captain закрываются заметно быстрее.",
      },
    ],
  },
  {
    title: "Мерч и приоритет",
    perks: [
      {
        icon: Percent,
        value: "10%",
        accent: true,
        label: "Скидка на мерч HELLHOUND",
        detail:
          "10% постоянной скидки в магазине — на всё, включая новые коллекции в день выпуска.",
      },
      {
        icon: ShoppingBag,
        accent: true,
        label: "Предзаказ мерча до общего старта",
        detail:
          "За 48 часов до публичного старта продаж новые модели открываются для Gold. На лимитированный мерч — почти гарантия купить.",
      },
    ],
  },
  {
    title: "Коллекция",
    perks: [
      {
        icon: BadgeCheck,
        accent: true,
        label: "Значок «Gold S01» + редкий значок месяца за активность",
        detail:
          "Сезонный значок Gold каждый месяц + дополнительный редкий значок, если выполнил месячные XP-цели клуба.",
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
        value: "25",
        accent: true,
        label: "билетов в месяц (вместо 10)",
        detail:
          "25 билетов каждый месяц. По цене это самая выгодная пачка билетов в клубе.",
      },
      {
        icon: Trophy,
        value: "+10",
        accent: true,
        label: "бонусных билетов в месячный эксклюзив",
        detail:
          "10 дополнительных билетов в закрытый розыгрыш месяца — кратно увеличивают шанс выиграть редкий лот.",
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
    title: "AI без ограничений",
    perks: [
      {
        icon: InfinityIcon,
        value: "∞",
        accent: true,
        label: "AI-вопросов про мото — безлимит",
        detail:
          "Спрашиваешь сколько надо. Сложные диагностики, разбор отчётов с дилера, советы по апгрейдам — без счётчика.",
      },
    ],
  },
  {
    title: "Клуб и влияние",
    perks: [
      {
        icon: Vote,
        value: "×5",
        label: "Вес голоса за следующее видео",
        detail:
          "Один голос Platinum = пять обычных. Реальный вес в решении, куда движется канал.",
      },
      {
        icon: Zap,
        value: "×2.0",
        accent: true,
        label: "Буст XP клуба",
        detail:
          "Удвоенный опыт. Ранг Alpha Hound и Hell Legend становятся реально достижимыми за сезон.",
      },
    ],
  },
  {
    title: "Мерч и подарки",
    perks: [
      {
        icon: Percent,
        value: "15%",
        accent: true,
        label: "Скидка на мерч HELLHOUND",
        detail:
          "15% — максимальная скидка в магазине. Действует на всё, включая лимитированный мерч.",
      },
      {
        icon: Gift,
        value: "1 / сезон",
        accent: true,
        label: "Лимитированный мерч в подарок",
        detail:
          "Раз в сезон — отдельный лимитированный предмет, который доступен только Platinum-подписчикам. В магазине его не купить.",
      },
    ],
  },
  {
    title: "Коллекция",
    perks: [
      {
        icon: Crown,
        accent: true,
        label: "Значок «Platinum S01» + Founder в первый месяц",
        detail:
          "Сезонный Legendary-значок Platinum + Mythic-значок Founder, если оформил подписку в первый месяц запуска. Founder выдаётся один раз — потом исчезает навсегда.",
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
    tagline: "Серьёзная подписка. Больше билетов, голос вдвое, ранний доступ к мерчу.",
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
    tagline: "Максимум. Безлимит AI, закрытые розыгрыши, сезонный мерч в подарок.",
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
