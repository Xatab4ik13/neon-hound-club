import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { PRODUCTS, type Product } from "@/data/products";
import { PageHeader } from "@/components/club/PageHeader";

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

type Cat = { slug: string; name: string };

const CATEGORIES: Cat[] = [
  { slug: "all", name: "Всё" },
  { slug: "apparel", name: "Одежда" },
  { slug: "gear", name: "Экипировка" },
  { slug: "accessories", name: "Аксессуары" },
  { slug: "garage", name: "Гараж" },
  { slug: "digital", name: "Цифровые" },
];

function ClubShopPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (needle && !p.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [cat, q]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 md:py-8">
      <PageHeader title="Магазин клуба" subtitle="Мерч, экипировка, цифровые товары" />

      {/* iOS-style search field */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по магазину"
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

      {/* Category chips — horizontal scroll, iOS segmented feel */}
      <div
        ref={scrollerRef}
        className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CATEGORIES.map((c) => {
          const active = c.slug === cat;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCat(c.slug)}
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

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Ничего не нашли
          </div>
          <p className="mt-2 max-w-[28ch] text-sm text-muted-foreground/80">
            Попробуй другую категорию или измени запрос.
          </p>
        </div>
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
