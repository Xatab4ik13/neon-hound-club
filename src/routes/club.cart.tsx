import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, ShoppingBag, Ticket, Trash2, ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { useCart, type CartItem } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { haptic } from "@/hooks/use-haptic";

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

function positionsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "позиция";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "позиции";
  return "позиций";
}

/** Картинка товара с фолбэком на иконку через React-стейт. */
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
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
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
      loading="lazy"
      className={`${className} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}

function ClubCartPage() {
  const { items, total, setQty, remove } = useCart();
  const { isAuthed } = useViewer();
  const navigate = useNavigate();

  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  // Undo-удаление через sonner-toast.
  const handleRemove = useCallback(
    (item: CartItem) => {
      haptic("selection");
      remove(item.id);
      toast("Удалено из корзины", {
        description: item.name,
        action: {
          label: "Отмена",
          onClick: () => setQty(item.id, item.qty),
        },
      });
    },
    [remove, setQty],
  );

  const handleQty = useCallback(
    (id: string, qty: number) => {
      haptic("light");
      setQty(id, qty);
    },
    [setQty],
  );

  const handleCheckout = useCallback(() => {
    haptic("selection");
    if (isAuthed) navigate({ to: "/club/checkout" });
    else navigate({ to: "/login" });
  }, [isAuthed, navigate]);

  // ---------- ПУСТАЯ КОРЗИНА ----------
  if (items.length === 0) {
    return (
      <>
        {/* MOBILE empty */}
        <main
          className="mx-auto w-full max-w-3xl px-4 py-5 md:hidden"
          style={{ paddingBottom: "calc(108px + env(safe-area-inset-bottom))" }}
        >
          <MobileTitle title="Корзина" subtitle="Пока пусто" />
          <EmptyBlock />
        </main>

        {/* DESKTOP empty */}
        <main className="mx-auto hidden w-full max-w-5xl px-6 py-8 md:block md:px-8 md:py-10">
          <DesktopHeader title="Корзина" subtitle="Пока пусто" />
          <EmptyBlock />
        </main>
      </>
    );
  }

  // ---------- ДЕСКТОП ----------
  const Desktop = (
    <main className="mx-auto hidden w-full max-w-5xl px-6 py-8 md:block md:px-8 md:py-10">
      <DesktopHeader
        title="Корзина"
        subtitle={`${items.length} ${positionsWord(items.length)}`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((i) => (
              <motion.div
                key={i.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <DesktopRow
                  item={i}
                  onQty={(qty) => handleQty(i.id, qty)}
                  onRemove={() => handleRemove(i)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </ul>

        <aside className="h-fit space-y-4 rounded-2xl border border-white/[0.06] bg-card/40 p-6">
          <div className="space-y-3 border-b border-white/[0.06] pb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Товары</span>
              <span className="tabular-nums">{total.toLocaleString("ru-RU")} ₽</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Доставка</span>
              <span className="text-muted-foreground">на оформлении</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Итого</span>
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>

          {ticketsTotal > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.08] px-3 py-2.5">
              <Ticket className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-primary">Бонус билетов</div>
                <div className="text-[12px] text-muted-foreground">
                  Начислится после оплаты
                </div>
              </div>
              <span className="text-xl font-bold tabular-nums text-primary">
                +{ticketsTotal}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            className="w-full rounded-xl bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.98] hover:scale-[1.01]"
          >
            {isAuthed ? "Оформить заказ" : "Войти и оформить"}
          </button>
          <p className="text-[12px] text-muted-foreground">
            Оплата и адрес доставки — на следующем шаге.
          </p>
        </aside>
      </div>
    </main>
  );

  // ---------- МОБИЛКА ----------
  const Mobile = (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:hidden"
      style={{
        paddingBottom: "calc(132px + env(safe-area-inset-bottom))",
        overscrollBehaviorY: "contain",
      }}
    >
      <MobileTitle
        title="Корзина"
        subtitle={`${items.length} ${positionsWord(items.length)}`}
      />

      <ul className="mb-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.li
              key={i.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="relative flex gap-3 bg-card/40 px-3 py-3 pr-12">
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
                    className="block pr-2 text-[15px] font-semibold leading-tight text-foreground"
                  >
                    {i.name}
                  </Link>
                  <div className="mt-1 text-[13px] text-muted-foreground">
                    {i.size ? `Размер ${i.size}` : "Без размера"}
                  </div>

                  {i.ticketsBonus && i.ticketsBonus > 0 ? (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                      <Ticket className="h-3 w-3 text-primary" />
                      <span className="text-[12px] font-semibold text-primary">
                        +{i.ticketsBonus * i.qty} {ticketsWord(i.ticketsBonus * i.qty)}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
                      <button
                        type="button"
                        onClick={() => handleQty(i.id, Math.max(1, i.qty - 1))}
                        className="grid h-11 w-11 place-items-center text-foreground active:bg-white/[0.08]"
                        aria-label="Уменьшить"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-9 text-center text-[15px] font-semibold tabular-nums">
                        {i.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQty(i.id, i.qty + 1)}
                        className="grid h-11 w-11 place-items-center text-foreground active:bg-white/[0.08]"
                        aria-label="Увеличить"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-[16px] font-bold tabular-nums text-foreground">
                      {(i.price * i.qty).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label="Удалить"
                  className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-red-500/30 bg-red-500/15 text-red-400 transition-colors active:bg-red-500 active:text-white"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        <div className="divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] text-muted-foreground">Товары</span>
            <span className="text-[15px] tabular-nums text-foreground">
              {total.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[15px] text-muted-foreground">Доставка</span>
            <span className="text-[14px] text-muted-foreground">на оформлении</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[16px] font-semibold text-foreground">Итого</span>
            <span className="text-2xl font-bold tabular-nums text-foreground">
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
            <div className="text-[14px] font-semibold text-primary">Бонус билетов</div>
            <div className="text-[12px] text-muted-foreground">
              Начислится после оплаты — для розыгрышей клуба.
            </div>
          </div>
          <span className="text-xl font-bold tabular-nums text-primary">
            +{ticketsTotal}
          </span>
        </div>
      )}

      {/* Sticky CTA — портал в body, иначе transform-обёртки клуба ломают fixed */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 z-[60] border-t border-white/[0.08] bg-[#0d0d0d]/95 backdrop-blur-xl md:hidden"
            style={{
              bottom: "calc(64px + env(safe-area-inset-bottom))",
              paddingLeft: "max(16px, env(safe-area-inset-left))",
              paddingRight: "max(16px, env(safe-area-inset-right))",
              paddingTop: 12,
              paddingBottom: 12,
              boxShadow: "0 -8px 24px -12px rgba(0,0,0,0.6)",
            }}
          >
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[12px] text-muted-foreground">К оплате</span>
                <span className="text-[18px] font-bold tabular-nums text-foreground">
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="ml-auto flex flex-1 items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-[16px] font-semibold text-primary-foreground active:scale-[0.98]"
              >
                {isAuthed ? "Оформить" : "Войти и оформить"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </main>
  );

  return (
    <>
      {Mobile}
      {Desktop}
    </>
  );
}

// ============ Subcomponents ============

function MobileTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}

function DesktopHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <Link
        to="/club/shop"
        className="hidden items-center gap-1 text-[14px] text-primary hover:underline md:inline-flex"
      >
        <ChevronLeft className="h-4 w-4" />
        В магазин
      </Link>
    </header>
  );
}

function EmptyBlock() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-card/40 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <div className="mt-4 text-[15px] font-semibold text-foreground">Корзина пуста</div>
      <p className="mt-1.5 max-w-[32ch] text-[14px] text-muted-foreground/80">
        Загляни в магазин клуба — мерч, экипировка, открытки с бонусом билетов.
      </p>
      <Link
        to="/club/shop"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-semibold text-primary-foreground transition-transform active:scale-[0.97] md:hover:scale-[1.02]"
      >
        В магазин
      </Link>
    </div>
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
            <div className="mt-1 text-[13px] text-muted-foreground">
              {item.size ? `Размер ${item.size}` : "Без размера"} · {item.price.toLocaleString("ru-RU")} ₽
            </div>
            {item.ticketsBonus && item.ticketsBonus > 0 ? (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                <Ticket className="h-3 w-3 text-primary" />
                <span className="text-[12px] font-semibold text-primary">
                  +{item.ticketsBonus * item.qty} {ticketsWord(item.ticketsBonus * item.qty)}
                </span>
              </div>
            ) : null}
          </div>
          <div className="shrink-0 text-right text-lg font-bold tabular-nums text-foreground">
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
            <span className="w-9 text-center text-sm font-semibold tabular-nums">
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
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
      </div>
    </li>
  );
}
