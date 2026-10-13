import { test } from "node:test";
import { strict as assert } from "node:assert";
import { formatRuPhone, isValidRuPhone } from "./phone";
test("8 → +7", () => assert.equal(formatRuPhone("89001234567"), "+7 (900) 123-45-67"));
test("valid only with 11 digits", () => { assert.equal(isValidRuPhone("+7 (900) 123-45"), false); assert.equal(isValidRuPhone("+7 (900) 123-45-67"), true); });
