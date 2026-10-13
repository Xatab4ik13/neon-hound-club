import { describe, expect, it } from "vitest";
import { formatRuPhone, isValidRuPhone } from "./phone";
describe("RU phone", () => {
  it("replaces leading 8 with +7", () => expect(formatRuPhone("89001234567")).toBe("+7 (900) 123-45-67"));
  it("valid only with 11 digits", () => { expect(isValidRuPhone("+7 (900) 123-45")).toBe(false); expect(isValidRuPhone("+7 (900) 123-45-67")).toBe(true); });
});
