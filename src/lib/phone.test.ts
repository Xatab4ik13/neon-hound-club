import { test } from "node:test";
import { strict as assert } from "node:assert";
import { formatRuPhone, isValidRuPhone, formatPhone, isValidPhone } from "./phone";
test("8 → +7", () => assert.equal(formatRuPhone("89001234567"), "+7 (900) 123-45-67"));
test("valid only with 11 digits", () => { assert.equal(isValidRuPhone("+7 (900) 123-45"), false); assert.equal(isValidRuPhone("+7 (900) 123-45-67"), true); });
test("+7 всё ещё с маской", () => assert.equal(formatPhone("+79001234567"), "+7 (900) 123-45-67"));
test("8 тоже маскируется", () => assert.equal(formatPhone("89001234567"), "+7 (900) 123-45-67"));
test("любая страна — просто +цифры", () => assert.equal(formatPhone("+995 599 12 34 56"), "+995599123456"));
test("валиден любой номер 8–15 цифр", () => {
  assert.equal(isValidPhone("+380991234567"), true);
  assert.equal(isValidPhone("+995599123456"), true);
  assert.equal(isValidPhone("+7 (900) 123-45-67"), true);
  assert.equal(isValidPhone("+790012"), false);
});
