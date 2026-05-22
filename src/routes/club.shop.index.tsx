import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { PRODUCTS, SOURCE_LABEL, type Product, type ProductSource } from "@/data/products";
import { PageHeader } from "@/components/club/PageHeader";
import { IOSSheet } from "@/components/ios/IOSSheet";

export const Route = createFileRoute("/club/shop/")({
  head: () => ({
    meta: [
      { title: "Магазин клуба — HELLHOUND" },
      { name: "description", content: "Мерч клуба, экипировка и цифровые товары." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubShopPage,
});

type Cat = { slug: string; name: string; subs: { slug: string; name: string }[] };

const SUB_LABELS: Record<string, string> = {
  hoodies: "Худи",
  tees: "Футболки",
  longsleeves: "Лонгсливы",
  jackets: "Куртки",
  gloves: "Перчатки",
  elbows: "Налокотники",
  back: "Защита спины",
  helmets: "Шлемы",
  caps: "Кепки",
  socks: "Носки",
  bags: "Сумки",
  posters: "Постеры",
  stickers: "Стикеры",
  keychains: "Брелоки",
  postcards: "Открытки Hell",
};

const CATEGORIES: Cat[] = [
  { slug: "all", name: "Всё", subs: [] },
  {
    slug: "apparel",
    name: "Одежда",
    subs: [
      { slug: "hoodies", name: "Худи" },
      { slug: "tees", name: "Футболки" },
      { slug: "longsleeves", name: "Лонгсливы" },
      { slug: "jackets", name: "Куртки" },
    ],
  },
  {
    slug: "gear",
    name: "Экипировка",
    subs: [
      { slug: "gloves", name: "Перчатки" },
      { slug: "elbows", name: "Налокотники" },
      { slug: "back", name: "Защита спины" },
      { slug: "helmets", name: "Шлемы" },
    ],
  },
  {
    slug: "accessories",
    name: "Аксессуары",
    subs: [
      { slug: "caps", name: "Кепки" },
      { slug: "socks", name: "Носки" },
      { slug: "bags", name: "Сумки" },
    ],
  },
  {
    slug: "garage",
    name: "Гараж",
    subs: [
      { slug: "posters", name: "Постеры" },
      { slug: "stickers", name: "Стикеры" },
      { slug: "keychains", name: "Брелоки" },
    ],
  },
  {
    slug: "digital",
    name: "Цифровые",
    subs: [{ slug: "postcards", name: "Открытки Hell" }],
  },
];

type Sort = "new" | "price-asc" | "price-desc";
const SORTS: { id: Sort; label: string }[] = [
  { id: "new", label: "Новые" },
  { id: "price-asc", label: "Сначала дешевле" },
  { id: "price-desc", label: "Сначала дороже" },
];

const SOURCES: { id: ProductSource; label: string }[] = [
  { id: "hellhound", label: SOURCE_LABEL.hellhound },
  { id: "partner", label: SOURCE_LABEL.partner },
  { id: "used", label: SOURCE_LABEL.used },
];

function ClubShopPage() {
  const [cat, setCat] = useState<string>("all");
  const [sub, setSub] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [sources, setSources] = useState<ProductSource[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeCat = CATEGORIES.find((c) => c.slug === cat) ?? CATEGORIES[0];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (sub && p.sub !== sub) return false;
      if (sources.length > 0 && !sources.includes(p.source)) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [cat, sub, q, sort, sources]);

  const selectCat = (slug: string) => {
    setCat(slug);
    setSub(null);
  };

  const toggleSource = (s: ProductSource) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const resetFilters = () => {
    setSort("new");
    setSources([]);
  };

  const activeFilterCount = (sort !== "new" ? 1 : 0) + (sources.length > 0 ? 1 : 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 md:py-8">
      <PageHeader title="Магазин клуба" subtitle="Мерч, экипировка, цифровые товары" />

      {/* Search + filters row */}
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
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors active:scale-95 ${
            activeFilterCount > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-white/[0.06] bg-white/[0.04] text-foreground"
          }`}
          aria-label="Фильтры"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Category chips */}
      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const active = c.slug === cat;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => selectCat(c.slug)}
              className={`shrink-0 rounded-full px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                active
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.6)]"
                  : "border border-white/[0.08] bg-white/[0.03] text-muted-foreground"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/* Sub-category chips (smaller, secondary) */}
      {activeCat.subs.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSub(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
              sub === null
                ? "bg-white/[0.08] text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Все
          </button>
          {activeCat.subs.map((s) => {
            const active = sub === s.slug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => setSub(s.slug)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all active:scale-95 ${
                  active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Result counter */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {filtered.length} {pluralProducts(filtered.length)}
        </span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary active:opacity-60"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Ничего не нашли
          </div>
          <p className="mt-2 max-w-[28ch] text-sm text-muted-foreground/80">
            Попробуйте другую категорию или сбросьте фильтры.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Filter sheet */}
      <IOSSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Фильтры"
        doneLabel="Готово"
      >
        <section className="mb-6">
          <h3 className="mb-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Сортировка
          </h3>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {SORTS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSort(s.id)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left active:bg-white/[0.04]"
                >
                  <span className="text-[15px] font-medium text-foreground">{s.label}</span>
                  {sort === s.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <h3 className="mb-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Источник
          </h3>
          <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
            {SOURCES.map((s) => {
              const active = sources.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggleSource(s.id)}
                    className="flex w-full items-center justify-between px-4 py-3.5 text-left active:bg-white/[0.04]"
                  >
                    <span className="text-[15px] font-medium text-foreground">{s.label}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-foreground active:bg-white/[0.06]"
          >
            Сбросить фильтры
          </button>
        )}
      </IOSSheet>
    </main>
  );
}

function pluralProducts(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "товар";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "товара";
  return "товаров";
}

function ProductCard({ product }: { product: Product }) {
  const sold = product.badge?.label.toLowerCase() === "распродано";
  return (
    <Link
      to="/club/shop/$productSlug"
      params={{ productSlug: product.slug }}
      className="group block overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 transition-all active:scale-[0.98]"
    >
      <div className="relative aspect-square overflow-hidden bg-surface">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {product.badge && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider backdrop-blur ${
              product.badge.tone === "danger"
                ? "bg-red-500/90 text-white"
                : product.badge.tone === "primary"
                  ? "bg-primary/90 text-primary-foreground"
                  : "bg-black/70 text-foreground"
            }`}
          >
            {product.badge.label}
          </span>
        )}
        {product.ticketsBonus && product.ticketsBonus > 0 ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">
            +{product.ticketsBonus} 🎟
          </span>
        ) : null}
      </div>
      <div className="px-3 py-2.5">
        <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
          {product.name}
        </div>
        {product.sub && SUB_LABELS[product.sub] && (
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {SUB_LABELS[product.sub]}
          </div>
        )}
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[13px] font-bold tabular-nums text-primary">
            {product.price.toLocaleString("ru-RU")} ₽
          </span>
          {sold && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              нет
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
