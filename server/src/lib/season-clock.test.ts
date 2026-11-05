import assert from "node:assert/strict";
import { DOWNTIME_DAYS, seasonBounds, seasonIndex, seasonTimeShiftMs } from "./season-clock.js";

const DAY = 86_400_000;
// 5 ноября 2026, 12:00 UTC — сайт ещё не открыт, простой идёт.
const nov5 = Date.UTC(2026, 10, 5, 12, 0, 0);
// Конец сезона 2 по старому графику: 31 октября 2026, 21:00 UTC.
const season2EndOld = Date.UTC(2026, 9, 31, 21, 0, 0);

// 5 ноября сезон 2 ещё продолжается: продлён на дни простоя.
assert.equal(seasonIndex(nov5), 0);
assert.equal(seasonTimeShiftMs(nov5), DOWNTIME_DAYS * DAY);
const b2 = seasonBounds(nov5);
assert.equal(b2.endsAt.getTime() - b2.startsAt.getTime(), (45 + DOWNTIME_DAYS) * DAY);
assert.equal(b2.endsAt.getTime() - season2EndOld, DOWNTIME_DAYS * DAY);

// День сезона на 5 ноября = день 13 октября, а не «51-й день».
// (28 дней от якоря 16 сентября до 13 октября + 1)
assert.equal(Math.floor((nov5 - seasonTimeShiftMs(nov5) - b2.startsAt.getTime()) / DAY) + 1, 28);

// После продления сдвиг снят: сезон 3 идёт по обычному графику (45 дней).
const dec1 = Date.UTC(2026, 11, 1);
assert.equal(seasonTimeShiftMs(dec1), 0);
assert.equal(seasonIndex(dec1), 1);
const b3 = seasonBounds(dec1);
assert.equal(b3.endsAt.getTime() - b3.startsAt.getTime(), 45 * DAY);

console.log("season downtime ok");
