import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlumpSearch as Search, PlumpClose as X, PlumpStore, PlumpTicket, SlidersHorizontal } from "@/components/ui/icons";
import { LazyImage } from "@/components/ui/lazy-image";
import {
  fetchShopCategories,
  fetchShopProducts,
  qk,
  type ShopProductListItem,
} from "@/lib/queries";
import { SPECIAL_PACK_COVER } from "@/assets/stickers/special";
import { PlumpPrice } from "@/components/brand/PlumpNum";

export const Route = createFileRoute("/club/shop/")({
  head: () => ({
    meta: [
      { title: "Магазин клуба — HELLHOUND" },
      { name: "description", content: "Мерч клуба, экипировка, цифровые товары." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubShopPage,
});

type Sort = "new" | "price-asc" | "price-desc";
const SORTS: { id: Sort; label: string }[] = [
  { id: "new", label: "Сначала новые" },
  { id: "price-asc", label: "Сначала дешёвые" },
  { id: "price-desc", label: "Сначала дорогие" },
];

function ClubShopPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [sortOpen, setSortOpen] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [activeSub, setActiveSub] = useState<string | null>(null);

  // debounce поиска
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.shopProducts,
    queryFn: fetchShopProducts,
  });
  const { data: catsData } = useQuery({
    queryKey: qk.shopCategories,
    queryFn: fetchShopCategories,
  });

  const products = data?.items ?? [];
  const categories = catsData?.items ?? [];
  const activeCatObj = categories.find((c) => c.id === activeCat);
  const subs = activeCatObj?.subs ?? [];

  const filtered = useMemo(() => {
    let list = products.slice();
    if (activeCat !== "all") {
      list = list.filter((p) => {
        if (activeSub) return p.categoryId === activeCat && p.subcategoryId === activeSub;
        return p.categoryId === activeCat;
      });
    }
    if (debouncedQ) list = list.filter((p) => p.title.toLowerCase().includes(debouncedQ));
    if (sort === "price-asc") list.sort((a, b) => a.priceRub - b.priceRub);
    if (sort === "price-desc") list.sort((a, b) => b.priceRub - a.priceRub);
    return list;
  }, [products, debouncedQ, sort, activeCat, activeSub]);

  const selectCat = (id: string) => {
    setActiveCat(id);
    setActiveSub(null);
  };

  // авто-скролл активного чипса в видимую область
  const catScrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = catScrollRef.current?.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCat]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+96px)] md:max-w-6xl md:px-8 md:py-10">
      {/* iOS large title */}
      <header className="mb-4 md:mb-8">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em] text-foreground md:text-4xl">
          Магазин
        </h1>
        <p className="mt-1 text-[15px] text-muted-foreground md:text-sm">
          Мерч, экипировка, цифровые товары
        </p>
      </header>

      {/* Поиск + иконка сортировки */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск"
            className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.04] pl-9 pr-9 text-[16px] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/[0.08] text-muted-foreground active:scale-95"
              aria-label="Очистить"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-label="Сортировка"
            aria-expanded={sortOpen}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-foreground active:scale-95"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSortOpen(false)}
                aria-hidden
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]/98 p-1 shadow-2xl backdrop-blur-xl">
                {SORTS.map((s) => {
                  const active = s.id === sort;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSort(s.id);
                        setSortOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors active:bg-white/[0.06] ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      <span>{s.label}</span>
                      {active && <span aria-hidden>✓</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Чипсы категорий */}
      <div
        ref={catScrollRef}
        className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Chip
          data-active={activeCat === "all"}
          active={activeCat === "all"}
          color={CHIP_COLORS[0]}
          onClick={() => selectCat("all")}
        >
          Все
        </Chip>
        {categories.map((c, i) => (
          <Chip
            key={c.id}
            data-active={activeCat === c.id}
            active={activeCat === c.id}
            color={CHIP_COLORS[(i + 1) % CHIP_COLORS.length]}
            onClick={() => selectCat(c.id)}
          >
            {c.name}
          </Chip>
        ))}
      </div>

      {/* Подкатегории */}
      {subs.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SubChip active={activeSub === null} onClick={() => setActiveSub(null)}>
            Всё
          </SubChip>
          {subs.map((s) => (
            <SubChip key={s.id} active={activeSub === s.id} onClick={() => setActiveSub(s.id)}>
              {s.name}
            </SubChip>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? "Не получилось загрузить"}
          onRetry={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(debouncedQ)} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
  ...rest
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-medium transition-all active:scale-95 ${
        active
          ? "bg-primary text-primary-foreground"
          : "border border-white/[0.08] bg-white/[0.03] text-muted-foreground"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function SubChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all active:scale-95 ${
        active
          ? "bg-primary/15 text-primary"
          : "bg-white/[0.03] text-muted-foreground/80"
      }`}
    >
      {children}
    </button>
  );
}

function ProductCard({ product }: { product: ShopProductListItem }) {
  const sold = product.stock !== null && product.stock <= 0;
  const cover =
    product.images[0] ?? (product.slug === "stickerpack-special" ? SPECIAL_PACK_COVER : undefined);
  return (
    <Link
      to="/club/shop/$productSlug"
      params={{ productSlug: product.slug }}
      className="group relative block rounded-2xl bg-card transition-all active:scale-[0.98]"
    >
      {product.bonusTickets > 0 && (
        <span className="absolute -right-1 -top-2 z-20 inline-flex rotate-6 items-center gap-1 rounded-lg border-[2px] border-foreground bg-[#B6FF3C] px-2 py-1 font-display text-[10px] font-black uppercase italic tracking-tight text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]">
          <PlumpTicket className="h-3 w-3" />+{product.bonusTickets}
        </span>
      )}
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-surface">
        {cover ? (
          <LazyImage
            src={cover}
            alt={product.title}
            className="absolute inset-0 h-full w-full object-cover md:transition-transform md:duration-500 md:group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground/60">
            <PlumpStore className="h-8 w-8" />
          </div>
        )}
        {sold && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
            Распродано
          </span>
        )}
      </div>
      <div className="rounded-b-2xl px-3 py-2.5">
        <div className="line-clamp-2 text-[14px] font-medium leading-snug text-foreground">
          {product.title}
        </div>
        <div className="mt-1.5 text-[15px] font-semibold tabular-nums text-foreground">
          <PlumpPrice value={product.priceRub} />
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card">
      <div className="skeleton-shimmer aspect-square w-full" />
      <div className="space-y-2 p-3">
        <div className="skeleton-shimmer h-3.5 w-3/4 rounded" />
        <div className="skeleton-shimmer h-4 w-1/3 rounded" />
      </div>
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <PlumpStore className="h-6 w-6" />
      </div>
      <div className="mt-4 text-[15px] font-semibold text-foreground">
        {hasQuery ? "Ничего не нашли" : "Здесь пока пусто"}
      </div>
      <p className="mt-1.5 max-w-[34ch] text-[14px] text-muted-foreground">
        {hasQuery ? "Попробуй другой запрос." : "В этой категории пока ничего нет. Загляни позже."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-red-500/30 bg-red-500/[0.04] px-6 py-12 text-center">
      <div className="text-[15px] font-semibold text-red-300">Ошибка</div>
      <p className="mt-1.5 max-w-[34ch] text-[14px] text-muted-foreground/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border border-white/[0.1] px-5 py-2.5 text-[14px] font-semibold active:scale-95"
      >
        Повторить
      </button>
    </div>
  );
}
