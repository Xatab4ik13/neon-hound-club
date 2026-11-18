import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getTgTicketSelection, TG_FINAL_AT } from "./tg-tickets";

test("Telegram final is November 15, 2026 at 23:00 Moscow time", () => {
  assert.equal(TG_FINAL_AT, Date.UTC(2026, 10, 15, 20, 0, 0));
});

test("Telegram slider starts at 200 tickets for 6000 rub", () => {
  assert.deepEqual(getTgTicketSelection(0), { tickets: 200, price: 6000 });
});
test("Telegram slider ends at 2000 tickets for 60000 rub", () => {
  assert.deepEqual(getTgTicketSelection(2500), { tickets: 2000, price: 60000 });
});
test("Telegram slider uses steps of 100 tickets", () => {
  assert.equal(getTgTicketSelection(260).tickets, 300);
});