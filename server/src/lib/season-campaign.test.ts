import assert from "node:assert/strict";
import { daysWord, planSeasonCampaign, SECRET_BOX_DAYS } from "./season-campaign.js";

// Формы слова «день».
assert.equal(daysWord(1), "день");
assert.equal(daysWord(2), "дня");
assert.equal(daysWord(5), "дней");
assert.equal(daysWord(11), "дней");
assert.equal(daysWord(21), "день");
assert.equal(daysWord(24), "дня");

// Без прогресса и с уже забранным Secret Box не пишем.
assert.deepEqual(planSeasonCampaign([{ userId: "a", days: 0, hasPlatinum: true, claimed40: false }]), []);
assert.deepEqual(
  planSeasonCampaign([{ userId: "a", days: SECRET_BOX_DAYS, hasPlatinum: true, claimed40: true }]),
  [],
);

// Активный Platinum, 12 дней: считаем остаток до 40 и ведём в календарь.
const mid = planSeasonCampaign([{ userId: "a", days: 12, hasPlatinum: true, claimed40: false }])[0]!;
assert.equal(mid.kind, "secret_box");
assert.equal(mid.payload.title, "До Secret Box 28 дней");
assert.match(mid.payload.body!, /ещё 28 дней с активным Platinum/);
assert.match(mid.payload.body!, /до 6 января/);
assert.equal(mid.payload.url, "/club/spin");

// 1 день до цели — правильная форма слова.
const almost = planSeasonCampaign([
  { userId: "b", days: 39, hasPlatinum: true, claimed40: false },
])[0]!;
assert.equal(almost.payload.title, "До Secret Box 1 день");
assert.match(almost.payload.body!, /ещё 1 день/);

// 40 дней и не забрано: зовём забирать коробку.
const ready = planSeasonCampaign([
  { userId: "c", days: 40, hasPlatinum: true, claimed40: false },
])[0]!;
assert.equal(ready.payload.title, "Secret Box твой");
assert.equal(ready.payload.url, "/club/spin");

// Нет активного Platinum: ведём на страницу Hell Pass, прогресс не обнуляем.
const expired = planSeasonCampaign([
  { userId: "d", days: 25, hasPlatinum: false, claimed40: false },
])[0]!;
assert.equal(expired.kind, "platinum_expired");
assert.equal(expired.payload.title, "Platinum закончился");
assert.match(expired.payload.body!, /Прогресс сохранён: 25 из 40 дней/);
assert.equal(expired.payload.url, "/club/hell-pass");

console.log("season campaign ok");
