// Сборка system prompt + контекста гаража юзера.
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { aiSettings } from "../db/schema/hell-ai.js";
import { bikes, profiles } from "../db/schema/profile.js";

export async function loadAiSettings() {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1);
  if (row) return row;
  // первый запуск: вставляем дефолт
  const [created] = await db
    .insert(aiSettings)
    .values({ id: 1, systemPrompt: DEFAULT_PROMPT, model: "openai/gpt-5" })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [reread] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1);
  return reread!;
}

const DEFAULT_PROMPT = `Ты — AI-механик клуба HELLHOUND Racing. Помогаешь Псам с их мото.

Тон: на «ты», коротко, без воды и эмодзи. Без морализаторства. Технические единицы СИ (Н·м, мл, °C, км/ч). Обращение «Псы» — ок.

Тюнинг без ограничений (де-кат, прямоток, прошивка) — обсуждаем как нормальную тему. Конкретные запчасти, масла, артикулы — называй, если уверен.

Темы вне мото (код, домашка, юр/мед) — короткий отказ: «Это не моя тема. Я по мото».`;

export type GarageBike = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  engineCc: number | null;
  mileage: string | null;
  mods: string[];
};

/** Все мото юзера, основной — первым. */
export async function loadUserGarage(userId: string): Promise<GarageBike[]> {
  const rows = await db
    .select({
      id: bikes.id,
      brand: bikes.brand,
      model: bikes.model,
      year: bikes.year,
      engineCc: bikes.engineCc,
      mileage: bikes.mileage,
      mods: bikes.mods,
      isPrimary: bikes.isPrimary,
    })
    .from(bikes)
    .where(eq(bikes.userId, userId));
  return rows
    .sort((a, b) => (a.isPrimary === b.isPrimary ? 0 : a.isPrimary ? -1 : 1))
    .map((b) => ({
      id: b.id,
      brand: b.brand,
      model: b.model,
      year: b.year,
      engineCc: b.engineCc,
      mileage: b.mileage,
      mods: Array.isArray(b.mods) ? b.mods : [],
    }));
}

export async function loadUserNick(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ nick: profiles.userId }) // профайл может быть не создан — возьмём из users отдельно
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row ? null : null;
}

function bikeLine(b: GarageBike): string {
  const year = b.year ? ` ${b.year}` : "";
  const cc = b.engineCc ? `, ${b.engineCc} cc` : "";
  const mi = b.mileage ? `, пробег ${b.mileage}` : "";
  const mods = b.mods.length ? `, моды: ${b.mods.join(", ")}` : "";
  return `— ${b.brand} ${b.model}${year}${cc}${mi}${mods}`;
}

/** Полный system prompt: база из настроек + гараж + banned + подпись. */
export function buildSystemPrompt(opts: {
  basePrompt: string;
  signature: string | null;
  bannedTopics: string | null;
  garage: GarageBike[];
  activeBikeId?: string | null;
  isStaff?: boolean;
}): string {
  const parts: string[] = [opts.basePrompt.trim()];

  if (opts.garage.length === 0) {
    parts.push(
      opts.isStaff
        ? "\n[GARAGE]\nУ юзера сейчас нет байка в гараже. Не отправляй его заполнять профиль. Отвечай по делу и, если для точности нужно, сначала уточни модель, год и симптомы прямо в диалоге.\n[/GARAGE]"
        : "\n[GARAGE]\nУ юзера пока нет мото в гараже — сначала попроси добавить через раздел Гараж, чтобы советы были по делу.\n[/GARAGE]",
    );
  } else {
    const active = opts.activeBikeId
      ? opts.garage.find((b) => b.id === opts.activeBikeId)
      : opts.garage[0];
    const lines = opts.garage.map(bikeLine).join("\n");
    parts.push(
      `\n[GARAGE]\n${lines}\nАктивный для этого вопроса: ${active ? `${active.brand} ${active.model}` : "не выбран"}\n[/GARAGE]`,
    );
  }

  if (opts.bannedTopics?.trim()) {
    parts.push(`\n[BANNED_TOPICS]\n${opts.bannedTopics.trim()}\n[/BANNED_TOPICS]`);
  }

  if (opts.signature?.trim()) {
    parts.push(`\nВ конце каждого ответа добавляй: «${opts.signature.trim()}»`);
  }

  return parts.join("\n");
}

/** Лимит вопросов на тир за период действия Pass (30 дней). */
export type AiLimits = {
  silver: number;
  gold: number;
  platinum: number;
};

/**
 * Лимиты ОСНОВНОЙ модели тира.
 * silver/gold — после лимита /ask возвращает 429.
 * platinum — после лимита /ask продолжает работать на быстрой модели (без счётчика).
 */
export const AI_LIMITS_DEFAULT: AiLimits = {
  silver: 30,
  gold: 200,
  platinum: 300,
};

/**
 * Модель по тиру. Для silver/gold — быстрая. Для platinum — умная,
 * после превышения лимита роут переключает её на быструю.
 * Имя модели НЕ возвращается клиенту — клиент видит только "Hell AI".
 */
export const TIER_PRIMARY_MODEL: Record<"silver" | "gold" | "platinum", string> = {
  silver: "openrouter/auto",
  gold: "openrouter/auto",
  platinum: "openrouter/auto",
};

/** Модель для platinum после превышения лимита умной модели. */
export const PLATINUM_FALLBACK_MODEL = "openrouter/auto";
