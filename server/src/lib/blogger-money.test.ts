import assert from "node:assert/strict";
import { calculateBloggerMoneyRub } from "./blogger-money.js";

assert.equal(
  calculateBloggerMoneyRub([
    { subtotalRub: 3_000, discountRub: 300, digitalGrossRub: 2_000 },
    { subtotalRub: 1_000, discountRub: 0, digitalGrossRub: 0 },
  ]),
  900,
  "50% считается только от digital/virtual после пропорциональной скидки",
);

assert.equal(
  calculateBloggerMoneyRub([{ subtotalRub: 2_500, discountRub: 500, digitalGrossRub: 2_500 }]),
  1_000,
  "полностью цифровой заказ учитывает всю скидку",
);

console.log("blogger-money rules: OK");