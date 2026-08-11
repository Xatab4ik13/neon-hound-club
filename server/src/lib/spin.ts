import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  spinDaily,
  spinPrizes,
  spinSeasons,
  spinSpins,
  spinStreaks,
  spinWinners,
  type SpinPrize,
  type SpinRarity,
  type SpinRewardKind,
} from "../db/schema/spin.js";
import { profiles } from "../db/schema/profile.js";
import { pushSubscriptions } from "../db/schema/push.js";
import { promoCodes } from "../db/schema/promo.js";
import { passPurchases, PASS_CONFIG, PASS_DURATION_DAYS, type PassTier } from "../db/schema/pass.js";
import { getActivePass } from "./pass.js";
import { ticketCredit } from "./tickets.js";
import { awardXp } from "./xp.js";
import { generatePromoCode } from "./promo.js";
import { products } from "../db/schema/shop.js";

/**
 * Движок HellSpin.
 *
 * Правила (согласованы с Hell'ом, см. память проекта / архив плана):
 *  - крутить можно только из PWA, с подтверждённым телефоном и включёнными push;
 *  - спины в сутки: без Pass 1, Silver 2, Gold 4, Platinum 7; use-or-lose, сброс 00:00 МСК;
 *  - множитель тира (Gold ×1.2, Platinum ×1.5) применяется ТОЛЬКО к эпику и легенде;
 *  - ремувка (240), Hell Pass Silver (60) и jackpot (3) — абсолютные пулы на сезон;
 *  - пул кончился → приз молча подменяется (ремувка/Silver → 10 билетов, jackpot → 50 билетов);
 *  - jackpot строго по очереди AirPods → Watch → PS5, шанс растёт по фазам месяца,
 *    в последний день сезона нераскрытые jackpot-призы выдаются принудительно.
 */

const MSK_OFFSET_MIN = 180;

