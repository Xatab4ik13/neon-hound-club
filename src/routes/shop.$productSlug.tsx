import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  PlumpArrowLeft as ChevronLeft,
  PlumpArrowRight as ChevronRight,
  Minus,
  Plus,
  PlumpStore,
  PlumpCart,
  PlumpTicket,
} from "@/components/ui/icons";
import { hhToast } from "@/lib/hh-toast";
import { useCart } from "@/hooks/use-cart";
import { haptic } from "@/hooks/use-haptic";
import { flyToCart } from "@/lib/fly-to-cart";
import { ApiError } from "@/lib/api";
import { LazyImage } from "@/components/ui/lazy-image";
import { fetchShopProduct, qk, type ShopProduct } from "@/lib/queries";
import { SPECIAL_PACK_COVER } from "@/assets/stickers/special";
import { PlumpPrice } from "@/components/brand/PlumpNum";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";

function ticketsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "билет";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "билета";
  return "билетов";
}

export const Route = createFileRoute("/shop/$productSlug")({
  head: () => ({
    meta: [
      { title: `Товар — HELLHOUND Racing Club` },
      { property: "og:title", content: `Товар — HELLHOUND Racing Club` },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-md px-4 py-32 text-center">
        <div className="text-[13px] font-semibold text-primary">404</div>
        <h1 className="mt-2 text-[24px] font-bold tracking-tight">Товар не найден</h1>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-primary-foreground active:scale-95"
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
        <main className="mx-auto max-w-md px-4 py-32 text-center">
          <h1 className="text-[22px] font-bold tracking-tight">Что-то сломалось</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-5 rounded-full border border-white/[0.1] px-5 py-2.5 text-[14px] font-semibold active:scale-95"
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
        <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+160px)] pt-20 md:pt-28">
          <div className="skeleton-shimmer mt-3 aspect-square w-full rounded-2xl" />
          <div className="mt-5 space-y-2.5">
            <div className="skeleton-shimmer h-6 w-2/3 rounded" />
            <div className="skeleton-shimmer h-6 w-1/3 rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return <ProductView product={product} />;
}

function ProductView({ product }: { product: ShopProduct }) {
  const gallery =
    product.images.length > 0
      ? product.images
      : product.slug === "stickerpack-special"
        ? [SPECIAL_PACK_COVER]
        : [];
  const [slide, setSlide] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<"desc" | "ship" | "returns" | null>("desc");
  const sizes = product.sizes ?? [];
  const [size, setSize] = useState<string | null>(null);
  const { add, items: cartItems } = useCart();
  const navigate = useNavigate();

  const sold = product.stock !== null && product.stock <= 0;
  const needsSize = sizes.length > 0;
  const sizeMissing = needsSize && !size;
  const cover = gallery[slide] ?? gallery[0];
  const maxQty = product.stock && product.stock > 0 ? product.stock : 99;

  const isDigital = product.kind === "digital";
  const alreadyInCart = isDigital
    ? cartItems.some((it) => it.productId === product.id || it.slug === product.slug)
    : false;

  const handleAdd = async (goToCart = false, originEl?: HTMLElement | null) => {
    if (sold) return;
    if (alreadyInCart && !goToCart) {
      haptic("light");
      navigate({ to: "/cart" });
      return;
    }
    if (sizeMissing) {
      haptic("warning");
      hhToast.error("Выбери размер");
      return;
    }
    haptic("success");
    if (!goToCart && originEl && cover) {
      flyToCart({ fromRect: originEl.getBoundingClientRect(), imageUrl: cover });
    }
    try {
      await add(
        {
          productId: product.id,
          slug: product.slug,
          name: product.title,
          price: product.priceRub,
          image: cover ?? "",
          size,
          ticketsBonus: product.bonusTickets,
        },
        qty,
      );
    } catch (e) {
      haptic("warning");
      hhToast.error("Не удалось добавить", {
        meta: e instanceof Error ? e.message : "Попробуй ещё раз",
      });
      return;
    }
    if (goToCart) {
      navigate({ to: "/cart" });
    } else {
      hhToast.success("Добавлено в корзину", {
        meta: `${product.title}${size ? ` · ${size}` : ""} × ${qty}`,
      });
    }
  };

  const total = Math.max(1, gallery.length);
  const next = () => setSlide((s) => (s + 1) % total);
  const prev = () => setSlide((s) => (s - 1 + total) % total);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const horizontal = useRef<boolean | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    horizontal.current = null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (horizontal.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      horizontal.current = Math.abs(dx) > Math.abs(dy);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || !horizontal.current) {
      startX.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 40 && gallery.length > 1) {
      if (dx < 0) next();
      else prev();
      haptic("light");
    }
    startX.current = null;
    horizontal.current = null;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(160px+env(safe-area-inset-bottom))] pt-16 md:px-8 md:pb-16 md:pt-24">
        <div className="flex items-center justify-between pt-3">
          <Link
            to="/shop"
            className="-ml-1 inline-flex items-center gap-0.5 text-[15px] text-primary active:opacity-60 md:text-[17px]"
          >
            <ChevronLeft className="h-5 w-5" /> Магазин
          </Link>
          {product.stock !== null && (
            <span className="text-[13px] text-muted-foreground">
              {product.stock > 0 ? `В наличии: ${product.stock}` : "Нет в наличии"}
            </span>
          )}
        </div>

        <div className="mt-4 grid gap-6 md:mt-8 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-10 lg:gap-14">
          {/* LEFT: галерея */}
          <div className="md:sticky md:top-24 md:self-start">
            <section
              className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ touchAction: "pan-y" }}
            >
              {cover ? (
                <LazyImage
                  key={cover}
                  src={cover}
                  alt={product.title}
                  eager
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground/40">
                  <PlumpStore className="h-12 w-12" />
                </div>
              )}
              {sold && (
                <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[12px] font-medium text-foreground backdrop-blur">
                  Распродано
                </span>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Назад"
                    className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-foreground backdrop-blur active:scale-95 md:grid"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Дальше"
                    className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-foreground backdrop-blur active:scale-95 md:grid"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 md:hidden">
                    {gallery.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === slide ? "w-4 bg-foreground" : "w-1.5 bg-foreground/40"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Thumbnails (desktop) */}
            {gallery.length > 1 && (
              <div className="mt-3 hidden gap-2 md:grid md:grid-cols-5">
                {gallery.map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    onClick={() => setSlide(i)}
                    className={`relative aspect-square overflow-hidden rounded-lg border transition-all ${
                      i === slide
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-white/[0.08] hover:border-white/[0.2]"
                    }`}
                  >
                    <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: инфо-панель */}
          <section>
            <h1 className="text-[24px] font-bold leading-tight tracking-[-0.01em] text-foreground md:text-[32px]">
              {product.title}
            </h1>

            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-[28px] font-bold tabular-nums text-foreground md:text-[32px]">
                <PlumpPrice value={product.priceRub} />
              </span>
            </div>

            {product.bonusTickets > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
                <PlumpTicket className="h-3.5 w-3.5 text-primary" />
                <span className="text-[13px] font-medium text-primary">
                  +{product.bonusTickets} {ticketsWord(product.bonusTickets)} после оплаты
                </span>
              </div>
            )}

            {needsSize && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground">Размер</span>
                  {size && <span className="text-[13px] font-semibold text-foreground">{size}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const isActive = s.label === size;
                    const isOut = s.stock !== null && s.stock <= 0;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        disabled={isOut}
                        onClick={() => setSize(s.label)}
                        className={`min-w-[48px] rounded-xl border px-4 py-2.5 text-[15px] font-semibold transition-all active:scale-95 ${
                          isOut
                            ? "border-white/[0.04] bg-white/[0.02] text-muted-foreground/40 line-through"
                            : isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.25)]"
                              : "border-white/[0.08] bg-white/[0.03] text-foreground hover:border-white/[0.2]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isDigital && (
              <div className="mt-6 flex items-center justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">Количество</span>
                <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="grid h-10 w-10 place-items-center text-foreground active:bg-white/[0.06] disabled:opacity-40"
                    aria-label="Уменьшить"
                    disabled={qty <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="grid h-10 w-10 place-items-center text-foreground active:bg-white/[0.06] disabled:opacity-40"
                    aria-label="Увеличить"
                    disabled={qty >= maxQty}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop CTA */}
            <div className="mt-6 hidden gap-3 md:flex">
              <button
                type="button"
                disabled={sold || sizeMissing}
                onClick={(e) => handleAdd(false, e.currentTarget)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-[15px] font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-primary/30 disabled:text-primary-foreground/60"
              >
                {sold
                  ? "Распродано"
                  : sizeMissing
                    ? "Выберите размер"
                    : alreadyInCart
                      ? "В корзине · перейти"
                      : "В корзину"}
              </button>
              <Link
                to="/cart"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-5 py-4 text-[14px] font-semibold text-foreground hover:border-white/[0.2]"
                aria-label="Корзина"
              >
                <PlumpCart className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
              {product.description && (
                <Accordion
                  label="Описание"
                  open={open === "desc"}
                  onToggle={() => setOpen(open === "desc" ? null : "desc")}
                >
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                    {product.description}
                  </p>
                </Accordion>
              )}
              {!isDigital && (
                <Accordion
                  label="Доставка"
                  open={open === "ship"}
                  onToggle={() => setOpen(open === "ship" ? null : "ship")}
                >
                  {product.shippingInfo?.trim() ? (
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                      {product.shippingInfo}
                    </p>
                  ) : (
                    <ul className="space-y-2 text-[15px] leading-relaxed text-muted-foreground">
                      <li>· СДЭК по РФ — 2–7 дней.</li>
                      <li>· Самовывоз из гаража HELLHOUND в Москве.</li>
                    </ul>
                  )}
                </Accordion>
              )}
              {!isDigital && (
                <Accordion
                  label="Возврат"
                  open={open === "returns"}
                  onToggle={() => setOpen(open === "returns" ? null : "returns")}
                >
                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                    Возврат в течение 14 дней с момента получения, если товар не был в употреблении,
                    сохранены товарный вид, потребительские свойства, ярлыки и упаковка. Деньги
                    возвращаются на ту же карту, которой была произведена оплата. Подробнее —
                    на странице <a href="/shop-info" className="text-primary underline-offset-2 hover:underline">«Оплата и доставка»</a> и в публичной оферте.
                  </p>
                </Accordion>
              )}
            </div>
          </section>
        </div>


        {/* Mobile sticky CTA */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.06] bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden"
          style={{
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
            boxShadow: "0 -10px 28px -8px rgba(0,0,0,0.55)",
          }}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground">Цена</span>
              <span className="text-[18px] font-bold tabular-nums text-foreground">
                <PlumpPrice value={product.priceRub * qty} />
              </span>
            </div>
            <button
              type="button"
              disabled={sold || sizeMissing}
              onClick={(e) => handleAdd(false, e.currentTarget)}
              className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-[15px] font-semibold text-primary-foreground transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-primary/30 disabled:text-primary-foreground/60"
            >
              {sold
                ? "Распродано"
                : sizeMissing
                  ? "Выберите размер"
                  : alreadyInCart
                    ? "В корзине · перейти"
                    : "В корзину"}
            </button>
          </div>
        </div>
      </main>
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
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left active:bg-white/[0.04]"
      >
        <span className="text-[16px] font-semibold text-foreground">{label}</span>
        <span
          className={`text-lg leading-none transition-transform duration-300 ${
            open ? "rotate-45 text-primary" : "text-muted-foreground"
          }`}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
