import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { hhToast } from "@/lib/hh-toast";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { useCart } from "@/hooks/use-cart";
import { ApiError } from "@/lib/api";
import { fetchShopProduct, qk, type ShopProduct } from "@/lib/queries";

function ticketsWordPdp(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "билет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "билета";
  return "билетов";
}


export const Route = createFileRoute("/shop/$productSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Товар — HELLHOUND Racing Club` },
      { property: "og:title", content: `Товар — HELLHOUND Racing Club` },
      { name: "robots", content: params.productSlug ? undefined : "noindex" } as never,
    ].filter(Boolean) as never,
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-32 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          404
        </div>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-tighter">
          Товар не найден
        </h1>
        <Link
          to="/shop"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
        >
          ← В магазин
        </Link>
      </main>
      <Footer />
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-3xl px-6 py-32 text-center">
          <h1 className="font-display text-3xl uppercase tracking-tighter">
            Что-то сломалось
          </h1>
          <p className="mt-3 text-muted-foreground">{error.message}</p>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-8 rounded-full border border-border px-5 py-2.5 text-xs uppercase tracking-widest hover:border-primary hover:text-primary"
          >
            Попробовать снова
          </button>
        </main>
        <Footer />
      </div>
    );
  },
  component: ProductPage,
});

const ACCORDION_KEYS = ["desc", "ship", "returns"] as const;
type AccordionKey = (typeof ACCORDION_KEYS)[number];

function ProductPage() {
  const { productSlug } = Route.useParams();
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: qk.shopProduct(productSlug),
    queryFn: () => fetchShopProduct(productSlug),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return count < 2;
    },
  });

  if (isError && error instanceof ApiError && error.status === 404) {
    throw notFound();
  }

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-7xl px-6 py-32">
          <div className="skeleton-shimmer aspect-[3/4] w-full rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  return <ProductView product={product} />;
}

