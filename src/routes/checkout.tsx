import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { ME } from "@/data/profile";

export const Route = createFileRoute("/checkout")({
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
  const { isAuthed } = useViewer();
  const navigate = useNavigate();

  const [name, setName] = useState(ME.nick ?? "");
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const orderId = `HH-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setTimeout(() => {
      clear();
      navigate({ to: "/checkout/success", search: { o: orderId, t: cashback } });
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
                  onChange={setPhone}
                  type="tel"
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
              <div className="mt-1 text-[11px] text-muted-foreground">
                После оплаты получите {cashback} билетов кешбэком
              </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
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
      />
    </div>
  );
}
