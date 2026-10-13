export const TG_TICKET_MIN = 100;
export const TG_TICKET_MAX = 1000;
export const TG_TICKET_STEP = 50;

export function getTgTicketSelection(value: number) {
  const tickets = Math.min(TG_TICKET_MAX, Math.max(TG_TICKET_MIN,
    Math.round(value / TG_TICKET_STEP) * TG_TICKET_STEP));
  // Larger selections retain the existing 50-ticket pack's unit price.
  return { tickets, price: tickets * (3000 / 50) };
}