import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
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

function CartPage() {
  const { items, total, setQty, remove } = useCart();
  const { isAuthed } = useViewer();
  const navigate = useNavigate();

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
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
                >
                  <Link
                    to="/shop/$productSlug"
                    params={{ productSlug: i.slug }}
                    className="block size-20 shrink-0 overflow-hidden rounded bg-surface"
                  >
                    <img
                      src={i.image}
                      alt={i.name}
                      className="size-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/shop/$productSlug"
                      params={{ productSlug: i.slug }}
                      className="block truncate font-medium hover:text-primary"
                    >
                      {i.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {i.size ? `Размер ${i.size}` : "—"} ·{" "}
                      {i.price.toLocaleString("ru-RU")} ₽
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => setQty(i.id, Math.max(1, i.qty - 1))}
                          className="flex size-8 items-center justify-center text-muted-foreground hover:text-primary"
                          aria-label="Уменьшить"
                        >
                          −
                        </button>
                        <span className="w-8 text-center font-mono text-sm">
                          {i.qty}
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
                  </div>
                  <div className="self-start font-mono text-sm">
                    {(i.price * i.qty).toLocaleString("ru-RU")} ₽
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
              <div className="mt-2 text-[11px] text-muted-foreground">
                Кешбэк после оплаты: {Math.floor(total / 200)} билетов
              </div>
              <Button
                className="mt-6 w-full"
                onClick={() =>
                  isAuthed
                    ? navigate({ to: "/checkout" })
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