function ProductView({ product }: { product: ShopProduct }) {
  const gallery: string[] = product.images.length > 0 ? product.images : [];

  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<AccordionKey | null>("desc");
  const sizes = product.sizes ?? [];
  const [size, setSize] = useState<string | null>(sizes.length > 0 ? null : null);

  const isSold = product.stock !== null && product.stock <= 0;
  const isPreorder = product.kind === "preorder";
  const isDigital = product.kind === "digital";
  const needsSize = sizes.length > 0;
  const sizeMissing = needsSize && !size;

  const sourceTone = "bg-primary text-primary-foreground";
  const sourceLabel = isPreorder ? "ПРЕДЗАКАЗ" : isDigital ? "ЦИФРОВОЙ" : "HELLHOUND";

  const { add } = useCart();
  const navigate = useNavigate();
  const handleAdd = (goToCart = false) => {
    if (isSold) return;
    if (sizeMissing) {
      hhToast.error("Выбери размер");
      return;
    }
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.title,
        price: product.priceRub,
        image: gallery[0] ?? "",
        size,
        ticketsBonus: product.bonusTickets,
      },
      qty,
    );

    hhToast.success("Добавлено в корзину", {
      meta: `${product.title}${size ? ` · ${size}` : ""} × ${qty}`,
    });
    if (goToCart) navigate({ to: "/cart" });
  };



  return (
    <div className="min-h-screen bg-background pb-24 text-foreground lg:pb-0">
      <Header />

      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-6 pb-20 pt-8 md:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <Link to="/shop" className="transition-colors hover:text-primary">
              Магазин
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground">{product.title}</span>
          </nav>

          <div className="relative grid grid-cols-1 gap-0 overflow-visible lg:grid-cols-12">
            {/* GALLERY — Stories slider */}
            <section className="relative lg:col-span-7">
              <StoriesGallery
                images={gallery}
                name={product.title}
                badge={isSold ? "Распродано" : isPreorder ? "Предзаказ" : undefined}
              />
              {/* Diagonal slash motif — cuts gallery edge into panel */}
              <div
                aria-hidden
                className="pointer-events-none absolute right-0 top-0 hidden h-full w-32 bg-background lg:block"
                style={{ clipPath: "polygon(100% 0, 100% 100%, 0% 100%)" }}
              />
            </section>

            {/* STICKY PANEL */}
            <aside className="relative z-10 lg:col-span-5 lg:-ml-16 lg:pl-20">
              <div className="pt-10 lg:sticky lg:top-28 lg:pt-12">
                {/* Source badge */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${sourceTone}`}
                  >
                    {sourceLabel}
                  </span>
                  {isPreorder && product.preorderExpectedAt && (
                    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Ожидаем · {new Date(product.preorderExpectedAt).toLocaleDateString("ru-RU")}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tighter md:text-5xl">
                  {product.title}
                </h1>

                <div className="mt-6 flex items-baseline gap-3">
                  <span className="font-display text-3xl tracking-tight text-primary">
                    {product.priceRub.toLocaleString("ru-RU")} ₽
                  </span>
                  {isSold && (
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      нет в наличии
                    </span>
                  )}
                </div>

                {product.bonusTickets > 0 ? (
                  <div className="mt-4 inline-flex items-center gap-2 border border-primary/40 bg-primary/5 px-3 py-2">
                    <span
                      aria-hidden
                      className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.7)]"
                    />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                      +{product.bonusTickets} {ticketsWordPdp(product.bonusTickets)} на розыгрыши клуба
                    </span>
                  </div>
                ) : null}

                {needsSize && (
                  <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Размер
                      </span>
                      {size && (
                        <span className="font-mono text-[11px] uppercase tracking-widest text-foreground">
                          {size}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((s) => {
                        const isActive = s === size;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSize(s)}
                            className={`min-w-[48px] border px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${
                              isActive
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-foreground hover:border-primary hover:text-primary"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QTY + CTA (desktop) */}
                <div className="mt-8 hidden items-stretch gap-3 lg:flex">
                  <div className="flex items-center border border-border">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="flex h-12 w-12 items-center justify-center text-lg text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Уменьшить"
                    >
                      −
                    </button>
                    <span className="w-10 text-center font-mono text-sm">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="flex h-12 w-12 items-center justify-center text-lg text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Увеличить"
                    >
                      +
                    </button>
                  </div>

                  <button
                    disabled={isSold}
                    onClick={() => handleAdd(false)}
                    className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden bg-primary px-6 py-3 font-display text-base uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] transition-all hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.8)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                  >
                    {isSold
                      ? "Распродано"
                      : sizeMissing
                        ? "Выбери размер"
                        : isPreorder
                          ? "Оформить предзаказ"
                          : "В корзину"}
                    {!isSold && !sizeMissing && (
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    )}
                  </button>
                </div>

                {/* ACCORDIONS */}
                <div className="mt-10 border-t border-border">
                  {product.description && (
                    <Accordion
                      label="Описание"
                      open={open === "desc"}
                      onToggle={() =>
                        setOpen(open === "desc" ? null : "desc")
                      }
                    >
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                    </Accordion>
                  )}
                  <Accordion
                    label="Доставка"
                    open={open === "ship"}
                    onToggle={() => setOpen(open === "ship" ? null : "ship")}
                  >
                    {product.shippingInfo?.trim() ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {product.shippingInfo}
                      </p>
                    ) : isDigital ? (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Цифровой товар. После оплаты придёт ссылка на скачивание на email.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                        <li>· СДЭК и Boxberry по РФ — 2–7 дней.</li>
                        <li>· Самовывоз из гаража HELLHOUND в Москве.</li>
                      </ul>
                    )}
                  </Accordion>
                  <Accordion
                    label="Возврат"
                    open={open === "returns"}
                    onToggle={() => setOpen(open === "returns" ? null : "returns")}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {product.returnPolicy?.trim() ||
                        "Возврат 14 дней, если вещь не носилась и сохранены ярлыки."}
                    </p>
                  </Accordion>
                </div>
              </div>
            </aside>
          </div>

        </div>
      </main>

      {/* MOBILE STICKY CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Цена
            </span>
            <span className="font-display text-lg text-primary">
              {product.priceRub.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            disabled={isSold}
            onClick={() => handleAdd(false)}
            className="ml-auto flex flex-1 items-center justify-center gap-2 bg-primary px-5 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {isSold ? "Распродано" : isPreorder ? "Предзаказ" : "В корзину"}
            {!isSold && <span aria-hidden>→</span>}
          </button>
        </div>
      </div>




      <Footer />
    </div>
  );
}

function Accordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border">
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between py-4 text-left"
      >
        <span
          className={`font-display text-sm uppercase tracking-widest transition-colors ${
            open ? "text-primary" : "text-foreground group-hover:text-primary"
          }`}
        >
          {label}
        </span>
        <span
          aria-hidden
          className={`font-mono text-lg transition-transform duration-300 ${
            open ? "rotate-45 text-primary" : "text-muted-foreground"
          }`}
        >
          +
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}




/* ---------------- Stories Gallery ---------------- */

const ACCENT_HUES = [330, 18, 200, 280, 140]; // pink, orange, cyan, violet, mint

function StoriesGallery({
  images,
  name,
  badge,
}: {
  images: string[];
  name: string;
  badge?: string;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(performance.now());
  const rafRef = useRef<number | null>(null);
  const DURATION = 6000;

  const count = images.length;
  const next = () => setActive((a) => (a + 1) % count);
  const prev = () => setActive((a) => (a - 1 + count) % count);

  // Auto-advance
  useEffect(() => {
    if (count <= 1) return;
    startRef.current = performance.now();

    const tick = (t: number) => {
      if (paused) {
        startRef.current = t;
      } else {
        const elapsed = t - startRef.current;
        if (elapsed >= DURATION) {
          next();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, paused, count]);

  const hue = ACCENT_HUES[active % ACCENT_HUES.length];
  const accent = `hsl(${hue} 90% 60%)`;

  return (
    <div
      className="group/gallery relative aspect-[3/4] w-full overflow-hidden bg-surface lg:aspect-auto lg:h-[760px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Ambient color glow — shifts per slide */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-20 opacity-50 blur-3xl transition-all duration-1000"
        style={{
          background: `radial-gradient(circle at 30% 70%, ${accent} 0%, transparent 60%)`,
        }}
      />

      {/* Slides — Ken Burns zoom in/out */}
      {images.map((src, i) => {
        const isActive = i === active;
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{
              opacity: isActive ? 1 : 0,
              zIndex: isActive ? 2 : 1,
            }}
          >
            <img
              src={src}
              alt={`${name} — фото ${i + 1}`}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full w-full object-cover"
              style={{
                transform: isActive ? "scale(1.12)" : "scale(1)",
                transition: "transform 7s ease-out",
              }}
            />
          </div>
        );
      })}

      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-background/60 via-transparent to-background/30"
      />

      {/* Badge */}
      {badge && (
        <span className="absolute left-6 top-6 z-30 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground backdrop-blur">
          {badge}
        </span>
      )}

      {/* Bottom marker */}
      <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3">
        <span className="h-px w-10 bg-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/70">
          {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
      </div>

      {/* Translucent arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Предыдущее фото"
            className="absolute left-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/30 text-foreground/80 backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:bg-background/60 hover:text-primary md:left-6 md:h-14 md:w-14 md:opacity-0 md:group-hover/gallery:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Следующее фото"
            className="absolute right-4 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-background/30 text-foreground/80 backdrop-blur-md transition-all duration-300 hover:border-primary/60 hover:bg-background/60 hover:text-primary md:right-6 md:h-14 md:w-14 md:opacity-0 md:group-hover/gallery:opacity-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
