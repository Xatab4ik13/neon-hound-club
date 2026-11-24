export const TG_TICKET_MIN = 200;
export const TG_TICKET_MAX = 2000;
export const TG_TICKET_STEP = 100;
export const TG_FINAL_AT = new Date("2026-12-05T18:00:00+03:00").getTime();

export const TG_TICKET_PACKS = [
  { tickets: 2, price: 150 },
  { tickets: 6, price: 250, badge: "−45%" },
  { tickets: 10, price: 350, badge: "−54%" },
  { tickets: 20, price: 500, badge: "−67%", hot: true },
  { tickets: 40, price: 750, badge: "−75%" },
  { tickets: 100, price: 1500, badge: "−80%" },
];

export function getTgTicketSelection(value: number) {
  const tickets = Math.min(TG_TICKET_MAX, Math.max(TG_TICKET_MIN,
    Math.round(value / TG_TICKET_STEP) * TG_TICKET_STEP));
  // Larger selections retain the largest pack's unit price (100 tickets for 1500 ₽).
  return { tickets, price: tickets * (1500 / 100) };
}