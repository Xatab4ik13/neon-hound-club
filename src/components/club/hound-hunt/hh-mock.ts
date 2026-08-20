// Моки шоу HOUND HUNT. Только визуал: никакой связи с бекендом.
// Позже заменим на реальные заявки (билеты = веса) и призы из админки.

import { apiFetch } from "@/lib/api";
import { resolveAssetUrl } from "@/lib/asset-url";
import imgAirpods from "@/assets/spin/airpods.webp";
import av1 from "@/assets/hunt/av1.jpg";
import av2 from "@/assets/hunt/av2.jpg";
import av3 from "@/assets/hunt/av3.jpg";
import av4 from "@/assets/hunt/av4.jpg";
import av5 from "@/assets/hunt/av5.jpg";
import av6 from "@/assets/hunt/av6.jpg";
import imgPs5 from "@/assets/spin/ps5.webp";

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
  /** Сколько билетов вложил — вес в рулетке и множитель мест. */
  tickets: number;
  /** Кол-во мест в барабане (tickets / порог участия). */
  slots: number;
};

export const HUNT_PRIZES: HuntPrize[] = [
  { id: "p3", place: 3, title: "AirPods 4", sub: "3-е место", img: imgAirpods },
  { id: "p1", place: 1, title: "PlayStation 5 Slim", sub: "Главный приз", img: imgPs5 },
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
      items: { id: string; nick: string; city: string | null; avatarUrl: string | null }[];
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
