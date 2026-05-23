import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Minus, Plus, ShoppingBag, Ticket, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/club/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — клуб HELLHOUND" },
      { name: "description", content: "Корзина магазина клуба." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubCartPage,
});

function ticketsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "билет";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "билета";
  return "билетов";
}

/** Картинка товара в корзине с фолбэком на иконку, если ссылки нет. */
function CartImage({
  src,
  alt,
  className,
  iconSize = "h-6 w-6",
}: {
  src: string;
  alt: string;
  className: string;
  iconSize?: string;
}) {
  if (!src) {
    return (
      <div className={`${className} grid place-items-center text-muted-foreground/60`}>
        <ShoppingBag className={iconSize} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover`}
      onError={(e) => {
        // Если ссылка битая — показываем плейсхолдер
        const img = e.currentTarget;
        img.style.display = "none";
        const parent = img.parentElement;
        if (parent && !parent.querySelector(".cart-img-fallback")) {
          const ph = document.createElement("div");
          ph.className =
            "cart-img-fallback grid h-full w-full place-items-center text-muted-foreground/60";
          ph.innerHTML =
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
          parent.appendChild(ph);
        }
      }}
    />
  );
}

function ClubCartPage() {
  const isMobile = useIsMobile();
  const { items, total, setQty, remove } = useCart();
  const { isAuthed } = useViewer();
  const navigate = useNavigate();

  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  if (items.length === 0) {
    return (
      <main
        className={
          isMobile
            ? "mx-auto w-full max-w-3xl px-4 py-5"
            : "mx-auto w-full max-w-5xl px-6 py-8 md:px-8 md:py-10"
        }
        style={
          isMobile
            ? { paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }
            : undefined
        }
      >
        <PageHeader title="Корзина" subtitle="Пока пусто" />
        <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Корзина пуста
          </div>
          <p className="mt-2 max-w-[32ch] text-sm text-muted-foreground/80">
            Загляни в магазин клуба — мерч, экипировка, открытки с бонусом билетов.
          </p>
          <Link
            to="/club/shop"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-[12px] font-bold uppercase tracking-wider text-primary-foreground transition-transform active:scale-95 hover:scale-[1.02]"
          >
            В магазин
          </Link>
        </div>
      </main>
    );
  }

  // ---------- DESKTOP ----------
  if (!isMobile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8 md:px-8 md:py-10">
        <PageHeader
          title="Корзина"
          subtitle={`${items.length} ${items.length === 1 ? "позиция" : "позиций"}`}
        />

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Список товаров */}
          <ul className="space-y-3">
            {items.map((i) => (
              <DesktopRow
                key={i.id}
                item={i}
                onQty={(qty) => setQty(i.id, qty)}
                onRemove={() => remove(i.id)}
              />
            ))}
          </ul>

          {/* Сводка */}
          <aside className="h-fit space-y-4 rounded-2xl border border-white/[0.06] bg-card/40 p-6">
            <div className="space-y-3 border-b border-white/[0.06] pb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Товары</span>
                <span className="font-mono tabular-nums">
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Доставка</span>
                <span className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
                  на оформлении
                </span>
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                Итого
              </span>
              <span className="font-display text-3xl font-black tabular-nums text-foreground">
                {total.toLocaleString("ru-RU")} ₽
              </span>
            </div>

            {ticketsTotal > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2.5">
                <Ticket className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                    Бонус билетов
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Начислится после оплаты
                  </div>
                </div>
                <span className="font-display text-xl font-black italic tabular-nums text-primary">
                  +{ticketsTotal}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                isAuthed ? navigate({ to: "/club/checkout" }) : navigate({ to: "/login" })
              }
              className="w-full rounded-xl bg-primary px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-[0.98] hover:scale-[1.01]"
            >
              {isAuthed ? "Оформить заказ" : "Войти и оформить"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              Оплата и адрес доставки — на следующем шаге.
            </p>
          </aside>
        </div>
      </main>
    );
  }

  // ---------- MOBILE ----------
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5"
      style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader
        title="Корзина"
        subtitle={`${items.length} ${items.length === 1 ? "позиция" : "позиций"}`}
      />

      <ul className="mb-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
        {items.map((i) => (
          <li key={i.id} className="px-3 py-3">
            <div className="flex gap-3">
              <Link
                to="/club/shop/$productSlug"
                params={{ productSlug: i.slug }}
                className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface active:opacity-80"
              >
                <CartImage src={i.image} alt={i.name} className="h-full w-full" />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to="/club/shop/$productSlug"
                  params={{ productSlug: i.slug }}
                  className="block text-[14px] font-semibold leading-tight text-foreground"
                >
                  {i.name}
                </Link>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {i.size ? `Размер ${i.size}` : "—"}
                </div>

                {i.ticketsBonus && i.ticketsBonus > 0 ? (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                    <Ticket className="h-3 w-3 text-primary" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                      +{i.ticketsBonus * i.qty} {ticketsWord(i.ticketsBonus * i.qty)}
                    </span>
                  </div>
                ) : null}

                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
                    <button
                      type="button"
                      onClick={() => setQty(i.id, Math.max(1, i.qty - 1))}
                      className="grid h-8 w-8 place-items-center text-foreground active:bg-white/[0.06]"
                      aria-label="Уменьшить"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono text-[13px] font-bold tabular-nums">
                      {i.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty + 1)}
                      className="grid h-8 w-8 place-items-center text-foreground active:bg-white/[0.06]"
                      aria-label="Увеличить"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">
                    {(i.price * i.qty).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => remove(i.id)}
                aria-label="Удалить"
                className="grid h-8 w-8 shrink-0 place-items-center self-start rounded-lg text-muted-foreground active:bg-white/[0.06] active:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        <div className="divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14px] text-muted-foreground">Товары</span>
            <span className="font-mono text-[14px] tabular-nums text-foreground">
              {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[14px] text-muted-foreground">Доставка</span>
            <span className="font-mono text-[13px] uppercase tracking-wider text-muted-foreground">
              на оформлении
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[15px] font-semibold text-foreground">Итого</span>
            <span className="font-display text-2xl font-black tabular-nums text-foreground">
              {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>
        </div>
      </section>

      {ticketsTotal > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.08] px-4 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
            <Ticket className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Бонус билетов
            </div>
            <div className="text-[12px] text-muted-foreground">
              Начислится после оплаты — для розыгрышей клуба.
            </div>
          </div>
          <span className="font-display text-xl font-black italic tabular-nums text-primary">
            +{ticketsTotal}
          </span>
        </div>
      )}

      <div
        className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-black/85 px-4 py-3 backdrop-blur-xl"
        style={{ bottom: "calc(52px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              К оплате
            </span>
            <span className="font-display text-lg font-black tabular-nums text-primary">
              {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              isAuthed ? navigate({ to: "/club/checkout" }) : navigate({ to: "/login" })
            }
            className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-primary-foreground active:scale-[0.98]"
          >
            {isAuthed ? "Оформить" : "Войти и оформить"}
          </button>
        </div>
      </div>
    </main>
  );
}

function DesktopRow({
  item,
  onQty,
  onRemove,
}: {
  item: CartItem;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-5 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
      <Link
        to="/club/shop/$productSlug"
        params={{ productSlug: item.slug }}
        className="block h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-surface"
      >
        <CartImage src={item.image} alt={item.name} className="h-full w-full" iconSize="h-8 w-8" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to="/club/shop/$productSlug"
              params={{ productSlug: item.slug }}
              className="block text-base font-semibold leading-tight text-foreground hover:text-primary"
            >
              {item.name}
            </Link>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {item.size ? `Размер ${item.size}` : "Без размера"} · {item.price.toLocaleString("ru-RU")} ₽
            </div>
            {item.ticketsBonus && item.ticketsBonus > 0 ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                <Ticket className="h-3 w-3 text-primary" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                  +{item.ticketsBonus * item.qty} {ticketsWord(item.ticketsBonus * item.qty)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right font-mono text-lg font-bold tabular-nums text-foreground">
            {(item.price * item.qty).toLocaleString("ru-RU")} ₽
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <button
              type="button"
              onClick={() => onQty(Math.max(1, item.qty - 1))}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-white/[0.06]"
              aria-label="Уменьшить"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center font-mono text-sm font-bold tabular-nums">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => onQty(item.qty + 1)}
              className="grid h-9 w-9 place-items-center text-foreground hover:bg-white/[0.06]"
              aria-label="Увеличить"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
      </div>
    </li>
  );
}
