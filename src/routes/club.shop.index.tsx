import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ShoppingBag, Ticket } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { fetchShopProducts, qk, type ShopProductListItem } from "@/lib/queries";

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
  { id: "new", label: "Новые" },
  { id: "price-asc", label: "Дешевле" },
  { id: "price-desc", label: "Дороже" },
];

function ClubShopPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.shopProducts,
    queryFn: fetchShopProducts,
  });

  const filtered = useMemo(() => {
    const list = (data?.items ?? []).slice();
    const needle = q.trim().toLowerCase();
    const out = needle ? list.filter((p) => p.title.toLowerCase().includes(needle)) : list;
    if (sort === "price-asc") out.sort((a, b) => a.priceRub - b.priceRub);
    if (sort === "price-desc") out.sort((a, b) => b.priceRub - a.priceRub);
    return out;
  }, [data, q, sort]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 md:py-8">
      <PageHeader title="Магазин клуба" subtitle="Мерч, экипировка, цифровые товары" />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск"
            className="h-11 w-full rounded-xl border border-white/[0.06] bg-white/[0.04] pl-9 pr-9 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
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
      </div>

      {/* Sort chips */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SORTS.map((s) => {
          const active = s.id === sort;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`shrink-0 rounded-full px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "border border-white/[0.08] bg-white/[0.03] text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-2xl border border-white/[0.05] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? "Не получилось загрузить"} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(q)} />
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

function ProductCard({ product }: { product: ShopProductListItem }) {
  const sold = product.stock !== null && product.stock <= 0;
  const cover = product.images[0];
  return (
    <Link
      to="/club/shop/$productSlug"
      params={{ productSlug: product.slug }}
      className="group block overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 transition-all active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        {cover ? (
          <img src={cover} alt={product.title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground/60">
            <ShoppingBag className="h-8 w-8" />
          </div>
        )}
        {sold && (
          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            Распродано
          </span>
        )}
        {product.bonusTickets > 0 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">
            <Ticket className="h-3 w-3" />+{product.bonusTickets}
          </span>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
          {product.title}
        </div>
        <div className="mt-1.5 font-mono text-[13px] font-bold tabular-nums text-primary">
          {product.priceRub.toLocaleString("ru-RU")} ₽
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <ShoppingBag className="h-5 w-5" />
      </div>
      <div className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {hasQuery ? "Ничего не нашли" : "Магазин пуст"}
      </div>
      <p className="mt-2 max-w-[34ch] text-sm text-muted-foreground/80">
        {hasQuery
          ? "Попробуй другой запрос."
          : "Hell ещё ничего не добавил. Заглядывай позже — мерч появится здесь."}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-red-500/30 bg-red-500/[0.04] px-6 py-12 text-center">
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
        Ошибка
      </div>
      <p className="mt-2 max-w-[34ch] text-sm text-muted-foreground/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border border-white/[0.1] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider active:scale-95"
      >
        Повторить
      </button>
    </div>
  );
}
