import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { PRODUCTS, type Product } from "@/data/products";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Магазин — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Мерч HELLHOUND, товары от партнёров и б/у вещи участников клуба.",
      },
      { property: "og:title", content: "Магазин — HELLHOUND Racing Club" },
      {
        property: "og:description",
        content:
          "Мерч HELLHOUND, товары от партнёров и б/у вещи участников клуба.",
      },
    ],
  }),
  component: ShopPage,
});

type Subcategory = { slug: string; name: string; count: number };
type Category = {
  slug: string;
  name: string;
  count: number;
  sub: Subcategory[];
};

const CATEGORIES: Category[] = [
  { slug: "all", name: "Всё", count: 24, sub: [] },
  {
    slug: "apparel",
    name: "Одежда",
    count: 12,
    sub: [
      { slug: "hoodies", name: "Худи", count: 4 },
      { slug: "tees", name: "Футболки", count: 5 },
      { slug: "longsleeves", name: "Лонгсливы", count: 2 },
      { slug: "jackets", name: "Куртки", count: 1 },
    ],
  },
  {
    slug: "gear",
    name: "Экипировка",
    count: 7,
    sub: [
      { slug: "gloves", name: "Перчатки", count: 3 },
      { slug: "elbows", name: "Налокотники", count: 2 },
      { slug: "back", name: "Защита спины", count: 1 },
      { slug: "helmets", name: "Шлемы", count: 1 },
    ],
  },
  {
    slug: "accessories",
    name: "Аксессуары",
    count: 5,
    sub: [
      { slug: "caps", name: "Кепки", count: 2 },
      { slug: "socks", name: "Носки", count: 1 },
      { slug: "bags", name: "Сумки", count: 2 },
    ],
  },
  {
    slug: "garage",
    name: "Гараж",
    count: 6,
    sub: [
      { slug: "posters", name: "Постеры", count: 2 },
      { slug: "stickers", name: "Стикеры", count: 3 },
      { slug: "keychains", name: "Брелоки", count: 1 },
    ],
  },
];

const SORTS = [
  { id: "new", label: "Новые" },
  { id: "price-asc", label: "Цена ↑" },
  { id: "price-desc", label: "Цена ↓" },
];

