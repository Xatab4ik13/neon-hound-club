import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { passPurchases } from "../db/schema/pass.js";
import { systemSettings } from "../db/schema/economy.js";
import { spinSeasons } from "../db/schema/spin.js";
import { DOWNTIME_DAYS, DOWNTIME_MS, DOWNTIME_START_MS } from "../lib/season-clock.js";

/**
 * Продление на дни простоя сайта (11 октября — 5 ноября 2026):
 *  - активные Hell Pass, жившие на 11 октября, продлеваются на DOWNTIME_DAYS;
 *  - сезон HellSpin продлевается кодом (lib/season-clock.ts), здесь только отчёт.
 *
 * Идемпотентность: флаг system_settings 'downtime_pass_extension' — повторный
 * запуск ничего не сдвигает второй раз.
 *
 * Dry-run по умолчанию; --apply для реального продления.
 */
const FLAG_KEY = "downtime_pass_extension";

async function main() {
  const apply = process.argv.includes("--apply");
  const downtimeStart = new Date(DOWNTIME_START_MS);

  const [flag] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, FLAG_KEY))
    .limit(1);

  if (flag) {
    console.log("Продление Pass уже применено:", JSON.stringify(flag.value));
  } else {
    const [stats] = await db
      .select({
        cnt: sql<number>`count(*)::int`,
        min: sql<string | null>`min(expires_at)::text`,
        max: sql<string | null>`max(expires_at)::text`,
      })
      .from(passPurchases)
      .where(
        and(
          eq(passPurchases.status, "active"),
          gt(passPurchases.expiresAt, downtimeStart),
        ),
      );

    const cnt = stats?.cnt ?? 0;
    console.log(`Активных Hell Pass, живших на 11 октября: ${cnt}`);
    console.log(`Сроки действия: ${stats?.min ?? "—"} … ${stats?.max ?? "—"}`);

    if (!apply) {
      console.log("DRY-RUN: ничего не изменено. Для применения добавь --apply");
    } else {
      await db.transaction(async (tx) => {
        if (cnt > 0) {
          await tx
            .update(passPurchases)
            .set({
              expiresAt: sql`${passPurchases.expiresAt} + make_interval(secs => ${DOWNTIME_MS / 1000})`,
            })
            .where(
              and(
                eq(passPurchases.status, "active"),
                gt(passPurchases.expiresAt, downtimeStart),
              ),
            );
        }
        await tx.insert(systemSettings).values({
          key: FLAG_KEY,
          value: { days: DOWNTIME_DAYS, passes: cnt, appliedAt: new Date().toISOString() },
        });
      });
      console.log(`Продлено Pass: ${cnt} на ${DOWNTIME_DAYS} дней.`);
    }
  }

  // Отчёт по сезонам: продление сезона делает ensureCurrentSeason при первом
  // обращении после деплоя; здесь фиксируем, что в базе один сезон без «хвостов».
  const seasons = await db.select().from(spinSeasons);
  seasons.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  console.log(`Сезонов HellSpin в базе: ${seasons.length}`);
  for (const s of seasons) {
    console.log(
      `  ${s.periodKey}: ${s.startsAt.toISOString()} → ${s.endsAt.toISOString()} (${s.daysTotal} дн.)`,
    );
  }
  const stray = seasons.filter((s) => s.startsAt.getTime() > DOWNTIME_START_MS);
  if (stray.length > 0) {
    console.log("ВНИМАНИЕ: есть сезоны, созданные после начала простоя — пришли этот вывод мне.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
