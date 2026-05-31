import { ChevronLeft, ChevronRight } from "lucide-react";

export const ADMIN_PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export type AdminPageSize = (typeof ADMIN_PAGE_SIZE_OPTIONS)[number];

type Props = {
  page: number;
  pageSize: AdminPageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: AdminPageSize) => void;
  className?: string;
};

/**
 * Единый пагинатор для админских списков.
 * Дефолт 50, опции 50/100/200. Показывает текущую страницу, total, prev/next.
 */
export function AdminPager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div
      className={
        "flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-[12px] text-muted-foreground " +
        (className ?? "")
      }
    >
      <div className="flex items-center gap-2">
        <span>На странице:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as AdminPageSize)}
          className="h-8 rounded border border-white/10 bg-background px-2 text-foreground"
        >
          {ADMIN_PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span className="ml-2">
          {from}–{to} из {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange(page - 1)}
          className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-2 text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Назад
        </button>
        <span className="px-2">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => canNext && onPageChange(page + 1)}
          className="inline-flex h-8 items-center gap-1 rounded border border-white/10 px-2 text-foreground hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Вперёд <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
