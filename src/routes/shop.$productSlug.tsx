import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { PRODUCTS, SOURCE_LABEL, type Product } from "@/data/products";

export const Route = createFileRoute("/shop/$productSlug")({
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.slug === params.productSlug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: "Товар — HELLHOUND" }] };
    const title = `${p.name} — HELLHOUND Racing Club`;
    const desc =
      p.description?.slice(0, 155) ??
      `${p.name}. ${p.price.toLocaleString("ru-RU")} ₽.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: p.image },
        { property: "twitter:image", content: p.image },
      ],
    };
  },
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

const ACCORDION_KEYS = ["desc", "comp", "care", "ship"] as const;
type AccordionKey = (typeof ACCORDION_KEYS)[number];

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const gallery: string[] = product.gallery?.length
    ? product.gallery
    : [product.image];

  const [size, setSize] = useState<string | null>(
    product.sizes?.[Math.min(1, product.sizes.length - 1)] ?? null,
  );
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<AccordionKey | null>("desc");
  const [sizeGuide, setSizeGuide] = useState(false);

  const sourceTone =
    product.source === "hellhound"
      ? "bg-primary text-primary-foreground"
      : product.source === "partner"
        ? "border border-primary/60 text-primary"
        : "border border-border text-muted-foreground";

  const isSold = product.badge?.label.toLowerCase() === "распродано";

  const related = PRODUCTS.filter(
    (p) => p.category === product.category && p.id !== product.id,
  ).slice(0, 4);

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
            <span className="text-foreground">{product.name}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
            {/* GALLERY */}
            <section className="flex flex-col gap-3">
              {gallery.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-[4/5] overflow-hidden border border-border bg-surface"
                  style={{
                    animation: "shop-card-in 0.5s ease-out backwards",
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <img
                    src={src}
                    alt={`${product.name} — фото ${i + 1}`}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && product.badge && (
                    <span className="absolute left-4 top-4 rounded-full bg-background/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-foreground backdrop-blur">
                      {product.badge.label}
                    </span>
                  )}
                </div>
              ))}
            </section>

            {/* STICKY PANEL */}
            <aside className="relative">
              <div className="lg:sticky lg:top-28">
                {/* Source badge */}
                <div className="mb-5 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${sourceTone}`}
                  >
                    {SOURCE_LABEL[product.source]}
                    {product.sourceLabel && (
                      <>
                        <span className="opacity-50">·</span>
                        <span className="font-medium normal-case tracking-normal">
                          {product.sourceLabel}
                        </span>
                      </>
                    )}
                  </span>
                </div>

                <h1 className="font-display text-4xl uppercase leading-[0.95] tracking-tighter md:text-5xl">
                  {product.name}
                </h1>

                <div className="mt-6 flex items-baseline gap-3">
                  <span className="font-display text-3xl tracking-tight text-primary">
                    {product.price.toLocaleString("ru-RU")} ₽
                  </span>
                  {isSold && (
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      нет в наличии
                    </span>
                  )}
                </div>

                {/* SIZES */}
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mt-8">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                        Размер
                      </span>
                      <button
                        onClick={() => setSizeGuide(true)}
                        className="font-mono text-[11px] uppercase tracking-widest text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        Таблица размеров →
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => {
                        const active = s === size;
                        return (
                          <button
                            key={s}
                            onClick={() => setSize(s)}
                            className={`min-w-[52px] border px-4 py-2.5 font-display text-sm uppercase tracking-wider transition-all ${
                              active
                                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_-4px_hsl(var(--primary)/0.6)]"
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
                    className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden bg-primary px-6 py-3 font-display text-base uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] transition-all hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.8)] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
                  >
                    {isSold ? "Распродано" : "В корзину"}
                    {!isSold && (
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
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                    </Accordion>
                  )}
                  {product.composition && (
                    <Accordion
                      label="Состав"
                      open={open === "comp"}
                      onToggle={() =>
                        setOpen(open === "comp" ? null : "comp")
                      }
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {product.composition}
                      </p>
                    </Accordion>
                  )}
                  {product.care && (
                    <Accordion
                      label="Уход"
                      open={open === "care"}
                      onToggle={() =>
                        setOpen(open === "care" ? null : "care")
                      }
                    >
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {product.care}
                      </p>
                    </Accordion>
                  )}
                  <Accordion
                    label="Доставка и возврат"
                    open={open === "ship"}
                    onToggle={() => setOpen(open === "ship" ? null : "ship")}
                  >
                    <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                      <li>· СДЭК и Boxberry по РФ — 2–7 дней.</li>
                      <li>· Самовывоз из гаража HELLHOUND в Москве.</li>
                      <li>· Возврат 14 дней, если вещь не носилась.</li>
                    </ul>
                  </Accordion>
                </div>
              </div>
            </aside>
          </div>

          {/* RELATED */}
          {related.length > 0 && (
            <section className="mt-24">
              <div className="mb-6 flex items-baseline justify-between border-b border-border pb-4">
                <h2 className="font-display text-2xl uppercase tracking-tight">
                  Может зайти
                </h2>
                <Link
                  to="/shop"
                  className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                  В магазин →
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((p) => (
                  <RelatedCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* MOBILE STICKY CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {size ? `Размер ${size}` : "Цена"}
            </span>
            <span className="font-display text-lg text-primary">
              {product.price.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            disabled={isSold}
            className="ml-auto flex flex-1 items-center justify-center gap-2 bg-primary px-5 py-3 font-display text-sm uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            {isSold ? "Распродано" : "В корзину"}
            {!isSold && <span aria-hidden>→</span>}
          </button>
        </div>
      </div>

      {/* SIZE GUIDE MODAL */}
      {sizeGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur sm:items-center"
          onClick={() => setSizeGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg border border-border bg-card p-6 shadow-2xl"
            style={{ animation: "shop-card-in 0.3s ease-out" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl uppercase tracking-tight">
                Таблица размеров
              </h3>
              <button
                onClick={() => setSizeGuide(false)}
                className="text-muted-foreground hover:text-primary"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2">Размер</th>
                  <th className="py-2">Грудь, см</th>
                  <th className="py-2">Длина, см</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {[
                  ["S", "96–100", "68"],
                  ["M", "100–104", "70"],
                  ["L", "104–110", "72"],
                  ["XL", "110–116", "74"],
                  ["XXL", "116–122", "76"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-border/50">
                    <td className="py-2.5 text-primary">{row[0]}</td>
                    <td className="py-2.5">{row[1]}</td>
                    <td className="py-2.5">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-muted-foreground">
              Замеры по изделию в свободном виде. Допуск ± 2 см.
            </p>
          </div>
        </div>
      )}

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

function RelatedCard({ product }: { product: Product }) {
  return (
    <Link
      to="/shop/$productSlug"
      params={{ productSlug: product.slug }}
      className="group block border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 px-3 py-3">
        <span className="text-xs font-medium uppercase tracking-wider">
          {product.name}
        </span>
        <span className="font-mono text-xs">
          {product.price.toLocaleString("ru-RU")} ₽
        </span>
      </div>
    </Link>
  );
}
