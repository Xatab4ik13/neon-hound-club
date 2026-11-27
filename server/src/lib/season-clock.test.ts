import assert from "node:assert/strict";
import { DOWNTIME_DAYS, seasonBounds, seasonIndex, seasonTimeShiftMs } from "./season-clock.js";

const DAY = 86_400_000;
const nov27 = Date.UTC(2026, 10, 27, 12);
const jan5 = Date.UTC(2027, 0, 5, 12);
const feb1 = Date.UTC(2027, 1, 1);

// Сезон 2 идёт до 6 января 2027, 00:00 МСК.
assert.equal(seasonBounds(nov27).endsAt.toISOString(), "2027-01-05T21:00:00.000Z");
assert.equal(seasonBounds(nov27).startsAt.toISOString(), "2026-09-15T21:00:00.000Z");
assert.equal(seasonIndex(jan5), 0);
assert.equal(seasonTimeShiftMs(nov27), DOWNTIME_DAYS * DAY);

// Новый сезон сам не начинается: и после 6 января это всё ещё сезон 2.
assert.equal(seasonIndex(feb1), 0);
assert.equal(seasonBounds(feb1).startsAt.toISOString(), "2026-09-15T21:00:00.000Z");

console.log("season clock ok");
