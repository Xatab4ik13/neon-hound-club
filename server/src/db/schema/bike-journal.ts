import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, date, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { bikes } from "./profile.js";

export const bikeServiceEntries = pgTable(
  "bike_service_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bikeId: uuid("bike_id").notNull().references(() => bikes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    date: date("date").notNull(),
    mileage: integer("mileage").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("bike_service_user_idx").on(t.userId),
    bikeIdx: index("bike_service_bike_idx").on(t.bikeId),
  }),
);

export const bikeRides = pgTable(
  "bike_rides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bikeId: uuid("bike_id").notNull().references(() => bikes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    km: integer("km").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("bike_rides_user_idx").on(t.userId),
    bikeIdx: index("bike_rides_bike_idx").on(t.bikeId),
  }),
);

export const bikeDocuments = pgTable(
  "bike_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bikeId: uuid("bike_id").notNull().references(() => bikes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(),
    number: varchar("number", { length: 80 }),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    photos: jsonb("photos").$type<string[]>().notNull().default([]),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("bike_documents_user_idx").on(t.userId),
    bikeIdx: index("bike_documents_bike_idx").on(t.bikeId),
  }),
);

export type BikeServiceEntryRow = typeof bikeServiceEntries.$inferSelect;
export type BikeRideRow = typeof bikeRides.$inferSelect;
export type BikeDocumentRow = typeof bikeDocuments.$inferSelect;
