import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — HELLHOUND Racing Club" },
      { name: "description", content: "Ваша корзина в магазине HELLHOUND." },
      { property: "og:title", content: "Корзина — HELLHOUND" },
      { property: "og:description", content: "Ваша корзина в магазине HELLHOUND." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  // TODO: подключить useCart() с localStorage на следующем этапе.
  const items: Array<{ id: string; title: string; price: number; qty: number }> = [];
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);

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
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-xs text-muted-foreground">× {i.qty}</div>
                  </div>
                  <div className="font-mono text-sm">{i.price * i.qty} ₽</div>
                </li>
              ))}
            </ul>
            <aside className="h-fit rounded-lg border border-border bg-card p-6">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Итого
                </span>
                <span className="font-display text-2xl font-black">{total} ₽</span>
              </div>
              <Button className="mt-6 w-full" disabled>
                Оформить заказ
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
