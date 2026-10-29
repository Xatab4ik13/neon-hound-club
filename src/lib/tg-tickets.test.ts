import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getTgTicketSelection, TG_FINAL_AT } from "./tg-tickets";

test("Telegram final is November 5, 2026 at 23:00 Moscow time", () => {
  assert.equal(TG_FINAL_AT, Date.UTC(2026, 10, 5, 20, 0, 0));
});

test("Telegram slider starts at 100 tickets", () => {
  assert.equal(getTgTicketSelection(0).tickets, 100);
});
test("Telegram slider ends at 1000 tickets", () => {
  assert.equal(getTgTicketSelection(1100).tickets, 1000);
});
test("Telegram slider uses steps of 50 tickets", () => {
  assert.equal(getTgTicketSelection(126).tickets, 150);
});