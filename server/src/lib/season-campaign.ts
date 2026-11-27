// План сезонной кампании HellSpin: какие пуши и кому уходят.
// Чистая логика без БД — чтобы тексты и адресатов можно было проверить тестом.
//
// Два сообщения:
//   secret_box       — тем, у кого есть прогресс и активный Platinum.
//   platinum_expired — тем, у кого прогресс есть, а Platinum закончился.

import type { PushPayload } from "./push.js";

export const SECRET_BOX_DAYS = 40;
/** Как говорим о конце сезона в текстах. */
export const SEASON_END_LABEL = "6 января";

export type CampaignUser = {
  userId: string;
  /** Дней активности в активном сезоне. */
  days: number;
  /** Есть активный Platinum прямо сейчас. */
  hasPlatinum: boolean;
  /** Secret Box уже забран. */
  claimed40: boolean;
};

export type CampaignMessage = {
  kind: "secret_box" | "platinum_expired";
  userId: string;
  payload: PushPayload;
};

/** Русская форма слова «день»: 1 день, 2 дня, 5 дней. */
export function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

/**
 * Кому что отправить.
 * Прогресса нет или Secret Box уже забран — не пишем вообще.
 */
export function planSeasonCampaign(users: CampaignUser[]): CampaignMessage[] {
  const out: CampaignMessage[] = [];

  for (const u of users) {
    if (u.days <= 0 || u.claimed40) continue;

    if (!u.hasPlatinum) {
      out.push({
        kind: "platinum_expired",
        userId: u.userId,
        payload: {
          title: "Platinum закончился",
          body: `Прогресс сохранён: ${u.days} из ${SECRET_BOX_DAYS} дней. Сезон до ${SEASON_END_LABEL} — продли Platinum и дойди до Secret Box.`,
          url: "/club/hell-pass",
          tag: "platinum-expired",
        },
      });
      continue;
    }

    const left = SECRET_BOX_DAYS - u.days;
    if (left <= 0) {
      out.push({
        kind: "secret_box",
        userId: u.userId,
        payload: {
          title: "Secret Box твой",
          body: "Набрал 40 дней. Забери коробку с секретными призами в календаре HellSpin и оплати доставку.",
          url: "/club/spin",
          tag: "secret-box-ready",
        },
      });
      continue;
    }

    out.push({
      kind: "secret_box",
      userId: u.userId,
      payload: {
        title: `До Secret Box ${left} ${daysWord(left)}`,
        body: `Сезон HellSpin идёт до ${SEASON_END_LABEL}. Нужно ещё ${left} ${daysWord(left)} с активным Platinum — и в календаре откроется Secret Box с секретными призами от HELLHOUND.`,
        url: "/club/spin",
        tag: "secret-box-progress",
      },
    });
  }

  return out;
}
