import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";

import { formatRuPhone } from "@/lib/phone";

export const Route = createFileRoute("/checkout/")({
  head: () => ({
    meta: [
      { title: "Оформление заказа — HELLHOUND" },
      { name: "description", content: "Оформление заказа в магазине HELLHOUND." },
    ],
  }),
  component: CheckoutPage,
});



function CheckoutPage() {
  const { items, total, clear } = useCart();
  const viewer = useViewer();
  const { isAuthed } = viewer;
  const navigate = useNavigate();

  const [name, setName] = useState(viewer.nick ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Гард: гость → login; пустая корзина → /cart.
  useEffect(() => {
    if (!isAuthed) navigate({ to: "/login" });
    else if (items.length === 0) navigate({ to: "/cart" });
  }, [isAuthed, items.length, navigate]);

  const cashback = Math.floor(total / 200);
  const ticketsFromDigital = items.reduce(
    (s, i) => s + (i.ticketsBonus ?? 0) * i.qty,
    0,
  );
  const totalTickets = cashback + ticketsFromDigital;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const orderId = `HH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setTimeout(() => {
      clear();
      navigate({ to: "/checkout/success", search: { o: orderId, t: totalTickets } });
    }, 600);
  };


  if (!isAuthed || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-8">
        <Link
          to="/cart"
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← в корзину
        </Link>
        <h1 className="mt-3 font-display text-4xl font-black uppercase italic tracking-tight md:text-5xl">
          Оформление
        </h1>

        <form
          onSubmit={submit}
          className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]"
        >
          <div className="space-y-8">
            <Section title="1. Получатель">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Имя" value={name} onChange={setName} required />
                <Field
                  label="Телефон"
                  value={phone}
                  onChange={(v) => setPhone(formatRuPhone(v))}
                  type="tel"
                  placeholder="+7 (___) ___-__-__"
                  required
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Email"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    required
                  />
                </div>
              </div>
            </Section>

            <Section title="2. Доставка">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="font-medium">СДЭК</div>
                    <div className="text-xs text-muted-foreground">
                      По всей России, 2–5 дней. Стоимость рассчитает курьер.
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    выбрано
                  </span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Скоро подключим API СДЭК — расчёт и трекинг автоматом.
              </p>
              <div className="mt-4">
                <Field
                  label="Адрес доставки"
                  value={address}
                  onChange={setAddress}
                  required
                />
              </div>
            </Section>

            <Section title="3. Оплата">
              <p className="text-sm text-muted-foreground">
                Оплата картой через защищённый шлюз. Реальный платёжный шлюз
                подключим позже — пока кнопка просто оформит заказ.
              </p>
            </Section>
          </div>

          <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="space-y-2">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between text-sm">
                  <span className="truncate pr-2">
                    {i.name}
                    {i.size ? ` · ${i.size}` : ""} × {i.qty}
                  </span>
                  <span className="font-mono">
                    {(i.price * i.qty).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">
                  Итого
                </span>
                <span className="font-display text-2xl font-black">
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>

              {totalTickets > 0 && (
                <div className="mt-4 flex items-center justify-between gap-2 border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300/80">
                      Билетов начислится
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {ticketsFromDigital > 0
                        ? `${ticketsFromDigital} за открытки + ${cashback} кешбэк`
                        : "кешбэк 1 билет за 200 ₽"}
                    </span>
                  </div>
                  <span className="whitespace-nowrap font-display text-xl font-black italic tabular-nums text-emerald-300">
                    +{totalTickets}
                  </span>
                </div>
              )}

            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Оформляем…" : "Оплатить"}
            </Button>
          </aside>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 font-display text-lg uppercase tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
