// Каталог значков HELLHOUND. Логика как в CS: коллекция, редкости, "закреплённые"
// слоты витрины. Все SVG-марки рисуются внутри `<BadgeIcon />` по `id`.

export type BadgeRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

export type BadgeCategory =
  | "rank"        // выдаётся при достижении ранга
  | "club"        // базовая клубная активность
  | "pass"        // месячный дроп Hell Pass (сезонный)
  | "event"       // эвенты, стримы, тракдеи
  | "achievement" // достижения с XP/тиражами
  | "founder";    // ультра-редкие, первые месяцы

export type Badge = {
  id: string;
  /** Короткое имя — рисуется ПОД значком. */
  name: string;
  /** Развёрнутое описание — в тултипе/детали. */
  description: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  /** Месяц выпуска (для сезонных дропов Pass), напр. "05 / 26". */
  issue?: string;
  owned: boolean;
  /** Сколько таких значков уже выдано — для ощущения редкости. */
  mintedOf?: number;
};

export const RARITY: Record<
  BadgeRarity,
  { label: string; color: string; soft: string }
> = {
  common: {
    label: "Common",
    color: "#8a8a8a",
    soft: "rgba(138,138,138,0.25)",
  },
  rare: {
    label: "Rare",
    color: "#4ea1ff",
    soft: "rgba(78,161,255,0.28)",
  },
  epic: {
    label: "Epic",
    color: "#b48dff",
    soft: "rgba(180,141,255,0.3)",
  },
  legendary: {
    label: "Legendary",
    color: "#ffb648",
    soft: "rgba(255,182,72,0.32)",
  },
  mythic: {
    label: "Mythic",
    color: "#ff0a78",
    soft: "rgba(255,10,120,0.32)",
  },
};

export const BADGES: Badge[] = [
  // ── Founder / монетизация ──────────────────────────────────────────────
  {
    id: "founder-s01",
    name: "Founder",
    description:
      "Купил Hell Pass в первый месяц запуска. Выдаётся один раз — потом исчезает навсегда.",
    rarity: "mythic",
    category: "founder",
    issue: "05 / 26",
    owned: true,
    mintedOf: 138,
  },
  {
    id: "platinum-s01",
    name: "Platinum S01",
    description:
      "Месячный дроп Platinum-подписки. Меняется каждый месяц — старый остаётся в коллекции навсегда.",
    rarity: "legendary",
    category: "pass",
    issue: "05 / 26",
    owned: false,
  },
  {
    id: "gold-s01",
    name: "Gold S01",
    description:
      "Месячный дроп Gold-подписки. Каждый месяц — новый дизайн.",
    rarity: "epic",
    category: "pass",
    issue: "05 / 26",
    owned: true,
    mintedOf: 412,
  },
  {
    id: "silver-s01",
    name: "Silver S01",
    description:
      "Месячный дроп Silver-подписки. Лёгкий вход в коллекцию.",
    rarity: "rare",
    category: "pass",
    issue: "05 / 26",
    owned: false,
  },

  // ── Достижения ─────────────────────────────────────────────────────────
  {
    id: "first-win",
    name: "First Win",
    description: "Выиграл первый розыгрыш. Поздравляем.",
    rarity: "epic",
    category: "achievement",
    owned: true,
    mintedOf: 207,
  },
  {
    id: "hells-howl",
    name: "Hell's Howl",
    description: "Выиграл главный мото-розыгрыш HELLHOUND. Единичные экземпляры.",
    rarity: "mythic",
    category: "achievement",
    owned: false,
  },
  {
    id: "ticket-hunter",
    name: "Ticket Hunter",
    description: "Накопил 50+ билетов одновременно.",
    rarity: "rare",
    category: "achievement",
    owned: false,
  },
  {
    id: "ai-whisperer",
    name: "AI Whisperer",
    description: "100 вопросов к AI-механику. Машину знаешь лучше дилера.",
    rarity: "rare",
    category: "achievement",
    owned: false,
  },
  {
    id: "merch-hound",
    name: "Merch Hound",
    description: "5 заказов мерча. Гардероб собран.",
    rarity: "rare",
    category: "achievement",
    owned: false,
  },
  {
    id: "preorder-pioneer",
    name: "Pre-order Pioneer",
    description: "Оформил предзаказ на мерч до общего старта.",
    rarity: "epic",
    category: "achievement",
    owned: false,
  },
  {
    id: "first-raffle",
    name: "First Raffle",
    description:
      "Участвовал в самом первом розыгрыше HELLHOUND. Выдаётся один раз — позже получить нельзя.",
    rarity: "epic",
    category: "achievement",
    issue: "05 / 26",
    owned: false,
    mintedOf: 0,
  },

  // ── Ранги ─────────────────────────────────────────────────────────────
  {
    id: "rank-rookie",
    name: "Rookie",
    description: "Стартовый ранг. Выдаётся всем, кто завёл профиль в клубе.",
    rarity: "common",
    category: "rank",
    owned: true,
    mintedOf: 3425,
  },
  {
    id: "rank-pit-crew",
    name: "Pit Crew",
    description: "Доехал до ранга Pit Crew — 2 000 XP за активность в клубе.",
    rarity: "common",
    category: "rank",
    owned: false,
  },
  {
    id: "rank-road-captain",
    name: "Road Captain",
    description: "Ранг Road Captain — 4 000 XP. Уже не новичок.",
    rarity: "rare",
    category: "rank",
    owned: false,
  },
  {
    id: "rank-alpha-hound",
    name: "Alpha Hound",
    description: "Ранг Alpha Hound — 6 000 XP. Один из старших в стае.",
    rarity: "epic",
    category: "rank",
    owned: false,
  },
  {
    id: "rank-hell-legend",
    name: "Hell Legend",
    description: "Максимальный ранг по активности — 8 000 XP. Легенда клуба.",
    rarity: "legendary",
    category: "rank",
    owned: false,
  },



  // ── Клуб ──────────────────────────────────────────────────────────────
  {
    id: "garage-started",
    name: "Garage Started",
    description: "Добавил первый байк в гараж.",
    rarity: "common",
    category: "club",
    owned: true,
  },
  {
    id: "voter",
    name: "Voter ×10",
    description: "Проголосовал за следующее видео 10 раз.",
    rarity: "common",
    category: "club",
    owned: true,
  },

  // ── Эвенты ────────────────────────────────────────────────────────────
  {
    id: "stream-squad",
    name: "Stream Squad",
    description: "Был на закрытом стриме Hell. Раздаётся только в эфире.",
    rarity: "rare",
    category: "event",
    issue: "04 / 26",
    owned: true,
    mintedOf: 619,
  },
  {
    id: "track-day",
    name: "Track Day",
    description: "Засветился на оффлайн-тракдее клуба.",
    rarity: "epic",
    category: "event",
    owned: false,
  },
];

/** Какие 4 закреплены в витрине профиля. Хранится здесь, чтобы потом легко
 * вынести в персистентное хранилище. */
export const PINNED_BADGE_IDS = [
  "founder-s01",
  "first-win",
  "gold-s01",
  "stream-squad",
];
