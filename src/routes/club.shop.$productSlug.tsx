import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, Ticket } from "lucide-react";
import { hhToast } from "@/lib/hh-toast";
import { PRODUCTS, SOURCE_LABEL, type Product } from "@/data/products";
import { useCart } from "@/hooks/use-cart";

function ticketsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "билет";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "билета";
  return "билетов";
}

export const Route = createFileRoute("/club/shop/$productSlug")({
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.slug === params.productSlug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product as Product | undefined;
    return {
      meta: [
        { title: p ? `${p.name} — Магазин клуба` : "Товар — клуб HELLHOUND" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
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

const ACCORDION_KEYS = ["desc", "comp", "care", "ship", "returns"] as const;
type AccordionKey = (typeof ACCORDION_KEYS)[number];

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const gallery = product.gallery?.length ? product.gallery : [product.image];

  const [slide, setSlide] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes?.[0] ?? null);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<AccordionKey | null>("desc");

  const sold = product.badge?.label.toLowerCase() === "распродано";
  const { add } = useCart();
  const navigate = useNavigate();

  const handleAdd = (goToCart = false) => {
    if (sold) return;
    if (product.sizes && product.sizes.length > 0 && !size) {
      hhToast.error("Выберите размер", { meta: "HRC // SIZE_REQUIRED" });
      return;
    }
    add(
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        size,
        ticketsBonus: product.ticketsBonus,
      },
      qty,
    );
    hhToast.success("Добавлено в корзину", {
      meta: `${product.name}${size ? ` · ${size}` : ""} × ${qty}`,
    });
    if (goToCart) navigate({ to: "/club/cart" });
  };

  const next = () => setSlide((s) => (s + 1) % gallery.length);
  const prev = () => setSlide((s) => (s - 1 + gallery.length) % gallery.length);

  return (
    <main
      className="mx-auto w-full max-w-3xl"
      style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
    >
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Link
          to="/club/shop"
          className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-60"
        >
          <ChevronLeft className="h-4 w-4" /> Магазин
        </Link>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {SOURCE_LABEL[product.source]}
          {product.sourceLabel ? ` · ${product.sourceLabel}` : ""}
        </span>
      </div>

      {/* Gallery */}
      <section className="relative mt-3 aspect-square w-full overflow-hidden bg-surface">
        {gallery.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${product.name} — ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: i === slide ? 1 : 0 }}
          />
        ))}
        {product.badge && (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur ${
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

            {/* iOS-style page dots */}
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

      {/* Info */}
      <section className="px-4 pt-5">
        <h1 className="font-display text-2xl font-black italic uppercase leading-tight tracking-tight text-foreground md:text-3xl">
          {product.name}
        </h1>

        <div className="mt-3 flex items-baseline gap-3">
          <span className="font-display text-3xl font-black tabular-nums text-primary">
            {product.price.toLocaleString("ru-RU")} ₽
          </span>
          {sold && (
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              нет в наличии
            </span>
          )}
        </div>

        {product.ticketsBonus && product.ticketsBonus > 0 ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
            <Ticket className="h-3.5 w-3.5 text-primary" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              +{product.ticketsBonus} {ticketsWord(product.ticketsBonus)} на розыгрыши
            </span>
          </div>
        ) : null}

        {/* Sizes */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Размер
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => {
                const active = s === size;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`min-w-[52px] rounded-xl border px-4 py-2.5 font-display text-sm font-bold uppercase tracking-wider transition-all active:scale-95 ${
                      active
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

        {/* Qty stepper — iOS */}
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

        {/* Accordions */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          {product.description && (
            <Accordion
              label="Описание"
              open={open === "desc"}
              onToggle={() => setOpen(open === "desc" ? null : "desc")}
            >
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </Accordion>
          )}
          {product.composition && (
            <Accordion
              label="Состав"
              open={open === "comp"}
              onToggle={() => setOpen(open === "comp" ? null : "comp")}
            >
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                {product.composition}
              </p>
            </Accordion>
          )}
          {product.care && (
            <Accordion
              label="Уход"
              open={open === "care"}
              onToggle={() => setOpen(open === "care" ? null : "care")}
            >
              <p className="text-[14px] leading-relaxed text-muted-foreground">{product.care}</p>
            </Accordion>
          )}
          <Accordion
            label="Доставка"
            open={open === "ship"}
            onToggle={() => setOpen(open === "ship" ? null : "ship")}
          >
            {product.shipping ? (
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
                {product.shipping}
              </p>
            ) : (
              <ul className="space-y-2 text-[14px] leading-relaxed text-muted-foreground">
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
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-muted-foreground">
              {product.returns ?? "Возврат 14 дней, если вещь не носилась и сохранены ярлыки."}
            </p>
          </Accordion>
        </div>
      </section>

      {/* Sticky CTA — iOS bottom bar (above MobileTabBar) */}
      <div
        className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-black/85 px-4 py-3 backdrop-blur-xl"
        style={{ bottom: "calc(52px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {size ? `Размер ${size}` : "Цена"}
            </span>
            <span className="font-display text-lg font-black tabular-nums text-primary">
              {(product.price * qty).toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            type="button"
            disabled={sold}
            onClick={() => handleAdd(false)}
            className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition-all active:scale-[0.98] disabled:bg-muted disabled:text-muted-foreground"
          >
            {sold ? "Распродано" : "В корзину"}
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
