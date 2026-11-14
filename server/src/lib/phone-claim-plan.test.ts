import assert from "node:assert/strict";
import { isBotAutoAccountEmail, planPhoneClaim } from "./phone-claim-plan.js";

const me = "me";
const bot = { userId: "bot", email: "tg+79991234567@tg.hhr.pro", verified: false };

// Номер свободен — просто записываем.
assert.deepEqual(planPhoneClaim([], me), { action: "free" });
assert.deepEqual(planPhoneClaim([{ userId: me, email: "a@b.ru", verified: false }], me), { action: "free" });
// Номер у неподтверждённого бот-аккаунта — покупки переносятся владельцу номера.
assert.deepEqual(planPhoneClaim([bot], me), { action: "merge", botUserIds: ["bot"] });
// В бот-аккаунт уже входили через бота — не трогаем.
assert.deepEqual(planPhoneClaim([{ ...bot, verified: true }], me), { action: "blocked" });
// Номер у обычного аккаунта сайта — не трогаем.
assert.deepEqual(planPhoneClaim([{ userId: "x", email: "x@mail.ru", verified: false }], me), { action: "blocked" });

assert.equal(isBotAutoAccountEmail("tg+79991234567@tg.hhr.pro"), true);
assert.equal(isBotAutoAccountEmail("vasya@tg.hhr.pro"), false);
assert.equal(isBotAutoAccountEmail("tg+7999@gmail.com"), false);
console.log("phone claim ok");
