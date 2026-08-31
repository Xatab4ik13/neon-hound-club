import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Промокоды магазина.
 *
 * Правила:
 *  - скидка только в процентах;
 *  - скидка действует ТОЛЬКО на товары, доставка СДЭК не скидывается;
 *  - промокод персональный: генерится под юзера, воспользоваться может только он;
 *  - одноразовый: после оплаты заказа ставим used_at + used_order_id;
 *  - есть срок годности expires_at (задаёт админ).
 *
 * Со скидкой Hell Pass не суммируется — берём большую из двух (см. lib/promo.ts).
 */
export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 32 }).notNull(),
    discountPct: integer("discount_pct").notNull().default(0),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    /**
     * Товарный промокод: скидка привязана к конкретному товару.
     * Работает ТОЛЬКО если в корзине ровно этот товар и количество = 1.
     * За такой заказ билеты не начисляются.
     */
    productId: uuid("product_id"),
    /**
     * Промокод на группу товаров (например «любые носки»).
     * Если задан — код срабатывает, если в корзине есть любой из этих товаров,
     * скидка идёт на 1 шт. самого дорогого подходящего.
     */
    productIds: uuid("product_ids").array(),
    note: varchar("note", { length: 200 }),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    usedOrderId: uuid("used_order_id"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("promo_codes_user_idx").on(t.userId),
    expiresIdx: index("promo_codes_expires_idx").on(t.expiresAt),
  }),
);

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
