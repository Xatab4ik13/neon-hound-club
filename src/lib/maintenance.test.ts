import { test } from "node:test";
import { strict as assert } from "node:assert";
import { shouldShowMaintenance } from "./maintenance";
test("hhr.pro open after restore", () => assert.equal(shouldShowMaintenance("hhr.pro", "/"), false));
test("login open after restore", () => assert.equal(shouldShowMaintenance("hhr.pro", "/login"), false));
test("tg subdomain open", () => assert.equal(shouldShowMaintenance("tg.hhr.pro", "/tg"), false));
