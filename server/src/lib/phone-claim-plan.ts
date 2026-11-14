/** Решение, можно ли забрать номер у текущего держателя (чистая логика, покрыта тестом). */
export type PhoneHolder = { userId: string; email: string; verified: boolean };

export type PhoneClaimPlan =
  | { action: "free" }
  | { action: "merge"; botUserIds: string[] }
  | { action: "blocked" };

export function isBotAutoAccountEmail(email: string): boolean {
  return /^tg\+\d+@tg\.hhr\.pro$/i.test(email);
}

/**
 * Переносим только неподтверждённые бот-аккаунты: в них никто не входил, кроме покупок там ничего нет.
 * Подтверждённый (в него входили через бота) или обычный аккаунт сайта не трогаем.
 */
export function planPhoneClaim(holders: PhoneHolder[], targetUserId: string): PhoneClaimPlan {
  const others = holders.filter((h) => h.userId !== targetUserId);
  if (others.length === 0) return { action: "free" };
  if (others.some((h) => h.verified || !isBotAutoAccountEmail(h.email))) return { action: "blocked" };
  return { action: "merge", botUserIds: others.map((h) => h.userId) };
}
