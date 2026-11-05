/** Купленные билеты расходуются на участие; остаток остаётся на балансе. */
export function allocateMergeTickets(tickets: number, ticketCost: number) {
  if (!Number.isSafeInteger(tickets) || tickets < 0 ||
      !Number.isSafeInteger(ticketCost) || ticketCost <= 0) {
    throw new Error("Некорректное количество или стоимость билетов");
  }
  const entries = Math.floor(tickets / ticketCost);
  const spent = entries * ticketCost;
  return { entries, debit: -spent, balance: tickets - spent };
}