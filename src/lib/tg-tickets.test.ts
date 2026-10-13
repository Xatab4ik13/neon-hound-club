import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getTgTicketSelection } from "./tg-tickets";

test("Telegram slider starts at 100 tickets", () => {
  assert.equal(getTgTicketSelection(0).tickets, 100);
});
test("Telegram slider ends at 1000 tickets", () => {
  assert.equal(getTgTicketSelection(1100).tickets, 1000);
});
test("Telegram slider uses steps of 50 tickets", () => {
  assert.equal(getTgTicketSelection(126).tickets, 150);
});