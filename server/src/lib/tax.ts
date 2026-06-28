/**
 * Авто-налог УСН 7% (настраиваемая ставка).
 *
 * При каждом payments.status='confirmed' создаём запись в economy_operations:
 *   type='expense', category='Налог УСН', source='auto',
 *   refType='tax', refId=<paymentId>.
 *
 * Идемпотентность гарантируется уникальным индексом eo_ref_uniq (refType, refId)
 * через onConflictDoNothing. Повторные вызовы безопасны.
 */
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { economyOperations, systemSettings } from "../db/schema/economy.js";

export const TAX_CATEGORY = "Налог УСН";
const DEFAULT_RATE_PERCENT = 7;

type TaxSetting = { rate_percent: number };

export async function getTaxRatePercent(): Promise<number> {
  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, "tax"))
    .limit(1);
  const v = row?.value as TaxSetting | undefined;
  const rate = Number(v?.rate_percent);
  if (!Number.isFinite(rate) || rate < 0) return DEFAULT_RATE_PERCENT;
  return rate;
}

/**
 * Записать авто-налог по подтверждённому платежу. Идемпотентно.
 * Если ставка = 0 — операция не создаётся.
 */
export async function recordAutoTaxForPayment(
  paymentId: string,
  amountRub: number,
  occurredAt: Date,
): Promise<void> {
  const rate = await getTaxRatePercent();
  if (rate <= 0) return;
  const taxRub = Math.round((amountRub * rate) / 100);
  if (taxRub <= 0) return;
  await db
    .insert(economyOperations)
    .values({
      occurredAt,
      type: "expense",
      category: TAX_CATEGORY,
      amountRub: taxRub,
      note: `Автоналог ${rate}% с платежа ${paymentId.slice(0, 8)}`,
      source: "auto",
      refType: "tax",
      refId: paymentId,
    })
    .onConflictDoNothing();
}
