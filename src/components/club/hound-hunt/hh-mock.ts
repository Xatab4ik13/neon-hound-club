// Данные шоу HELL HUNT: типы, призы по умолчанию и реальный состав барабана
// из бекенда. Демо/моковых участников здесь больше нет.

import { RANKS, type RankId } from "@/data/ranks";
import { resolveAssetUrl } from "@/lib/asset-url";
import imgTicket from "@/assets/spin/ticket.webp";
import imgIphone from "@/assets/hunt/prize-iphone17.png";
import imgScooter from "@/assets/hunt/prize-scooter.png";

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
  /** Фото профиля; если нет — рисуем инициалы. */
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
 * билеты и капсулы участников. Ставок нет — возвращаем пустой список, никаких
 * демо-участников зрителю не показываем.
 */
export async function fetchHuntPool(): Promise<HuntEntry[]> {
  try {
    const { fetchHuntState } = await import("@/lib/hunt-api");
    const state = await fetchHuntState();
    return (state.entries ?? []).map((e) => ({
      id: e.id,
      nick: (e.nick || "RIDER").toUpperCase(),
      initials: (e.nick || "RIDER").slice(0, 2).toUpperCase(),
      avatarUrl: resolveAssetUrl(e.avatarUrl) ?? undefined,
      city: e.city || "",
      rankId: (RANKS.find((r) => r.id === e.rankId)?.id ?? "rookie") as RankId,
      tickets: e.tickets,
      slots: Math.max(1, e.capsules),
    }));
  } catch {
    return [];
  }
}
