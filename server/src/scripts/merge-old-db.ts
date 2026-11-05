/**
 * Слияние старой базы (hellhound_old, снимок до падения сервера) в текущую (hellhound).
 *
 * Запуск на сервере из /opt/hhr/server:
 *   # 1. Пробный прогон — только статистика, ничего не пишет:
 *   docker compose exec api npx tsx src/scripts/merge-old-db.ts
 *   # 2. Реальное слияние:
 *   docker compose exec api npx tsx src/scripts/merge-old-db.ts --apply
 *
 * Env:
 *   DATABASE_URL      — текущая база (берётся из .env контейнера)
 *   OLD_DATABASE_URL  — старая база, напр. postgres://hellhound:PASS@postgres:5432/hellhound_old
 *   YAMAHA_RAFFLE_ID  — id розыгрыша Yamaha (если не задан, ищем активный с 'yamaha' в title)
 *
 * Что делает:
 *   1. Копирует все строки всех общих таблиц из старой базы (ON CONFLICT DO NOTHING).
 *      Порядок вставки подбирается автоматически: таблицы с ошибкой FK откладываются
 *      на следующий проход, пока всё не вставится.
 *   2. Обрабатывает tg_orders (status='paid'):
 *      - телефон найден в profiles (phone_e164) → начисляем билеты + записи в розыгрыш;
 *      - телефон не найден → создаём аккаунт (email tg+<phone>@tg.hhr.pro, случайный
 *        пароль, ник tg_<phone>), начисляем билеты + записи в розыгрыш;
 *      - несколько аккаунтов на один номер → НЕ трогаем, выводим в отчёт.
 *      Идемпотентно: повторный запуск пропускает уже обработанные заказы
 *      (по tickets_ledger ref_type='tg_order', ref_id=order.id).
 */
import postgres from "postgres";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL;
const oldUrl = process.env.OLD_DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
if (!oldUrl) throw new Error("OLD_DATABASE_URL is required (postgres://.../hellhound_old)");

const db = postgres(url, { max: 5 });
const old = postgres(oldUrl, { max: 5 });

const log = (...a: unknown[]) => console.log(...a);
const mode = APPLY ? "APPLY" : "DRY-RUN";

/** Таблицы, которые НЕ копируем из старой базы. */
const SKIP_TABLES = new Set([
  "tg_orders", // есть только в текущей базе
]);

/** Нормализация телефона к виду 7XXXXXXXXXX / международному (только цифры). */
function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8") && d.length === 11) d = "7" + d.slice(1);
  return d;
}

