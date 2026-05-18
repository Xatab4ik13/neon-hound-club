import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";

type Search = { o?: string; t?: number };

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    o: typeof s.o === "string" ? s.o : undefined,
    t: typeof s.t === "number" ? s.t : Number(s.t) || 0,
  }),
  head: () => ({
    meta: [{ title: "Заказ оформлен — HELLHOUND" }],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { o, t } = Route.useSearch();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-40 text-center md:px-8">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="font-display text-2xl">✓</span>
        </div>
        <h1 className="mt-6 font-display text-4xl font-black uppercase italic tracking-tight md:text-5xl">
          Заказ принят
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Номер заказа:{" "}
          <span className="font-mono text-foreground">{o ?? "—"}</span>.
          Подтверждение придёт на email. Статусы и трекинг — в личном кабинете.
        </p>
        {t ? (
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-primary">
            +{t} билетов начислено
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/club/me">В личный кабинет</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/shop">Продолжить покупки</Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
