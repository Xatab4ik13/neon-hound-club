import assert from "node:assert/strict";
import { normalizePhone, priceShirts, priceTickets } from "./pricing.js";

assert.deepEqual(priceTickets({ pack: 3 }), { tickets: 10, price: 1000 });
assert.deepEqual(priceTickets({ custom: 1000 }), { tickets: 1000, price: 60000 });
assert.equal(priceTickets({ custom: 120 }), null);
assert.equal(priceTickets({ custom: 1050 }), null);
assert.equal(priceShirts([{ id: "a", size: "L", qty: 1 }, { id: "b", size: "M", qty: 2 }])?.total, 7700);
assert.equal(normalizePhone("8 (900) 123-45-67"), "+79001234567");
assert.equal(normalizePhone("+995 599 123 456"), "+995599123456");
assert.equal(normalizePhone("+380 99 123 45 67"), "+380991234567");
assert.equal(normalizePhone("1234567"), null);
assert.equal(normalizePhone("12345678901234567"), null);
console.log("tg pricing ok");
