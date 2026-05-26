import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Баннеры карусели на /club (компонент FeedHeroCarousel).
 * Управляет админ из /admin/banners. Картинка — фон, текст рисуется поверх.
 *
 * Поля:
 *   title     — крупный заголовок (рендерим фирменным шрифтом). До 120 символов, можно \n для переноса.
 *   eyebrow   — мелкая надстрочная строка над заголовком (например «Лимит 50 шт.»). Опц.
 *   ctaLabel  — текст кнопки. По умолчанию «Открыть».
 *   ctaHref   — куда ведёт кнопка. Внутренний путь («/club/shop») или внешний URL.
 *   imageUrl  — публичный URL картинки-фона (грузим через /api/v1/uploads/direct kind=shop).
 *   sort      — порядок (меньше — раньше).
 *   active    — выключатель без удаления.
 */
export const homeBanners = pgTable(
  "home_banners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 120 }).notNull(),
    eyebrow: varchar("eyebrow", { length: 120 }).notNull().default(""),
    ctaLabel: varchar("cta_label", { length: 40 }).notNull().default("Открыть"),
    ctaHref: varchar("cta_href", { length: 300 }).notNull(),
    imageUrl: text("image_url").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeSortIdx: index("home_banners_active_sort_idx").on(t.active, t.sort),
  }),
);

export type HomeBanner = typeof homeBanners.$inferSelect;
export type NewHomeBanner = typeof homeBanners.$inferInsert;
