import { describe, expect, it } from "vitest";
import { shouldShowMaintenance } from "./maintenance";
describe("maintenance", () => {
  it("hhr.pro shows stub", () => expect(shouldShowMaintenance("hhr.pro", "/")).toBe(true));
  it("register blocked", () => expect(shouldShowMaintenance("hhr.pro", "/register")).toBe(true));
  it("admin stays open", () => expect(shouldShowMaintenance("hhr.pro", "/admin/telegram")).toBe(false));
  it("tg subdomain open", () => expect(shouldShowMaintenance("tg.hhr.pro", "/tg")).toBe(false));
});