function ShopPage() {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    apparel: true,
  });
  const [sort, setSort] = useState("new");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const filtered = useMemo(() => {
    let list = PRODUCTS.filter((p) => {
      if (activeCat === "all") return true;
      if (activeSub) return p.category === activeCat && p.sub === activeSub;
      return p.category === activeCat;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [activeCat, activeSub, sort]);

  const toggleCat = (slug: string) => {
    setOpenCats((s) => ({ ...s, [slug]: !s[slug] }));
  };

  const selectCat = (slug: string) => {
    setActiveCat(slug);
    setActiveSub(null);
    setSidebarOpen(false);
    if (slug !== "all") setOpenCats((s) => ({ ...s, [slug]: true }));
  };

  const selectSub = (cat: string, sub: string) => {
    setActiveCat(cat);
    setActiveSub(sub);
    setSidebarOpen(false);
  };

  const activeCategoryObj = CATEGORIES.find((c) => c.slug === activeCat);
  const activeSubObj = activeCategoryObj?.sub.find((s) => s.slug === activeSub);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8">
          {/* Заголовок */}
          <header className="mb-10 flex flex-col gap-3">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              Магазин
            </div>
            <h1 className="font-display text-5xl uppercase tracking-tighter md:text-6xl">
              Магазин клуба
            </h1>
            <p className="max-w-[60ch] text-pretty text-muted-foreground">
              Мерч HELLHOUND, товары от партнёров и б/у вещи участников клуба. Всё в одном месте.
            </p>
          </header>

          {/* Mobile filter trigger — big asymmetric CTA */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
            className="group relative mb-8 flex w-full items-center justify-between gap-3 overflow-hidden bg-primary px-6 py-5 text-left transition-transform active:scale-[0.98] lg:hidden"
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 12px)",
              }}
            />
            <span className="relative z-10 flex items-center gap-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" className="text-black">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="10" y1="18" x2="14" y2="18" />
              </svg>
              <span className="font-display text-2xl italic font-bold uppercase tracking-wider text-black">
                Категории
              </span>
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" className="relative z-10 text-black">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* SIDEBAR */}
            {/* Mobile backdrop */}
            <div
              onClick={() => setSidebarOpen(false)}
              aria-hidden
              className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
                sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />
            <aside
              role={sidebarOpen ? "dialog" : undefined}
              aria-modal={sidebarOpen ? true : undefined}
              className={`fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-[380px] transform flex-col overflow-hidden bg-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:relative lg:inset-auto lg:z-auto lg:w-auto lg:max-w-none lg:transform-none lg:bg-transparent ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              }`}
            >
              {/* Rally stripes bg (mobile only) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.04] lg:hidden"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 20px)",
                }}
              />

              {/* Mobile header */}
              <div className="relative z-10 flex items-center justify-between px-8 pt-12 pb-8 lg:hidden">
                <span
                  className="font-display text-2xl italic uppercase tracking-tighter text-primary"
                  style={{ textShadow: "0 0 10px color-mix(in oklab, var(--primary) 30%, transparent)" }}
                >
                  Категории
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Закрыть"
                  className="group relative flex h-12 w-12 items-center justify-center transition-transform active:scale-90"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 border border-primary/30 transition-colors duration-500 group-hover:border-primary"
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className="relative z-10 text-primary">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="relative z-10 flex-1 overflow-y-auto border-t border-white/[0.04] px-6 pb-10 pt-6 lg:sticky lg:top-28 lg:overflow-visible lg:border-t-0 lg:px-0 lg:pt-0">
                <div className="mb-5 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground lg:block">
                  Каталог
                </div>
                <ul className="flex flex-col gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCat === cat.slug && !activeSub;
                    const hasSub = cat.sub.length > 0;
                    const isOpen = hasSub
                      ? (openCats[cat.slug] ?? false) || activeCat === cat.slug
                      : false;

                    return (
                      <li key={cat.slug} className="flex flex-col gap-2">
                        <div
                          className={`relative transition-transform duration-300 ${
                            isActive ? "translate-x-2" : "hover:translate-x-1"
                          }`}
                        >
                          {/* Pink accent bar (active only) */}
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute -left-1.5 top-0 bottom-0 z-10 w-[5px] bg-primary shadow-[0_0_15px_hsl(var(--primary)/0.6)]"
                            />
                          )}

                          <button
                            onClick={() => {
                              selectCat(cat.slug);
                              if (hasSub) toggleCat(cat.slug);
                            }}
                            style={{
                              clipPath:
                                "polygon(0 0, 92% 0, 100% 100%, 0% 100%)",
                            }}
                            className={`group flex w-full items-center px-5 py-3 text-left transition-colors duration-200 ${
                              isActive
                                ? "bg-primary"
                                : "border-l-2 border-transparent bg-card hover:border-primary hover:bg-surface"
                            }`}
                          >
                            <span
                              className={`font-display text-xl font-medium uppercase tracking-wider transition-colors ${
                                isActive
                                  ? "text-background"
                                  : "text-muted-foreground group-hover:text-foreground"
                              }`}
                            >
                              {cat.name}
                            </span>
                          </button>
                        </div>

                        {hasSub && (
                          <div
                            className="grid transition-all duration-300 ease-out"
                            style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                          >
                            <div className="overflow-hidden">
                              <ul className="ml-5 flex flex-col gap-1 pt-1">
                                {cat.sub.map((s, i) => {
                                  const subActive =
                                    activeCat === cat.slug &&
                                    activeSub === s.slug;
                                  return (
                                    <li key={s.slug}>
                                      <button
                                        onClick={() =>
                                          selectSub(cat.slug, s.slug)
                                        }
                                        style={{
                                          animation: isOpen
                                            ? `shop-card-in 0.35s ease-out backwards`
                                            : undefined,
                                          animationDelay: isOpen
                                            ? `${i * 50}ms`
                                            : undefined,
                                        }}
                                        className="group/sub flex w-full items-center gap-3 py-1 transition-transform duration-200 hover:translate-x-1"
                                      >
                                        <span
                                          aria-hidden
                                          className={`h-4 w-1 transition-colors ${
                                            subActive
                                              ? "bg-primary"
                                              : "bg-border group-hover/sub:bg-primary"
                                          }`}
                                        />
                                        <span
                                          className={`font-display text-sm uppercase tracking-widest transition-colors ${
                                            subActive
                                              ? "text-foreground"
                                              : "text-muted-foreground group-hover/sub:text-foreground"
                                          }`}
                                        >
                                          {s.name}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* GRID */}
            <section>
              {/* Toolbar */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-2xl uppercase tracking-tight">
                    {activeSubObj?.name ?? activeCategoryObj?.name ?? "Всё"}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {filtered.length} {filtered.length === 1 ? "товар" : "товаров"}
                  </span>
                </div>

                <div className="flex items-center gap-1 rounded-full border border-border p-1">
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSort(s.id)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest transition-colors ${
                        sort === s.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards */}
              {filtered.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
                  <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Пока пусто
                  </div>
                  <p className="mt-2 max-w-[28ch] text-sm text-muted-foreground/80">
                    В этой категории ещё нет товаров. Скоро завезём.
                  </p>
                </div>
              ) : (
                <div
                  key={`${activeCat}-${activeSub}-${sort}`}
                  className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
                >
                  {filtered.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [hover, setHover] = useState(false);

  const tone = product.badge?.tone ?? "primary";
  const badgeClass =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "danger"
        ? "bg-foreground text-background"
        : "bg-background/80 text-muted-foreground border border-border";

  return (
    <Link
      to="/shop/$productSlug"
      params={{ productSlug: product.slug }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        animation: "shop-card-in 0.5s ease-out backwards",
        animationDelay: `${index * 60}ms`,
      }}
      className="group relative block overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.3)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent opacity-60" />

        {product.badge && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-widest ${badgeClass}`}
          >
            {product.badge.label}
          </span>
        )}

        {/* Quick add */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label={`Добавить ${product.name} в корзину`}
          className={`absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all duration-300 ${
            hover
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          В корзину
          <span aria-hidden>+</span>
        </button>
      </div>

      <div className="flex items-baseline justify-between gap-3 px-4 py-4">
        <h3 className="text-sm font-medium uppercase tracking-wider">
          {product.name}
        </h3>
        <span className="whitespace-nowrap font-mono text-sm text-foreground">
          {product.price.toLocaleString("ru-RU")} ₽
        </span>
      </div>
    </Link>
  );
}
