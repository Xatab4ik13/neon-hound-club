import assert from "node:assert/strict";
import { planSpinDeliveryOrder, TSHIRT_SIZES } from "./spin-delivery-plan.js";

// Футболка: размеры только S, M, L, XL.
assert.deepEqual([...TSHIRT_SIZES], ["S", "M", "L", "XL"]);
assert.throws(() => planSpinDeliveryOrder("tshirt_legend", "XXL", 450));
assert.throws(() => planSpinDeliveryOrder("tshirt_legend", null, 450));

// Платится только доставка: товар 0 ₽, итог = цена СДЭК.
const t = planSpinDeliveryOrder("tshirt_legend", "M", 450);
assert.equal(t.subtotalRub, 0);
assert.equal(t.totalRub, 450);
assert.equal(t.sizeSnapshot, "M");

// Secret Box без размера.
const b = planSpinDeliveryOrder("secret_box", "M", 700);
assert.equal(b.sizeSnapshot, null);
assert.equal(b.totalRub, 700);

// Без рассчитанной доставки заказ не создаётся.
assert.throws(() => planSpinDeliveryOrder("secret_box", null, 0));
assert.throws(() => planSpinDeliveryOrder("jackpot_ps5", null, 500));

console.log("spin delivery ok");
