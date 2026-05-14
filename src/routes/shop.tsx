import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import founderHoodie from "@/assets/founder-hoodie.jpg";
import pitGloves from "@/assets/pit-gloves.jpg";
import garageKey from "@/assets/garage-key.jpg";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Магазин — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Лимитированный мерч и экипировка HELLHOUND. Худи, футболки, перчатки, аксессуары.",
      },
      { property: "og:title", content: "Магазин — HELLHOUND Racing Club" },
      {
        property: "og:description",
        content: "Лимитированный мерч и экипировка HELLHOUND.",
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
  {
    slug: "all",
    name: "Всё",
    count: 24,
    sub: [],
  },
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

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  badge?: { label: string; tone: "primary" | "muted" | "danger" };
  category: string;
  sub?: string;
};

const PRODUCTS: Product[] = [
  { id: "1", name: "Худи Founder v1", price: 12990, image: founderHoodie, badge: { label: "Распродано", tone: "muted" }, category: "apparel", sub: "hoodies" },
  { id: "2", name: "Перчатки Пит-крю", price: 8490, image: pitGloves, badge: { label: "Осталось 24", tone: "primary" }, category: "gear", sub: "gloves" },
  { id: "3", name: "Ключ от гаража", price: 2490, image: garageKey, category: "garage", sub: "keychains" },
  { id: "4", name: "Худи Track v2", price: 13990, image: founderHoodie, badge: { label: "Новинка", tone: "primary" }, category: "apparel", sub: "hoodies" },
  { id: "5", name: "Футболка Pack 01", price: 3990, image: founderHoodie, category: "apparel", sub: "tees" },
  { id: "6", name: "Перчатки Race Day", price: 9990, image: pitGloves, category: "gear", sub: "gloves" },
  { id: "7", name: "Кепка Box Logo", price: 2990, image: garageKey, badge: { label: "Hot", tone: "danger" }, category: "accessories", sub: "caps" },
  { id: "8", name: "Стикерпак №1", price: 590, image: garageKey, category: "garage", sub: "stickers" },
  { id: "9", name: "Лонгслив Crew", price: 5490, image: founderHoodie, category: "apparel", sub: "longsleeves" },
  { id: "10", name: "Налокотники Pro", price: 4490, image: pitGloves, category: "gear", sub: "elbows" },
  { id: "11", name: "Сумка через плечо", price: 6490, image: garageKey, category: "accessories", sub: "bags" },
  { id: "12", name: "Постер Yamaha R6", price: 1490, image: garageKey, category: "garage", sub: "posters" },
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
              Лимитированный мерч
            </h1>
            <p className="max-w-[60ch] text-pretty text-muted-foreground">
              Только то, что носим сами. Маленькие тиражи, плотные ткани, без перевыпусков.
            </p>
          </header>

          {/* Mobile filter trigger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium uppercase tracking-widest text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary lg:hidden"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Категории
          </button>

          <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
            {/* SIDEBAR */}
            <aside
              className={`fixed inset-0 z-40 transform bg-background/95 backdrop-blur-md transition-transform duration-300 lg:relative lg:inset-auto lg:z-auto lg:transform-none lg:bg-transparent lg:backdrop-blur-none ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border px-6 py-4 lg:hidden">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Категории
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Закрыть"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <nav className="px-6 pb-10 pt-6 lg:sticky lg:top-28 lg:px-0 lg:pt-0">
                <div className="mb-4 hidden font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground lg:block">
                  Каталог
                </div>
                <ul className="space-y-1">
                  {CATEGORIES.map((cat) => {
                    const isActive = activeCat === cat.slug;
                    const isOpen = openCats[cat.slug] ?? false;
                    const hasSub = cat.sub.length > 0;

                    return (
                      <li key={cat.slug}>
                        <div className="flex items-stretch">
                          <button
                            onClick={() => selectCat(cat.slug)}
                            className={`group relative flex flex-1 items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium uppercase tracking-wider transition-colors ${
                              isActive && !activeSub
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={`h-1 w-1 rounded-full transition-all duration-300 ${
                                  isActive && !activeSub
                                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                                    : "bg-muted-foreground/30 group-hover:bg-foreground/60"
                                }`}
                              />
                              {cat.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground/70">
                              {cat.count}
                            </span>
                          </button>
                          {hasSub && (
                            <button
                              onClick={() => toggleCat(cat.slug)}
                              aria-label={isOpen ? "Свернуть" : "Развернуть"}
                              className="ml-1 flex w-8 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
                            >
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform duration-300 ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                              >
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {hasSub && (
                          <div
                            className="grid transition-all duration-300 ease-out"
                            style={{
                              gridTemplateRows: isOpen ? "1fr" : "0fr",
                            }}
                          >
                            <ul className="overflow-hidden">
                              <div className="ml-5 mt-1 space-y-0.5 border-l border-border pl-3">
                                {cat.sub.map((s) => {
                                  const subActive =
                                    activeCat === cat.slug && activeSub === s.slug;
                                  return (
                                    <li key={s.slug}>
                                      <button
                                        onClick={() => selectSub(cat.slug, s.slug)}
                                        className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs uppercase tracking-wider transition-colors ${
                                          subActive
                                            ? "text-primary"
                                            : "text-muted-foreground/80 hover:text-foreground"
                                        }`}
                                      >
                                        <span className="flex items-center gap-2">
                                          {subActive && (
                                            <span className="h-px w-3 bg-primary" />
                                          )}
                                          {s.name}
                                        </span>
                                        <span className="font-mono text-[10px] opacity-60">
                                          {s.count}
                                        </span>
                                      </button>
                                    </li>
                                  );
                                })}
                              </div>
                            </ul>
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
                  className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
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
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        animation: "shop-card-in 0.5s ease-out backwards",
        animationDelay: `${index * 60}ms`,
      }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-20px_hsl(var(--primary)/0.3)]"
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
    </article>
  );
}
