export const TG_TICKET_MIN = 200;
export const TG_TICKET_MAX = 2000;
export const TG_TICKET_STEP = 100;
export const TG_FINAL_AT = new Date("2026-11-15T23:00:00+03:00").getTime();

export function getTgTicketSelection(value: number) {
  const tickets = Math.min(TG_TICKET_MAX, Math.max(TG_TICKET_MIN,
    Math.round(value / TG_TICKET_STEP) * TG_TICKET_STEP));
  // Larger selections retain the largest pack's unit price (100 tickets for 3000 ₽).
  return { tickets, price: tickets * (3000 / 100) };
}