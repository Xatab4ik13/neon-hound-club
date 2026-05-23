import { pgTable, uuid, varchar, integer, text, timestamp, boolean, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const economyCategories = pgTable("economy_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  kind: varchar("kind", { length: 16 }).notNull().default("expense"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const economyPartners = pgTable("economy_partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  share: integer("share").notNull().default(0),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const economyOperations = pgTable(
  "economy_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    type: varchar("type", { length: 16 }).notNull(),
    category: varchar("category", { length: 80 }).notNull(),
    amountRub: integer("amount_rub").notNull(),
    note: text("note").notNull().default(""),
    source: varchar("source", { length: 16 }).notNull().default("manual"),
    refType: varchar("ref_type", { length: 32 }),
    refId: uuid("ref_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    occurredIdx: index("eo_occurred_idx").on(t.occurredAt),
    typeIdx: index("eo_type_idx").on(t.type),
    refUniq: uniqueIndex("eo_ref_uniq").on(t.refType, t.refId),
  }),
);

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
});

export type EconomyOperation = typeof economyOperations.$inferSelect;
export type EconomyCategory = typeof economyCategories.$inferSelect;
export type EconomyPartner = typeof economyPartners.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