/** Локальная дата МСК в формате YYYY-MM-DD. */
export function mskDate(d = new Date()): string {
  const shifted = new Date(d.getTime() + MSK_OFFSET_MIN * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Начало первого сезона: 11 августа 2026, 00:00 МСК. */
export const SEASON_ANCHOR_UTC = Date.UTC(2026, 7, 11, -3, 0, 0);
/** Длина сезона в днях. */
export const SEASON_DAYS = 30;

/** Индекс текущего сезона (0 — первый). */
function seasonIndex(d = new Date()): number {
  const diff = d.getTime() - SEASON_ANCHOR_UTC;
  return diff <= 0 ? 0 : Math.floor(diff / (SEASON_DAYS * 86_400_000));
}

/** Границы сезона: скользящие окна по 30 дней от якоря. */
export function seasonBounds(d = new Date()): { startsAt: Date; endsAt: Date } {
  const idx = seasonIndex(d);
  const startsAt = new Date(SEASON_ANCHOR_UTC + idx * SEASON_DAYS * 86_400_000);
  const endsAt = new Date(startsAt.getTime() + SEASON_DAYS * 86_400_000);
  return { startsAt, endsAt };
}

/** Ключ сезона — дата его начала (YYYY-MM-DD по МСК). */
export function mskPeriodKey(d = new Date()): string {
  return mskDate(seasonBounds(d).startsAt);
}

export const SPINS_PER_DAY: Record<"none" | PassTier, number> = {
  none: 1,
  silver: 2,
  gold: 4,
  platinum: 7,
};

/** Множитель шанса на эпик/легенду. */
export const TIER_CHANCE_MULT: Record<"none" | PassTier, number> = {
  none: 1,
  silver: 1,
  gold: 1.2,
  platinum: 1.5,
};

interface PrizeConfig {
  code: string;
  title: string;
  rarity: SpinRarity;
  rewardKind: SpinRewardKind;
  rewardValue: number;
  /** Шанс в ppm (1% = 10 000). Для jackpot считается динамически. */
  chancePpm: number;
  limitTotal?: number;
  queueOrder?: number;
  /** Не участвует в колесе, только как подмена при исчерпанном пуле. */
  hidden?: boolean;
}

/** Пул сезона. Коды совпадают с фронтом (src/routes/club.spin.tsx). */
export const PRIZE_CONFIG: PrizeConfig[] = [
  { code: "xp100", title: "100 XP", rarity: "common", rewardKind: "xp", rewardValue: 100, chancePpm: 240_000 },
  { code: "t1", title: "1 билет", rarity: "common", rewardKind: "tickets", rewardValue: 1, chancePpm: 180_000 },
  { code: "xp250", title: "250 XP", rarity: "common", rewardKind: "xp", rewardValue: 250, chancePpm: 140_000 },
  { code: "t3", title: "3 билета", rarity: "rare", rewardKind: "tickets", rewardValue: 3, chancePpm: 100_000 },
  { code: "spin", title: "Бонус-спин", rarity: "rare", rewardKind: "bonus_spin", rewardValue: 1, chancePpm: 80_000 },
  { code: "xp500", title: "500 XP", rarity: "rare", rewardKind: "xp", rewardValue: 500, chancePpm: 50_000 },
  { code: "t10", title: "10 билетов", rarity: "epic", rewardKind: "tickets", rewardValue: 10, chancePpm: 30_000 },
  { code: "promo", title: "Промокод 20%", rarity: "epic", rewardKind: "promo", rewardValue: 20, chancePpm: 30_000 },
  { code: "sticker", title: "Ремувка", rarity: "epic", rewardKind: "merch", rewardValue: 0, chancePpm: 20_000, limitTotal: 240 },
  { code: "silver", title: "Hell Pass Silver", rarity: "legend", rewardKind: "pass", rewardValue: 0, chancePpm: 3_000, limitTotal: 60 },
  { code: "airpods", title: "AirPods 4", rarity: "legend", rewardKind: "jackpot", rewardValue: 0, chancePpm: 0, limitTotal: 1, queueOrder: 1 },
  { code: "watch", title: "Apple Watch SE", rarity: "legend", rewardKind: "jackpot", rewardValue: 0, chancePpm: 0, limitTotal: 1, queueOrder: 2 },
  { code: "ps5", title: "PlayStation 5 Slim", rarity: "legend", rewardKind: "jackpot", rewardValue: 0, chancePpm: 0, limitTotal: 1, queueOrder: 3 },
  // Подмены при пустом пуле — на колесе не показываются.
  { code: "t50", title: "50 билетов", rarity: "epic", rewardKind: "tickets", rewardValue: 50, chancePpm: 0, hidden: true },
];

/** Шанс jackpot по фазам сезона (ppm), day — день сезона 1..30. */
function jackpotPhasePpm(dayOfSeason: number): number {
  if (dayOfSeason <= 15) return 40; // ~0.004%
  if (dayOfSeason <= 25) return 150; // ~0.015%
  return 350; // ~0.035%
}

/* ---------------- Сезон ---------------- */

/** Возвращает активный сезон (30 дней), создавая его вместе с призами. */
export async function ensureCurrentSeason() {
  const periodKey = mskPeriodKey();
  const [existing] = await db
    .select()
    .from(spinSeasons)
    .where(eq(spinSeasons.periodKey, periodKey))
    .limit(1);
  if (existing) return existing;

  const { startsAt, endsAt } = seasonBounds();
  const daysTotal = SEASON_DAYS;

  const [created] = await db
    .insert(spinSeasons)
    .values({ periodKey, startsAt, endsAt, daysTotal, active: true })
    .onConflictDoNothing({ target: spinSeasons.periodKey })
    .returning();

  const season =
    created ??
    (await db.select().from(spinSeasons).where(eq(spinSeasons.periodKey, periodKey)).limit(1))[0]!;

  await db
    .insert(spinPrizes)
    .values(
      PRIZE_CONFIG.map((p) => ({
        seasonId: season.id,
        code: p.code,
        title: p.title,
        rarity: p.rarity,
        rewardKind: p.rewardKind,
        rewardValue: p.rewardValue,
        baseChancePpm: p.chancePpm,
        limitTotal: p.limitTotal ?? null,
        queueOrder: p.queueOrder ?? null,
        active: !p.hidden,
      })),
    )
    .onConflictDoNothing({ target: [spinPrizes.seasonId, spinPrizes.code] });

  return season;
}

/* ---------------- Доступ ---------------- */

export interface SpinAccess {
  phoneVerified: boolean;
  pushEnabled: boolean;
  pwa: boolean;
  granted: boolean;
}

/**
 * Проверка доступа. `pwa` приходит с клиента (display-mode: standalone),
 * но реальным гарантом остаётся push-подписка — без установленного приложения её нет.
 */
export async function checkSpinAccess(userId: string, pwa: boolean): Promise<SpinAccess> {
  const [profile] = await db
    .select({ phoneVerifiedAt: profiles.phoneVerifiedAt })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const [push] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);

  const phoneVerified = !!profile?.phoneVerifiedAt;
  const pushEnabled = !!push;
  return { phoneVerified, pushEnabled, pwa, granted: phoneVerified && pushEnabled && pwa };
}

/* ---------------- Дневной лимит ---------------- */

export async function getTier(userId: string): Promise<"none" | PassTier> {
  const pass = await getActivePass(userId);
  return (pass?.tier as PassTier | undefined) ?? "none";
}

/** Строка дневного счётчика с актуальным лимитом по тиру. */
export async function ensureDaily(userId: string, tier: "none" | PassTier, day = mskDate()) {
  const allowed = SPINS_PER_DAY[tier];
  const [row] = await db
    .insert(spinDaily)
    .values({ userId, spinDate: day, allowed, used: 0, bonus: 0 })
    .onConflictDoUpdate({
      target: [spinDaily.userId, spinDaily.spinDate],
      set: { allowed, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

/* ---------------- Розыгрыш ---------------- */

export class SpinError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

interface Weighted {
  prize: SpinPrize;
  weight: number;
}

/** Доля прошедшего сезона (0..1) — нужна для темпа расхода пулов. */
function seasonProgress(startsAt: Date, endsAt: Date): number {
  const total = endsAt.getTime() - startsAt.getTime();
  const passed = Date.now() - startsAt.getTime();
  return Math.min(1, Math.max(0, passed / total));
}

/**
 * Считает веса призов для конкретного юзера и момента времени.
 * Веса нормализуются при выборе, поэтому базовые проценты сохраняют пропорции.
 */
function buildWeights(prizes: SpinPrize[], tier: "none" | PassTier, season: { startsAt: Date; endsAt: Date }) {
  const mult = TIER_CHANCE_MULT[tier];
  const progress = seasonProgress(season.startsAt, season.endsAt);
  // День сезона (1..30), а не день месяца.
  const day = Math.min(
    SEASON_DAYS,
    Math.floor((Date.now() - season.startsAt.getTime()) / 86_400_000) + 1,
  );
  const jackpotQueue = prizes
    .filter((p) => p.rewardKind === "jackpot" && p.issued < (p.limitTotal ?? 1))
    .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0));
  const currentJackpot = jackpotQueue[0] ?? null;

  const out: Weighted[] = [];
  for (const p of prizes) {
    if (!p.active) continue;
    const isJackpot = p.rewardKind === "jackpot";
    // Из jackpot-очереди активен только текущий приз.
    if (isJackpot && (!currentJackpot || currentJackpot.id !== p.id)) continue;

    let weight = isJackpot ? jackpotPhasePpm(day) : p.baseChancePpm;
    if (weight <= 0) continue;

    // Множитель тира — только на дорогие сектора.
    if (p.rarity === "epic" || p.rarity === "legend") weight *= mult;

    // Абсолютные пулы: пул исчерпан — сектор выключен (подмена делается ниже),
    // расход быстрее графика — придерживаем шанс.
    if (p.limitTotal != null) {
      if (p.issued >= p.limitTotal) continue;
      const pace = p.limitTotal * Math.max(0.05, progress);
      if (p.issued > pace) weight *= 0.25;
    }
    out.push({ prize: p, weight });
  }
  return out;
}

function pickWeighted(items: Weighted[]): Weighted | null {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it;
  }
  return items[items.length - 1] ?? null;
}

/** Гарантия: в последний день сезона нераскрытый jackpot выдаём принудительно. */
function forcedJackpot(prizes: SpinPrize[], season: { endsAt: Date }): SpinPrize | null {
  const hoursLeft = (season.endsAt.getTime() - Date.now()) / 3_600_000;
  if (hoursLeft > 24) return null;
  return (
    prizes
      .filter((p) => p.rewardKind === "jackpot" && p.issued < (p.limitTotal ?? 1))
      .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0))[0] ?? null
  );
}