async function copyOldData() {
  const oldTables = (
    await old<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  ).map((r) => r.table_name);
  const newTables = new Set(
    (
      await db<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    ).map((r) => r.table_name),
  );

  let pending = oldTables.filter((t) => newTables.has(t) && !SKIP_TABLES.has(t));
  log(`\n[${mode}] Этап 1: копирование ${pending.length} таблиц из hellhound_old`);

  // Несколько проходов: таблицы с FK-ошибкой откладываем, пока не вставятся родители.
  for (let pass = 1; pending.length > 0 && pass <= 10; pass++) {
    const failed: string[] = [];
    for (const table of pending) {
      const cols = (
        await db<{ column_name: string }[]>`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}`
      ).map((c) => c.column_name);

      try {
        const inserted = await old.begin(async (otx) => {
          const rows = await otx.unsafe(
            `SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${table}"`,
          );
          if (rows.length === 0) return 0;
          if (!APPLY) return rows.length; // dry-run: считаем, что вставили бы все
          let n = 0;
          for (let i = 0; i < rows.length; i += 500) {
            const chunk = rows.slice(i, i + 500);
            const res = await db.unsafe(
              `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(", ")})
               VALUES ${chunk
                 .map(
                   (_, r) =>
                     `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(", ")})`,
                 )
                 .join(", ")}
               ON CONFLICT DO NOTHING`,
              chunk.flatMap((row) => cols.map((c) => row[c])),
            );
            n += res.count ?? 0;
          }
          return n;
        });
        log(`  ${table}: ${APPLY ? "вставлено" : "строк в старой базе"} ${inserted}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("foreign key") || msg.includes("violates foreign key")) {
          failed.push(table);
        } else {
          log(`  ${table}: ОШИБКА — ${msg}`);
          failed.push(table);
        }
      }
    }
    if (failed.length === pending.length) {
      log(`  ⚠ Застряли на таблицах: ${failed.join(", ")}`);
      break;
    }
    pending = failed;
    if (pending.length > 0) log(`  проход ${pass + 1}: повторяем ${pending.length} таблиц`);
  }
}

type TgOrderRow = {
  id: string;
  phone: string;
  telegram_user_id: number | null;
  telegram_username: string | null;
  telegram_name: string | null;
  tickets: number;
  total_rub: number;
  paid_at: Date | null;
};

async function processTgOrders() {
  // Ищем розыгрыш Yamaha.
  let raffleId = process.env.YAMAHA_RAFFLE_ID;
  if (!raffleId) {
    const [r] = await db<{ id: string; title: string; ticket_cost: number }[]>`
      SELECT id, title, ticket_cost FROM raffles
      WHERE status = 'active' AND lower(title) LIKE '%yamaha%'
      ORDER BY created_at DESC LIMIT 1`;
    if (!r) throw new Error("Активный розыгрыш Yamaha не найден — задайте YAMAHA_RAFFLE_ID");
    raffleId = r.id;
    log(`\nРозыгрыш найден автоматически: "${r.title}" (${r.id}), ticket_cost=${r.ticket_cost}`);
  }
  const [raffle] = await db<{ id: string; title: string; ticket_cost: number }[]>`
    SELECT id, title, ticket_cost FROM raffles WHERE id = ${raffleId}`;
  if (!raffle) throw new Error(`Розыгрыш ${raffleId} не найден`);

  const orders = await db<TgOrderRow[]>`
    SELECT id, phone, telegram_user_id, telegram_username, telegram_name,
           tickets, total_rub, paid_at
    FROM tg_orders WHERE status = 'paid' AND tickets > 0 ORDER BY paid_at`;
  log(`\n[${mode}] Этап 2: ${orders.length} оплаченных tg-заказов с билетами`);

  const stats = { credited: 0, created: 0, skippedDone: 0, conflicts: 0, noTickets: 0 };
  const conflicts: { phone: string; userIds: string[] }[] = [];

  for (const o of orders) {
    // Идемпотентность: заказ уже обработан?
    const [done] = await db<{ id: string }[]>`
      SELECT id FROM tickets_ledger WHERE ref_type = 'tg_order' AND ref_id = ${o.id} LIMIT 1`;
    if (done) {
      stats.skippedDone++;
      continue;
    }

    const phone = normalizePhone(o.phone);
    const owners = await db<{ user_id: string }[]>`
      SELECT user_id FROM profiles WHERE phone_e164 = ${phone}`;
    // Запасной вариант: старый формат phone без нормализации.
    if (owners.length === 0) {
      const alt = await db<{ user_id: string }[]>`
        SELECT user_id FROM profiles WHERE phone = ${o.phone} OR phone = ${"+" + phone}`;
      owners.push(...alt);
    }

    let userId: string;
    if (owners.length > 1) {
      stats.conflicts++;
      conflicts.push({ phone, userIds: owners.map((x) => x.user_id) });
      continue;
    } else if (owners.length === 1) {
      userId = owners[0].user_id;
      stats.credited++;
    } else {
      // Создаём аккаунт по телефону.
      const email = `tg+${phone}@tg.hhr.pro`;
      const nick = `tg_${phone}`.slice(0, 32);
      const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
      if (APPLY) {
        await db`
          INSERT INTO users (email, password_hash, nick)
          VALUES (${email}, ${passwordHash}, ${nick})
          ON CONFLICT (email) DO NOTHING`;
        const [u] = await db<{ id: string }[]>`
          SELECT id FROM users WHERE email = ${email}`;
        userId = u.id;
        await db`
          INSERT INTO profiles (user_id, phone, phone_e164)
          VALUES (${userId}, ${"+" + phone}, ${phone})
          ON CONFLICT (user_id) DO NOTHING`;
      } else {
        userId = "dry-run";
      }
      stats.created++;
    }

    if (APPLY) {
      await db.begin(async (tx) => {
        await tx`
          INSERT INTO tickets_ledger (user_id, amount, source, reason, ref_type, ref_id, created_at)
          VALUES (${userId}, ${o.tickets}, 'tg_merge',
                  ${`Покупка билетов через Telegram-бот (${o.total_rub} ₽)`},
                  'tg_order', ${o.id}, ${o.paid_at ?? new Date()})`;
        // Записи в розыгрыш: tickets / ticket_cost штук.
        const entries = Math.floor(o.tickets / raffle.ticket_cost);
        if (entries > 0) {
          const rows = Array.from({ length: entries }, () => ({
            raffle_id: raffle.id,
            user_id: userId,
            ticket_cost_snapshot: raffle.ticket_cost,
            created_at: o.paid_at ?? new Date(),
          }));
          for (let i = 0; i < rows.length; i += 500) {
            await tx`INSERT INTO raffle_entries ${tx(rows.slice(i, i + 500))}`;
          }
        }
      });
    }
  }

  log(`\nИтог по tg-заказам:`);
  log(`  начислено существующим аккаунтам: ${stats.credited}`);
  log(`  создано новых аккаунтов:           ${stats.created}`);
  log(`  уже обработано ранее (пропуск):    ${stats.skippedDone}`);
  log(`  конфликтов (несколько аккаунтов):  ${stats.conflicts}`);
  if (conflicts.length > 0) {
    log(`\nКонфликты — разобрать вручную:`);
    for (const c of conflicts) log(`  ${c.phone}: ${c.userIds.join(", ")}`);
  }
}

async function main() {
  log(`Режим: ${mode}${APPLY ? "" : " (ничего не записывается, добавьте --apply)"}`);
  await copyOldData();
  await processTgOrders();

  // Контрольные счётчики.
  const [u] = await db<{ n: number }[]>`SELECT count(*)::int n FROM users`;
  const [t] = await db<{ n: number }[]>`SELECT coalesce(sum(amount),0)::int n FROM tickets_ledger`;
  const [r] = await db<{ n: number }[]>`SELECT count(*)::int n FROM raffle_entries`;
  log(`\nКонтроль: users=${u.n}, сумма билетов=${t.n}, raffle_entries=${r.n}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([db.end(), old.end()]));
