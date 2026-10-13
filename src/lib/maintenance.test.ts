import { test } from "node:test";
import { strict as assert } from "node:assert";
import { shouldShowMaintenance } from "./maintenance";
test("hhr.pro shows stub", () => assert.equal(shouldShowMaintenance("hhr.pro", "/"), true));
test("register blocked", () => assert.equal(shouldShowMaintenance("hhr.pro", "/register"), true));
test("admin stays open", () => assert.equal(shouldShowMaintenance("hhr.pro", "/admin/telegram"), false));
test("tg subdomain open", () => assert.equal(shouldShowMaintenance("tg.hhr.pro", "/tg"), false));
