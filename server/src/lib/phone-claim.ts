/**
 * Подтверждение телефона, если номер уже лежит у авто-аккаунта из Telegram-бота.
 *
 * Бот создаёт аккаунт `tg+<номер>@tg.hhr.pro` для покупки без аккаунта на сайте и пишет
 * номер в профиль без подтверждения. Когда владелец номера подтверждает его кодом
 * на своём основном аккаунте, билеты и участия бот-аккаунта переносятся к нему,
 * а номер с бот-аккаунта снимается — всё одной транзакцией.
 */
import { sql } from "../db/client.js";

import { planPhoneClaim } from "./phone-claim-plan.js";

export type PhoneClaimResult =
  | { status: "ok"; mergedAccounts: number; movedEntries: number }
  | { status: "blocked" };

/** Записать подтверждённый номер в профиль, при необходимости забрав покупки бот-аккаунта. */
export async function claimVerifiedPhone(targetUserId: string, phoneE164: string): Promise<PhoneClaimResult> {
  const digits = phoneE164.replace(/\D/g, "");
  return sql.begin(async (tx) => {
    const rows = await tx<{ user_id: string; email: string; verified: boolean }[]>`
      SELECT p.user_id, u.email, (p.phone_verified_at IS NOT NULL) AS verified
      FROM profiles p JOIN users u ON u.id = p.user_id
      WHERE p.phone_e164 = ${digits} AND p.user_id <> ${targetUserId}
      FOR UPDATE OF p`;
    const plan = planPhoneClaim(
      rows.map((r) => ({ userId: r.user_id, email: r.email, verified: r.verified })),
      targetUserId,
    );
    if (plan.action === "blocked") return { status: "blocked" } as const;

    let movedEntries = 0;
    if (plan.action === "merge") {
      for (const botId of plan.botUserIds) {
        await tx`UPDATE tickets_ledger SET user_id = ${targetUserId} WHERE user_id = ${botId}`;
        const moved = await tx`UPDATE raffle_entries SET user_id = ${targetUserId} WHERE user_id = ${botId}`;
        movedEntries += moved.count;
        await tx`UPDATE profiles SET phone = NULL, phone_e164 = NULL, updated_at = now() WHERE user_id = ${botId}`;
      }
    }

    await tx`
      UPDATE profiles
      SET phone = ${phoneE164}, phone_e164 = ${digits}, phone_verified_at = now(), updated_at = now()
      WHERE user_id = ${targetUserId}`;

    return {
      status: "ok",
      mergedAccounts: plan.action === "merge" ? plan.botUserIds.length : 0,
      movedEntries,
    } as const;
  });
}
