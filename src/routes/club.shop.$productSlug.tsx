import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Ticket } from "lucide-react";
import { hhToast } from "@/lib/hh-toast";
import { useCart } from "@/hooks/use-cart";
import { haptic } from "@/hooks/use-haptic";
import { ApiError } from "@/lib/api";
import { fetchShopProduct, qk, type ShopProduct } from "@/lib/queries";

export const Route = createFileRoute("/club/shop/$productSlug")({
  head: ({ params }) => ({
    meta: [
      { title: `Товар — ${params.productSlug} — Магазин клуба` },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary">404</div>
      <h1 className="mt-2 font-display text-3xl font-black italic uppercase tracking-tight">
        Товар не найден
      </h1>
      <Link
        to="/club/shop"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
      >
        ← В магазин клуба
      </Link>
    </main>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black italic uppercase tracking-tight">
          Что-то сломалось
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-5 rounded-full border border-white/[0.1] px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wider active:scale-95"
        >
          Попробовать снова
        </button>
      </main>
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
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="aspect-square w-full animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-white/[0.04]" />
      </main>
    );
  }

  return <ProductView product={product} />;
}

function ProductView({ product }: { product: ShopProduct }) {
  const gallery = product.images.length > 0 ? product.images : [];
  const [slide, setSlide] = useState(0);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<"desc" | "ship" | "returns" | null>("desc");
  const sizes = product.sizes ?? [];
  const [size, setSize] = useState<string | null>(null);
  const { add } = useCart();
  const navigate = useNavigate();

  const sold = product.stock !== null && product.stock <= 0;
  const needsSize = sizes.length > 0;
  const sizeMissing = needsSize && !size;
  const cover = gallery[slide] ?? gallery[0];

  const handleAdd = (goToCart = false) => {
    if (sold) return;
    if (sizeMissing) {
      haptic("warning");
      hhToast.error("Выбери размер");
      return;
    }
    haptic("success");
    add(
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
    hhToast.success("Добавлено в корзину", {
      meta: `${product.title}${size ? ` · ${size}` : ""} × ${qty}`,
    });
    if (goToCart) navigate({ to: "/club/cart" });
  };

  const next = () => setSlide((s) => (s + 1) % Math.max(1, gallery.length));
  const prev = () => setSlide((s) => (s - 1 + Math.max(1, gallery.length)) % Math.max(1, gallery.length));

  return (
    <main
      className="mx-auto w-full max-w-3xl pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-12"
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          to="/club/shop"
          className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-60"
        >
          <ChevronLeft className="h-4 w-4" /> Магазин
        </Link>
        {product.stock !== null && (
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {product.stock > 0 ? `В наличии: ${product.stock}` : "Нет в наличии"}
          </span>
        )}
      </div>

      <section className="relative mt-3 aspect-square w-full overflow-hidden bg-surface">
        {cover ? (
          <img
            src={cover}
            alt={product.title}
            loading="eager"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground/40">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}
        {sold && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground backdrop-blur">
            Распродано
          </span>
        )}

        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Назад"
              className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-foreground backdrop-blur active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Дальше"
              className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-foreground backdrop-blur active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5 backdrop-blur">
              {gallery.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === slide ? "w-4 bg-primary" : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="px-4 pt-5">
        <h1 className="font-display text-2xl font-black italic uppercase leading-tight tracking-tight text-foreground md:text-3xl">
          {product.title}
        </h1>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-3xl font-black tabular-nums text-primary">
            {product.priceRub.toLocaleString("ru-RU")} ₽
          </span>
        </div>

        {product.bonusTickets > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
            <Ticket className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              +{product.bonusTickets} билетов после оплаты
            </span>
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Кол-во
          </div>
          <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center text-foreground active:bg-white/[0.06]"
              aria-label="Уменьшить"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-mono text-sm font-bold tabular-nums">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="grid h-10 w-10 place-items-center text-foreground active:bg-white/[0.06]"
              aria-label="Увеличить"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {needsSize && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Размер
              </span>
              {size && (
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
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
                    className={`min-w-[44px] rounded-xl border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/[0.08] bg-white/[0.03] text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          {product.description && (
            <Accordion
              label="Описание"
              open={open === "desc"}
              onToggle={() => setOpen(open === "desc" ? null : "desc")}
            >
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
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
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
                {product.shippingInfo}
              </p>
            ) : (
              <ul className="space-y-2 text-[14px] leading-relaxed text-muted-foreground">
                <li>· СДЭК по РФ — 2–7 дней.</li>
                <li>· Самовывоз из гаража HELLHOUND в Москве.</li>
              </ul>
            )}
          </Accordion>
          <Accordion
            label="Возврат"
            open={open === "returns"}
            onToggle={() => setOpen(open === "returns" ? null : "returns")}
          >
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
              {product.returnPolicy?.trim() ||
                "Возврат 14 дней, если вещь не носилась и сохранены ярлыки."}
            </p>
          </Accordion>
        </div>

        {/* Desktop inline CTA */}
        <div className="mt-6 hidden items-center gap-4 rounded-2xl border border-white/[0.06] bg-card/40 p-4 md:flex">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Итого
            </span>
            <span className="font-display text-2xl font-black tabular-nums text-primary">
              {(product.priceRub * qty).toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            type="button"
            disabled={sold}
            onClick={() => handleAdd(false)}
            className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground"
          >
            {sold ? "Распродано" : sizeMissing ? "Выбери размер" : "В корзину"}
          </button>
          <Link
            to="/club/cart"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] px-5 py-3.5 font-mono text-[12px] font-bold uppercase tracking-wider text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <ShoppingBag className="h-4 w-4" /> Корзина
          </Link>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div
        className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-black/85 px-4 py-3 backdrop-blur-xl md:hidden"
        style={{ bottom: "calc(52px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Цена
            </span>
            <span className="font-display text-lg font-black tabular-nums text-primary">
              {(product.priceRub * qty).toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            type="button"
            disabled={sold}
            onClick={() => handleAdd(false)}
            className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition-all active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground"
          >
            {sold ? "Распродано" : sizeMissing ? "Выбери размер" : "В корзину"}
          </button>
        </div>
      </div>
    </main>
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
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left active:bg-white/[0.04]"
      >
        <span className="text-[15px] font-semibold text-foreground">{label}</span>
        <span
          className={`font-mono text-lg leading-none transition-transform duration-300 ${
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
