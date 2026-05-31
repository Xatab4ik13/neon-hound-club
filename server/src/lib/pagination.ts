import { z } from "zod";

// Единая пагинация для админских списков.
// Дефолт 50, опции 50/100/200. Возвращаем { items, total, page, pageSize }.

export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v): v is PageSize => (PAGE_SIZE_OPTIONS as readonly number[]).includes(v), {
      message: "pageSize must be 50, 100 or 200",
    })
    .default(50),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Парсит ?page=&pageSize= из query. Кидает 400 при невалидных значениях. */
export function parsePagination(query: unknown): Pagination & { offset: number } {
  const parsed = paginationSchema.safeParse(query ?? {});
  if (!parsed.success) {
    // мягкий fallback на дефолт
    return { page: 1, pageSize: 50, offset: 0 };
  }
  return { ...parsed.data, offset: (parsed.data.page - 1) * parsed.data.pageSize };
}

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