export interface SpinResult {
  prizeCode: string;
  prizeTitle: string;
  rarity: SpinRarity;
  rewardKind: SpinRewardKind;
  rewardValue: number;
  /** Промокод, если выпал соответствующий приз. */
  promoCode?: string;
  bonusSpin: boolean;
  spinsLeft: number;
  spinsAllowed: number;
  streakDays: number;
}

/** Один прокрут: проверки → розыгрыш → начисление → запись. */
export async function rollSpin(userId: string, pwa: boolean): Promise<SpinResult> {
  const access = await checkSpinAccess(userId, pwa);
  if (!access.granted) {
    throw new SpinError(
      "access_denied",
      "HellSpin доступен только в приложении: установи PWA, подтверди телефон и включи уведомления.",
    );
  }

  const season = await ensureCurrentSeason();
  const tier = await getTier(userId);
  const day = mskDate();
  const daily = await ensureDaily(userId, tier, day);

  // Атомарный инкремент: проверка лимита и списание в одном UPDATE — гонка невозможна.
  // Два одновременных запроса от одного юзера не смогут оба пройти проверку.
  const [dailyAfter] = await db
    .update(spinDaily)
    .set({
      used: sql`${spinDaily.used} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(spinDaily.id, daily.id),
        sql`${spinDaily.used} < ${spinDaily.allowed} + ${spinDaily.bonus}`,
      ),
    )
    .returning();

  if (!dailyAfter) {
    throw new SpinError("no_spins", "Спины на сегодня закончились. Возвращайся завтра.");
  }

  const prizes = await db.select().from(spinPrizes).where(eq(spinPrizes.seasonId, season.id));
  const byCode = new Map(prizes.map((p) => [p.code, p]));

  const forced = forcedJackpot(prizes, season);
  const weights = buildWeights(prizes, tier, season);
  const chosen = forced
    ? { prize: forced, weight: 1_000_000 }
    : pickWeighted(weights);

  // Абсолютный фолбэк: если по какой-то причине сектора нет — 100 XP.
  let prize = chosen?.prize ?? byCode.get("xp100")!;
  let chancePpm = Math.round(chosen?.weight ?? 0);

  // Silver Pass не выдаём тем, у кого уже есть активный пасс — подмена на 10 билетов.
  if (prize.code === "silver") {
    const active = await getActivePass(userId);
    if (active) prize = byCode.get("t10")!;
  }
  // Страховка на случай гонки: пул успел закончиться между чтением и записью.
  if (prize.limitTotal != null && prize.issued >= prize.limitTotal) {
    prize = byCode.get(prize.rewardKind === "jackpot" ? "t50" : "t10")!;
  }

  // Резервируем место в пуле атомарно.
  if (prize.limitTotal != null) {
    const res = await db
      .update(spinPrizes)
      .set({ issued: sql`${spinPrizes.issued} + 1` })
      .where(
        and(
          eq(spinPrizes.id, prize.id),
          sql`${spinPrizes.issued} < ${spinPrizes.limitTotal}`,
        ),
      )
      .returning({ id: spinPrizes.id });
    if (res.length === 0) {
      prize = byCode.get(prize.rewardKind === "jackpot" ? "t50" : "t10")!;
    }
  }

  const isBonus = prize.rewardKind === "bonus_spin";

  const [spinRow] = await db
    .insert(spinSpins)
    .values({
      userId,
      seasonId: season.id,
      prizeId: prize.id,
      prizeCode: prize.code,
      rarity: prize.rarity,
      spinDate: day,
      tier,
      bonus: dailyAfter.used > dailyAfter.allowed,
      rolledChancePpm: chancePpm,
    })
    .returning();

  // Бонус-спин возвращает прокрут: +1 к bonus-лимиту дня.
  if (isBonus) {
    const [bonusRow] = await db
      .update(spinDaily)
      .set({ bonus: sql`${spinDaily.bonus} + 1`, updatedAt: new Date() })
      .where(eq(spinDaily.id, daily.id))
      .returning();
    if (bonusRow) dailyAfter.bonus = bonusRow.bonus;
  }

  // Начисление приза + стрик. Если начисление падает — откатываем списание спина,
  // чтобы юзер не потерял прокрут из-за внутренней ошибки.
  let promoCode: string | undefined;
  let streakDays: number;
  try {
    promoCode = await grantPrize(userId, season.id, spinRow!.id, prize);
    streakDays = await bumpStreak(userId, season.id, day);
  } catch (grantErr) {
    await db
      .update(spinDaily)
      .set({ used: sql`${spinDaily.used} - 1`, updatedAt: new Date() })
      .where(eq(spinDaily.id, daily.id));
    throw grantErr;
  }

  const allowed = dailyAfter.allowed + dailyAfter.bonus;
  return {
    prizeCode: prize.code,
    prizeTitle: prize.title,
    rarity: prize.rarity as SpinRarity,
    rewardKind: prize.rewardKind as SpinRewardKind,
    rewardValue: prize.rewardValue,
    promoCode,
    bonusSpin: isBonus,
    spinsAllowed: allowed,
    spinsLeft: Math.max(0, allowed - dailyAfter.used),
    streakDays,
  };
}

/** Ищет товар «ремувка» в магазине (для промокода-приза). */
async function findRemovkaProductId(): Promise<string | null> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.title} ILIKE '%ремувк%' AND ${products.active} = true`)
    .orderBy(products.createdAt)
    .limit(1);
  return row?.id ?? null;
}

/** Начисление приза. Возвращает промокод, если он был создан. */
async function grantPrize(
  userId: string,
  seasonId: string,
  spinId: string,
  prize: SpinPrize,
): Promise<string | undefined> {
  switch (prize.rewardKind as SpinRewardKind) {
    case "xp":
      await awardXp({
        userId,
        amount: prize.rewardValue,
        source: "spin",
        reason: `HellSpin: ${prize.title}`,
        refType: "spin",
        refId: spinId,
        idempotent: true,
      });
      return undefined;

    case "tickets":
      await ticketCredit({
        userId,
        amount: prize.rewardValue,
        source: "spin",
        reason: `HellSpin: ${prize.title}`,
        refType: "spin",
        refId: spinId,
        idempotent: true,
      });
      return undefined;

    case "promo": {
      const code = generatePromoCode("SPIN");
      await db.insert(promoCodes).values({
        code,
        discountPct: prize.rewardValue,
        userId,
        note: "HellSpin",
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
      });
      return code;
    }

    case "pass":
      await grantPass(userId, "silver", "HellSpin", "spin");
      return undefined;

    case "merch": {
      // Ремувка выдаётся не руками, а персональным промокодом на 100% скидку
      // на этот товар в магазине: юзер оформляет заказ и платит только доставку.
      if (prize.code === "sticker") {
        const productId = await findRemovkaProductId();
        if (productId) {
          const code = generatePromoCode("REM");
          await db.insert(promoCodes).values({
            code,
            discountPct: 100,
            userId,
            productId,
            note: "HellSpin: ремувка",
            expiresAt: new Date(Date.now() + 60 * 86_400_000),
          });
          await db.insert(spinWinners).values({
            userId,
            seasonId,
            spinId,
            source: "spin",
            prizeCode: prize.code,
            prizeTitle: prize.title,
            status: "contacted",
            adminNote: `Промокод ${code} — 100% на ремувку, юзер оплачивает только доставку`,
          });
          return code;
        }
      }
      await db.insert(spinWinners).values({
        userId,
        seasonId,
        spinId,
        source: "spin",
        prizeCode: prize.code,
        prizeTitle: prize.title,
      });
      return undefined;
    }

    case "jackpot":
      await db.insert(spinWinners).values({
        userId,
        seasonId,
        spinId,
        source: "spin",
        prizeCode: prize.code,
        prizeTitle: prize.title,
      });
      return undefined;

    case "bonus_spin":
    default:
      return undefined;
  }
}

/** Выдать Hell Pass как приз: запись покупки на 0₽ + активация на 30 дней. */
export async function grantPass(
  userId: string,
  tier: PassTier,
  reason: string,
  source: "spin" | "streak" | "grant" = "grant",
) {
  const cfg = PASS_CONFIG[tier];
  const now = new Date();
  const active = await getActivePass(userId);
  const base = active?.expiresAt && active.expiresAt > now ? active.expiresAt : now;
  const [row] = await db
    .insert(passPurchases)
    .values({
      userId,
      tier,
      priceRub: 0,
      ticketsGranted: cfg.tickets,
      status: "active",
      source,
      paidAt: now,
      expiresAt: new Date(base.getTime() + PASS_DURATION_DAYS * 86_400_000),
    })
    .returning();
  if (active) {
    await db.update(passPurchases).set({ status: "superseded" }).where(eq(passPurchases.id, active.id));
  }
  if (cfg.tickets > 0) {
    await ticketCredit({
      userId,
      amount: cfg.tickets,
      source: "pass_monthly",
      reason: `${reason}: Hell Pass ${tier} — пакет билетов`,
      refType: "pass_purchase",
      refId: row!.id,
      idempotent: true,
    });
  }
  return row!;
}

/* ---------------- Календарь активности ---------------- */

/** Отмечает день активности в сезоне, возвращает кол-во дней. */
async function bumpStreak(userId: string, seasonId: string, day: string): Promise<number> {
  const [existing] = await db
    .select()
    .from(spinStreaks)
    .where(and(eq(spinStreaks.userId, userId), eq(spinStreaks.seasonId, seasonId)))
    .limit(1);

  if (!existing) {
    const [created] = await db
      .insert(spinStreaks)
      .values({ userId, seasonId, daysCount: 1, lastSpinDate: day })
      .onConflictDoNothing({ target: [spinStreaks.userId, spinStreaks.seasonId] })
      .returning();
    if (created) return created.daysCount;
    return bumpStreak(userId, seasonId, day);
  }

  if (existing.lastSpinDate === day) return existing.daysCount;
  const [updated] = await db
    .update(spinStreaks)
    .set({ daysCount: existing.daysCount + 1, lastSpinDate: day, updatedAt: new Date() })
    .where(eq(spinStreaks.id, existing.id))
    .returning();
  return updated?.daysCount ?? existing.daysCount;
}

export const STREAK_MILESTONES = [10, 20, 30] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

const MILESTONE_TITLE: Record<StreakMilestone, string> = {
  10: "Hell Pass Silver + 5 билетов",
  20: "Носки",
  30: "Hell Pass Gold + 20 билетов",
};

/** Ищет товар «носки» в магазине (для промокода-приза календаря). */
async function findSocksProductId(): Promise<string | null> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.title} ILIKE '%носк%' AND ${products.active} = true`)
    .orderBy(products.createdAt)
    .limit(1);
  return row?.id ?? null;
}

/** Забрать награду календаря активности. Физика уходит в spin_winners. */
export async function claimStreakMilestone(userId: string, milestone: StreakMilestone) {
  const season = await ensureCurrentSeason();
  const [streak] = await db
    .select()
    .from(spinStreaks)
    .where(and(eq(spinStreaks.userId, userId), eq(spinStreaks.seasonId, season.id)))
    .limit(1);
  if (!streak || streak.daysCount < milestone) {
    throw new SpinError("not_reached", "Ещё не накрутил столько дней.");
  }
  const field =
    milestone === 10 ? "claimed10At" : milestone === 20 ? "claimed20At" : "claimed30At";
  if (streak[field]) throw new SpinError("already_claimed", "Награда уже забрана.");

  await db
    .update(spinStreaks)
    .set({ [field]: new Date(), updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(spinStreaks.id, streak.id));

  let promoCode: string | undefined;

  // 10 дней — Hell Pass Silver + 5 билетов.
  if (milestone === 10) {
    await grantPass(userId, "silver", "Календарь активности 10/30", "streak");
    await ticketCredit({
      userId,
      amount: 5,
      source: "spin",
      reason: "Календарь активности 10/30",
      refType: "spin_streak",
      refId: streak.id,
      idempotent: true,
    });
  }

  // 20 дней — носки: персональный промокод на 100% скидку, юзер платит только доставку.
  if (milestone === 20) {
    const productId = await findSocksProductId();
    if (productId) {
      const code = generatePromoCode("SOCK");
      await db.insert(promoCodes).values({
        code,
        discountPct: 100,
        userId,
        productId,
        note: "Календарь активности: носки",
        expiresAt: new Date(Date.now() + 60 * 86_400_000),
      });
      promoCode = code;
    }
    await db.insert(spinWinners).values({
      userId,
      seasonId: season.id,
      source: "streak",
      prizeCode: "socks",
      prizeTitle: "Носки (20/30)",
      status: promoCode ? "contacted" : "pending",
      adminNote: promoCode
        ? `Промокод ${promoCode} — 100% на носки, юзер оплачивает только доставку`
        : "Товар «носки» не найден в магазине — выдать вручную",
    });
  }

  // 30 дней — Hell Pass Gold + 20 билетов.
  if (milestone === 30) {
    await grantPass(userId, "gold", "Календарь активности 30/30", "streak");
    await ticketCredit({
      userId,
      amount: 20,
      source: "spin",
      reason: "Календарь активности 30/30",
      refType: "spin_streak",
      refId: streak.id,
      idempotent: true,
    });
  }

  return { milestone, title: MILESTONE_TITLE[milestone], promoCode };
}

/* ---------------- Состояние для фронта ---------------- */

export async function getSpinState(userId: string, pwa: boolean) {
  const access = await checkSpinAccess(userId, pwa);
  const season = await ensureCurrentSeason();
  const tier = await getTier(userId);
  const day = mskDate();

  const [daily] = await db
    .select()
    .from(spinDaily)
    .where(and(eq(spinDaily.userId, userId), eq(spinDaily.spinDate, day)))
    .limit(1);
  const allowed = SPINS_PER_DAY[tier] + (daily?.bonus ?? 0);
  const used = daily?.used ?? 0;

  const [streak] = await db
    .select()
    .from(spinStreaks)
    .where(and(eq(spinStreaks.userId, userId), eq(spinStreaks.seasonId, season.id)))
    .limit(1);

  const history = await db
    .select({
      prizeCode: spinSpins.prizeCode,
      prizeTitle: spinPrizes.title,
      createdAt: spinSpins.createdAt,
    })
    .from(spinSpins)
    .leftJoin(spinPrizes, eq(spinPrizes.id, spinSpins.prizeId))
    .where(eq(spinSpins.userId, userId))
    .orderBy(sql`${spinSpins.createdAt} desc`)
    .limit(10);

  return {
    access,
    tier,
    season: {
      periodKey: season.periodKey,
      daysTotal: season.daysTotal,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
    },
    spins: { allowed, used, left: Math.max(0, allowed - used) },
    streak: {
      days: streak?.daysCount ?? 0,
      claimed: [
        ...(streak?.claimed10At ? [10] : []),
        ...(streak?.claimed20At ? [20] : []),
        ...(streak?.claimed30At ? [30] : []),
      ],
    },
    history: history.map((h) => ({
      prizeCode: h.prizeCode,
      title: h.prizeTitle ?? h.prizeCode,
      at: h.createdAt.toISOString(),
    })),
  };
}
