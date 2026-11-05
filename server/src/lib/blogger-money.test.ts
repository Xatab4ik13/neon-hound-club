import assert from "node:assert/strict";
import { calculateBloggerMoneyRub, calculatePreorderRub, calculateBloggerTotalRub } from "./blogger-money.js";

assert.equal(
  calculateBloggerMoneyRub([
    { subtotalRub: 3_000, discountRub: 300, digitalGrossRub: 2_000 },
    { subtotalRub: 1_000, discountRub: 0, digitalGrossRub: 0 },
  ]),
  1_080,
  "60% считается только от digital/virtual после пропорциональной скидки",
);

assert.equal(
  calculatePreorderRub([
    { subtotalRub: 2_500, discountRub: 0, digitalGrossRub: 0, preorderGrossRub: 2_500 },
    { subtotalRub: 4_000, discountRub: 400, digitalGrossRub: 2_000, preorderGrossRub: 2_000 },
  ]),
  4_300,
  "предзаказы — полная сумма позиций без доставки, со своей долей скидки",
);

assert.equal(
  calculateBloggerTotalRub([], { ticketsRub: 6_000, shirtsRub: 0 }),
  3_000,
  "блогеру начисляется 50% оплаченных билетов Telegram",
);

const telegramOrder = { ticketsRub: 0, shirtsRub: 5_100, shippingRub: 750, totalRub: 5_850 };
assert.equal(
  calculateBloggerTotalRub([], telegramOrder),
  5_100,
  "предзаказы Telegram учитываются на 100%, доставка не входит в доход",
);

assert.equal(
  calculateBloggerTotalRub(
    [{ subtotalRub: 5_000, discountRub: 500, digitalGrossRub: 2_000, preorderGrossRub: 3_000 }],
    { ticketsRub: 6_000, shirtsRub: 5_100 },
  ),
  11_880,
  "общая сумма складывает доход сайта и Telegram без повторного учёта предзаказов",
);

console.log("blogger-money rules: OK");
