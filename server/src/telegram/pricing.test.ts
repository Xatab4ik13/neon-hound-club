import { describe, expect, it } from "vitest";
import { normalizeRuPhone, priceShirts, priceTickets } from "./pricing.js";

describe("tg pricing", () => {
  it("10-ticket pack costs 1000", () => expect(priceTickets({ pack: 3 })).toEqual({ tickets: 10, price: 1000 }));
  it("slider: 60 ₽ per ticket, 100..1000 step 50", () => {
    expect(priceTickets({ custom: 1000 })).toEqual({ tickets: 1000, price: 60000 });
    expect(priceTickets({ custom: 120 })).toBeNull();
    expect(priceTickets({ custom: 1050 })).toBeNull();
  });
  it("shirts 2500 and 2600", () => expect(priceShirts([{ id: "a", size: "L", qty: 1 }, { id: "b", size: "M", qty: 2 }])?.total).toBe(7700));
  it("8 → +7", () => expect(normalizeRuPhone("8 (900) 123-45-67")).toBe("+79001234567"));
});
