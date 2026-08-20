// Моки шоу HOUND HUNT. Только визуал: никакой связи с бекендом.
// Позже заменим на реальные заявки (билеты = веса) и призы из админки.

import { apiFetch } from "@/lib/api";
import { RANKS, type RankId } from "@/data/ranks";
import { resolveAssetUrl } from "@/lib/asset-url";
import imgTicket from "@/assets/spin/ticket.webp";
import imgIphone from "@/assets/hunt/prize-iphone17.png";
import imgScooter from "@/assets/hunt/prize-scooter.png";
import av1 from "@/assets/hunt/av1.jpg";
import av2 from "@/assets/hunt/av2.jpg";
import av3 from "@/assets/hunt/av3.jpg";
import av4 from "@/assets/hunt/av4.jpg";
import av5 from "@/assets/hunt/av5.jpg";
import av6 from "@/assets/hunt/av6.jpg";

export type HuntPrize = {
  id: string;
  title: string;
  sub: string;
  img: string;
  /** Порядок вскрытия: 3 → 2 → 1 (главный последний). */
  place: number;
};

export type HuntEntry = {
  /** id заявки (билета-пачки), уникален. */
  id: string;
  nick: string;
  initials: string;
  /** Фото профиля; пока в моках нет — рисуем инициалы. */
  avatarUrl?: string;
  city: string;
  /** Ранг клуба — задаёт цвет рамки аватарки (как в профиле). */
  rankId?: RankId;
  /** Сколько билетов вложил — вес в рулетке и множитель мест. */
  tickets: number;
  /** Кол-во мест в барабане (tickets / порог участия). */
  slots: number;
};

export const HUNT_PRIZES: HuntPrize[] = [
  { id: "p3", place: 3, title: "300 билетов", sub: "", img: imgTicket },
  { id: "p2", place: 2, title: "Электросамокат Ninebot KickScooter ZT3 Pro", sub: "", img: imgScooter },
  { id: "p1", place: 1, title: "Apple iPhone 17 Pro Max 256 ГБ", sub: "Главный приз", img: imgIphone },
];

/** Порог участия: от 10 билетов = 1 место, 20 = ×2, 30 = ×3 и т.д. */
export const HUNT_TICKET_STEP = 10;

const NICKS = [
  "RAZOR", "VOLK", "KRUZ", "SHADOW", "NITRO", "BLADE", "TOXIC", "GHOST",
  "DIESEL", "SPARK", "REBEL", "STORM", "VIPER", "ASH", "HOOK", "RUST",
  "KANO", "DRIFT", "MAGMA", "CRANK", "BOLT", "HAZE", "SLED", "FANG",
  "OMEN", "RIOT", "GRIM", "PULSE", "TREAD", "WRAITH", "SCAR", "CINDER",
];

/** Моковые фото участников: в бою тут будут реальные аватарки из профиля. */
const MOCK_AVATARS = [av1, av2, av3, av4, av5, av6];

const CITIES = [
  "Москва", "СПб", "Казань", "Сочи", "Екатеринбург", "Новосибирск",
  "Краснодар", "Минск", "Тюмень", "Самара",
];

function initialsOf(nick: string) {
  return nick.slice(0, 2);
}

/** Детерминированный псевдорандом, чтобы список не «прыгал» между рендерами. */
function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function makeEntries(count = 24, seed = 1337): HuntEntry[] {
  const r = rnd(seed);
  return Array.from({ length: count }, (_, i) => {
    const nick = NICKS[i % NICKS.length] + (i >= NICKS.length ? `_${Math.floor(i / NICKS.length)}` : "");
    const slots = 1 + Math.floor(r() * 4);
    return {
      id: `e${i + 1}`,
      nick,
      initials: initialsOf(nick),
      avatarUrl: MOCK_AVATARS[i % MOCK_AVATARS.length],
      city: CITIES[Math.floor(r() * CITIES.length)],
      rankId: RANKS[Math.floor(r() * RANKS.length)].id,
      tickets: slots * HUNT_TICKET_STEP,
      slots,
    };
  });
}

/**
 * Реальные участники из базы: 20 случайных юзеров с их ником, городом
 * и аватаркой из профиля. Если бекенд недоступен — падаем на моки,
 * чтобы шоу всё равно крутилось.
 */
export async function fetchHuntEntries(count = 20, seed = 1337): Promise<HuntEntry[]> {
  try {
    const res = await apiFetch<{
      items: {
        id: string;
        nick: string;
        city: string | null;
        avatarUrl: string | null;
        rankId?: string | null;
      }[];
    }>("/api/v1/raffles/hunt-demo-entries");
    const items = (res.items ?? []).slice(0, count);
    if (!items.length) return makeEntries(count, seed);
    const r = rnd(seed);
    return items.map((u, i) => {
      const slots = 1 + Math.floor(r() * 4);
      return {
        id: u.id || `e${i + 1}`,
        nick: (u.nick || "RIDER").toUpperCase(),
        initials: initialsOf((u.nick || "RIDER").toUpperCase()),
        avatarUrl: resolveAssetUrl(u.avatarUrl) ?? undefined,
        city: u.city || "",
        rankId: (RANKS.find((r) => r.id === u.rankId)?.id ?? "rookie") as RankId,
        tickets: slots * HUNT_TICKET_STEP,
        slots,
      };
    });
  } catch {
    return makeEntries(count, seed);
  }
}

/** Стабильный оттенок аватарки по нику (в пределах брендового диапазона). */
export function hueOf(nick: string) {
  let h = 0;
  for (const ch of nick) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Цвета рамки аватарки по рангу участника (как плашка в профиле). */
export function rankColorsOf(entry: HuntEntry) {
  const meta = RANKS.find((r) => r.id === entry.rankId) ?? RANKS[0];
  return { accent: meta.accent, accentSoft: meta.accentSoft };
}

/**
 * Реальный состав барабана из бекенда (`/api/v1/hunt/current`): ники, аватарки,
 * билеты и капсулы участников. Если охоты/ставок ещё нет — крутим демо-состав,
 * чтобы шоу всё равно можно было посмотреть.
 */
export async function fetchHuntPool(count = 20, seed = 1337): Promise<HuntEntry[]> {
  try {
    const { fetchHuntState } = await import("@/lib/hunt-api");
    const state = await fetchHuntState();
    const list = state.entries ?? [];
    if (list.length) {
      return list.slice(0, Math.max(count, list.length)).map((e) => ({
        id: e.id,
        nick: (e.nick || "RIDER").toUpperCase(),
        initials: initialsOf((e.nick || "RIDER").toUpperCase()),
        avatarUrl: resolveAssetUrl(e.avatarUrl) ?? undefined,
        city: e.city || "",
        rankId: (RANKS.find((r) => r.id === e.rankId)?.id ?? "rookie") as RankId,
        tickets: e.tickets,
        slots: Math.max(1, e.capsules),
      }));
    }
  } catch {
    /* нет сети/не авторизован — падаем в демо */
  }
  return fetchHuntEntries(count, seed);
}
