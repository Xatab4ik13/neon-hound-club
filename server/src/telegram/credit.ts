/**
 * Автоначисление билетов за оплаченный tg-заказ: аккаунт по телефону (или новый),
 * начисление + записи в Yamaha + списание — одной транзакцией с блокировкой заказа.
 * Та же логика, что в scripts/merge-old-db.ts (скрипт остаётся страховкой для добора).
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "../db/client.js";
import { allocateMergeTickets } from "../scripts/merge-ticket-allocation.js";

function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8") && d.length === 11) d = "7" + d.slice(1);
  return d;
}

export { normalizePhone };

/** Аккаунты, у которых нормализованный телефон совпадает с номером (только цифры, 8→7). */
export async function findOwnersByPhone(phone: string): Promise<{ user_id: string }[]> {
  return sql<{ user_id: string }[]>`
    SELECT DISTINCT user_id FROM profiles
    WHERE CASE
      WHEN length(regexp_replace(coalesce(phone_e164, phone, ''), '[^0-9]', '', 'g')) = 11
        AND regexp_replace(coalesce(phone_e164, phone, ''), '[^0-9]', '', 'g') LIKE '8%'
      THEN '7' || substring(regexp_replace(coalesce(phone_e164, phone, ''), '[^0-9]', '', 'g') FROM 2)
      ELSE regexp_replace(coalesce(phone_e164, phone, ''), '[^0-9]', '', 'g')
    END = ${phone}`;
}

export type CreditResult = "credited" | "created" | "already" | "conflict" | "skipped";

export async function creditTgOrder(orderId: string): Promise<CreditResult> {
  const [o] = await sql<{ id: string; phone: string; tickets: number; total_rub: number; status: string; paid_at: Date | null }[]>`
    SELECT id, phone, tickets, total_rub, status, paid_at FROM tg_orders WHERE id = ${orderId}`;
  if (!o || o.status !== "paid" || o.tickets <= 0) return "skipped";

  const [done] = await sql`SELECT id FROM tickets_ledger WHERE ref_type = 'tg_order' AND ref_id = ${o.id} LIMIT 1`;
  if (done) return "already";

  let raffleId = process.env.YAMAHA_RAFFLE_ID;
  if (!raffleId) {
    const [r] = await sql<{ id: string }[]>`
      SELECT id FROM raffles WHERE status = 'active' AND lower(title) LIKE '%yamaha%'
      ORDER BY created_at DESC LIMIT 1`;
    if (!r) throw new Error("Активный розыгрыш Yamaha не найден");
    raffleId = r.id;
  }
  const [raffle] = await sql<{ id: string; title: string; ticket_cost: number }[]>`
    SELECT id, title, ticket_cost FROM raffles WHERE id = ${raffleId}`;
  if (!raffle) throw new Error(`Розыгрыш ${raffleId} не найден`);

  const phone = normalizePhone(o.phone);
  const owners = await findOwnersByPhone(phone);
  if (owners.length > 1) {
    console.warn(`[tg-credit] конфликт телефона ${phone}: ${owners.map((x) => x.user_id).join(", ")}`);
    return "conflict";
  }

  let userId: string;
  let result: CreditResult = "credited";
  if (owners.length === 1) {
    userId = owners[0].user_id;
  } else {
    const email = `tg+${phone}@tg.hhr.pro`;
    const nick = `tg_${phone}`.slice(0, 32);
    const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    await sql`INSERT INTO users (email, password_hash, nick) VALUES (${email}, ${passwordHash}, ${nick}) ON CONFLICT (email) DO NOTHING`;
    const [u] = await sql<{ id: string }[]>`SELECT id FROM users WHERE email = ${email}`;
    if (!u) throw new Error(`Не удалось создать аккаунт для заказа ${o.id}`);
    userId = u.id;
    await sql`INSERT INTO profiles (user_id, phone, phone_e164) VALUES (${userId}, ${"+" + phone}, ${phone}) ON CONFLICT (user_id) DO NOTHING`;
    result = "created";
  }

  let applied = false;
  await sql.begin(async (tx) => {
    await tx`SELECT id FROM tg_orders WHERE id = ${o.id} FOR UPDATE`;
    const [again] = await tx`SELECT id FROM tickets_ledger WHERE ref_type = 'tg_order' AND ref_id = ${o.id} LIMIT 1`;
    if (again) return;
    const at = o.paid_at ?? new Date();
    const allocation = allocateMergeTickets(o.tickets, raffle.ticket_cost);
    await tx`
      INSERT INTO tickets_ledger (user_id, amount, source, reason, ref_type, ref_id, created_at)
      VALUES (${userId}, ${o.tickets}, 'tg_merge', ${`Покупка билетов через Telegram-бот (${o.total_rub} ₽)`}, 'tg_order', ${o.id}, ${at})`;
    if (allocation.entries > 0) {
      const rows = Array.from({ length: allocation.entries }, () => ({
        raffle_id: raffle.id, user_id: userId, ticket_cost_snapshot: raffle.ticket_cost, created_at: at,
      }));
      for (let i = 0; i < rows.length; i += 500) await tx`INSERT INTO raffle_entries ${tx(rows.slice(i, i + 500))}`;
      await tx`
        INSERT INTO tickets_ledger (user_id, amount, source, reason, ref_type, ref_id, created_at)
        VALUES (${userId}, ${allocation.debit}, 'raffle_entry', ${`Розыгрыш: ${raffle.title} (Telegram)`}, 'tg_order', ${o.id}, ${at})`;
    }
    applied = true;
  });
  return applied ? result : "already";
}
