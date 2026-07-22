import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { PlumpCart, PlumpTicket } from "@/components/ui/icons";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { PlumpNum, PlumpPrice } from "@/components/brand/PlumpNum";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — HELLHOUND Racing Club" },
      { name: "description", content: "Ваша корзина в магазине HELLHOUND." },
    ],
  }),
  component: CartPage,
});

function ticketsWord(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "билет";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "билета";
  return "билетов";
}

function CartPage() {
  const { items, total, setQty, remove } = useCart();
  const { isAuthed } = useViewer();
  const navigate = useNavigate();

  // Билеты считаем ТОЛЬКО по бонусу, заданному на товаре.
  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Корзина
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase italic tracking-tight md:text-5xl">
          Ваш заказ
        </h1>

        {items.length === 0 ? (
          <div className="mt-12 rounded-lg border border-border bg-card p-12 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              корзина пуста
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Добавьте мерч из магазина — оформление и оплата откроются автоматически.
            </p>
            <Button asChild className="mt-6">
              <Link to="/shop">В магазин</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-12 grid gap-8 md:grid-cols-[1fr_320px]">
            <ul className="space-y-3">
              {items.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-border bg-card p-3 sm:p-4"
                >
                  <div className="flex gap-3 sm:gap-4">
                    <Link
                      to="/shop/$productSlug"
                      params={{ productSlug: i.slug }}
                      className="block size-16 shrink-0 overflow-hidden rounded bg-surface sm:size-20"
                    >
                      {i.image ? (
                        <img
                          src={i.image}
                          alt={i.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-muted-foreground/60">
                          <PlumpCart className="h-6 w-6" />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/shop/$productSlug"
                        params={{ productSlug: i.slug }}
                        className="block truncate text-sm font-medium hover:text-primary sm:text-base"
                      >
                        {i.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                        <span>{i.size ? `Размер ${i.size}` : "—"} ·</span>
                        <PlumpPrice value={i.price} size={12} />
                      </div>
                    </div>
                    <div className="shrink-0 whitespace-nowrap text-right">
                      <PlumpPrice value={i.price * i.qty} size={14} />
                    </div>

                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center border border-border">
                      <button
                        onClick={() => setQty(i.id, Math.max(1, i.qty - 1))}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-primary"
                        aria-label="Уменьшить"
                      >
                        −
                      </button>
                      <span className="flex w-8 items-center justify-center">
                        <PlumpNum value={i.qty} size={12} />
                      </span>

                      <button
                        onClick={() => setQty(i.id, i.qty + 1)}
                        className="flex size-8 items-center justify-center text-muted-foreground hover:text-primary"
                        aria-label="Увеличить"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => remove(i.id)}
                      className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <aside className="h-fit rounded-lg border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Итого
                </span>
                <span className="font-display text-2xl font-black">
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>

              {/* Бонус билетов — только из ticketsBonus на товарах */}
              {ticketsTotal > 0 && (
                <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/[0.08] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <PlumpTicket className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                      Бонус билетов
                    </span>
                  </div>
                  <span className="whitespace-nowrap font-display text-xl font-black italic tabular-nums text-primary">
                    +{ticketsTotal} {ticketsWord(ticketsTotal)}
                  </span>
                </div>
              )}

              <Button
                className="mt-4 w-full"
                onClick={() =>
                  isAuthed
                    ? navigate({ to: "/club/checkout" })
                    : navigate({ to: "/login" })
                }
              >
                {isAuthed ? "Оформить заказ" : "Войти и оформить"}
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Оформление доступно только участникам клуба.
              </p>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
