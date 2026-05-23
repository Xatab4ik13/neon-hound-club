import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { orders } from "./shop.js";

/**
 * Владение стикер-паком пользователем.
 * pack_slug — короткий ключ пака ('special' и т.д.).
 * Гранится при оплате заказа, где есть товар с products.sticker_pack_slug = pack_slug.
 */
export const userStickerPacks = pgTable(
  "user_sticker_packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packSlug: varchar("pack_slug", { length: 64 }).notNull(),
    source: varchar("source", { length: 24 }).notNull().default("purchase"),
    refOrderId: uuid("ref_order_id").references(() => orders.id, { onDelete: "set null" }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("user_sticker_packs_uniq").on(t.userId, t.packSlug),
    userIdx: index("user_sticker_packs_user_idx").on(t.userId),
  }),
);

export type UserStickerPack = typeof userStickerPacks.$inferSelect;
