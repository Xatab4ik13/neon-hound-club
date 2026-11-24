import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getTgTicketSelection, TG_TICKET_PACKS, TG_FINAL_AT } from "./tg-tickets";

for (const [pack, tickets, price] of [
  [0, 2, 150], [1, 6, 250], [2, 10, 350],
  [3, 20, 500], [4, 40, 750], [5, 100, 1500],
]) {
  test(`Telegram pack ${tickets} tickets costs ${price} rub`, () => {
    const selection = TG_TICKET_PACKS[pack];
    assert.deepEqual(selection && { tickets: selection.tickets, price: selection.price }, { tickets, price });
  });
}

test("Telegram final is December 5, 2026 at 18:00 Moscow time", () => {
  assert.equal(TG_FINAL_AT, Date.UTC(2026, 11, 5, 15, 0, 0));
});

test("Telegram slider starts at 200 tickets for 3000 rub", () => {
  assert.deepEqual(getTgTicketSelection(0), { tickets: 200, price: 3000 });
});
test("Telegram slider ends at 2000 tickets for 30000 rub", () => {
  assert.deepEqual(getTgTicketSelection(2500), { tickets: 2000, price: 30000 });
});
test("Telegram slider uses steps of 100 tickets", () => {
  assert.equal(getTgTicketSelection(260).tickets, 300);
});