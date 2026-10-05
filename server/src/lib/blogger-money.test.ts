import assert from "node:assert/strict";
import { calculateBloggerMoneyRub, calculatePreorderRub } from "./blogger-money.js";

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

console.log("blogger-money rules: OK");
