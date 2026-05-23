// Публичные профили участников клуба. Источник для /club/u/$nick и для
// карточек комментаторов в ленте. Ключ — slug (lowercase nick).

import { type RankId } from "./ranks";

export type PublicUserRole = "owner" | "team" | "rider";

export type PublicWin = { id: string; title: string; date: string };

export type PublicUser = {
  /** URL-slug = lowercase nick. */
  slug: string;
  /** Отображаемый ник (в верхнем регистре или как у Hell — латиницей). */
  nick: string;
  initials: string;
  rank: RankId;
  /** Доля прогресса XP внутри текущего ранга (0..100). */
  xpPct: number;
  role: PublicUserRole;
  /** Единственный аккаунт блогера-владельца клуба (Hell). Включает аватар-плашку и красный чип. */
  isBlogger?: boolean;
  city?: string;
  bike?: string;
  joined: string;
  /** Дата для og/seo, формат «март 2024». */
  badgeIds: string[];
  wins: PublicWin[];
  /** Аватар — пока инициалы; задел под загруженные картинки. */
  avatarUrl?: string;
};

export const PUBLIC_USERS: Record<string, PublicUser> = {
  hell: {
    slug: "hell",
    nick: "Hell",
    initials: "H",
    rank: "hell-legend",
    xpPct: 100,
    role: "owner",
    isBlogger: true,
    city: "Москва",
    bike: "Yamaha R1 / Kawasaki H2",
    joined: "май 2024",
    badgeIds: ["founder-s01", "first-raffle", "hells-howl", "stream-squad"],
    wins: [],
  },
  team_pavel: {
    slug: "team_pavel",
    nick: "Pavel",
    initials: "PV",
    rank: "hell-legend",
    xpPct: 100,
    role: "team",
    city: "Москва",
    bike: "Honda CBR1000RR",
    joined: "май 2024",
    badgeIds: ["founder-s01", "stream-squad", "track-day"],
    wins: [],
  },
  asphalt_dog: {
    slug: "asphalt_dog",
    nick: "ASPHALT_DOG",
    initials: "AS",
    rank: "alpha-hound",
    xpPct: 62,
    role: "rider",
    city: "Москва",
    bike: "Yamaha MT-09",
    joined: "март 2024",
    badgeIds: ["founder-s01", "gold-s01", "first-win", "stream-squad", "voter", "garage-started"],
    wins: [{ id: "w1", title: "Перчатки HELLHOUND v1", date: "янв 2025" }],
  },
  tankslapper: {
    slug: "tankslapper",
    nick: "tankslapper",
    initials: "TS",
    rank: "road-captain",
    xpPct: 38,
    role: "rider",
    city: "СПб",
    bike: "Yamaha R6",
    joined: "июль 2024",
    badgeIds: ["gold-s01", "stream-squad", "voter"],
    wins: [],
  },
  vasya_pit: {
    slug: "vasya_pit",
    nick: "vasya_pit",
    initials: "VP",
    rank: "pit-crew",
    xpPct: 71,
    role: "rider",
    city: "Казань",
    bike: "Honda CB650R",
    joined: "сентябрь 2024",
    badgeIds: ["silver-s01"],
    wins: [],
  },
  hell_legend_01: {
    slug: "hell_legend_01",
    nick: "hell_legend_01",
    initials: "HL",
    rank: "hell-legend",
    xpPct: 100,
    role: "rider",
    city: "Краснодар",
    bike: "Ducati Panigale V4",
    joined: "май 2024",
    badgeIds: ["founder-s01", "platinum-s01", "first-win", "ticket-hunter", "merch-hound"],
    wins: [
      { id: "w1", title: "Худи HELLHOUND S01", date: "июль 2025" },
      { id: "w2", title: "Шлем AGV", date: "март 2025" },
    ],
  },
  vip_rider: {
    slug: "vip_rider",
    nick: "vip_rider",
    initials: "VR",
    rank: "hell-legend",
    xpPct: 100,
    role: "rider",
    city: "Москва",
    bike: "BMW S1000RR",
    joined: "июнь 2024",
    badgeIds: ["founder-s01", "platinum-s01", "gold-s01", "preorder-pioneer"],
    wins: [{ id: "w1", title: "Кепка Race Pass", date: "октябрь 2025" }],
  },
  rookie_max: {
    slug: "rookie_max",
    nick: "rookie_max",
    initials: "RM",
    rank: "rookie",
    xpPct: 22,
    role: "rider",
    city: "Нижний Новгород",
    bike: "KTM Duke 390",
    joined: "март 2026",
    badgeIds: ["garage-started"],
    wins: [],
  },
  moto_anya: {
    slug: "moto_anya",
    nick: "moto_anya",
    initials: "MA",
    rank: "road-captain",
    xpPct: 55,
    role: "rider",
    city: "Москва",
    bike: "Kawasaki Z900",
    joined: "август 2024",
    badgeIds: ["gold-s01", "merch-hound"],
    wins: [],
  },
  garage_77: {
    slug: "garage_77",
    nick: "garage_77",
    initials: "G7",
    rank: "pit-crew",
    xpPct: 44,
    role: "rider",
    city: "Москва",
    bike: "Suzuki GSX-S750",
    joined: "октябрь 2024",
    badgeIds: ["silver-s01", "garage-started"],
    wins: [],
  },
  wheelie_kid: {
    slug: "wheelie_kid",
    nick: "wheelie_kid",
    initials: "WK",
    rank: "alpha-hound",
    xpPct: 81,
    role: "rider",
    city: "Екатеринбург",
    bike: "Yamaha MT-10",
    joined: "июнь 2024",
    badgeIds: ["gold-s01", "ticket-hunter", "voter"],
    wins: [{ id: "w1", title: "Перчатки HELLHOUND v2", date: "сентябрь 2025" }],
  },
  kuzya_msk: {
    slug: "kuzya_msk",
    nick: "kuzya_msk",
    initials: "KZ",
    rank: "rookie",
    xpPct: 12,
    role: "rider",
    city: "Москва",
    bike: "Yamaha R6",
    joined: "апрель 2026",
    badgeIds: ["garage-started"],
    wins: [],
  },
  captain_volk: {
    slug: "captain_volk",
    nick: "captain_volk",
    initials: "CV",
    rank: "road-captain",
    xpPct: 67,
    role: "rider",
    city: "Тверь",
    bike: "Honda Africa Twin",
    joined: "июль 2024",
    badgeIds: ["gold-s01", "track-day", "voter"],
    wins: [],
  },
};

export function getUser(slug: string): PublicUser | undefined {
  return PUBLIC_USERS[slug.toLowerCase()];
}

/** Slug владельца текущей сессии — пока статический. */
export const ME_SLUG = "asphalt_dog";
