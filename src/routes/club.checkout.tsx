import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, MapPin, Ticket, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { PaymentBadges } from "@/components/brand/PaymentBadges";
import { PayCardButton, PaySbpButton } from "@/components/brand/PayButton";
import { DadataInput } from "@/components/ui/DadataInput";
import type { DadataAddressData } from "@/lib/dadata";
import { LEGAL } from "@/data/legal";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useMyProfile, useMyAddress } from "@/lib/garage-api";
import { formatRuPhone } from "@/lib/phone";
import { hhToast } from "@/lib/hh-toast";
import { BACKEND_URL } from "@/lib/api";

const PAY_ACTION = `${BACKEND_URL}/api/v1/payments/redirect`;

export const Route = createFileRoute("/club/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({
    payment_error: typeof s.payment_error === "string" ? s.payment_error : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Оформление — клуб HELLHOUND" },
      { name: "description", content: "Оформление заказа в магазине клуба." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubCheckoutPage,
});

const PROFILE_KEY = "hh:checkout:profile:v1";

type CheckoutProfile = {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
};

function readProfile(): Partial<CheckoutProfile> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(PROFILE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function ClubCheckoutPage() {
  const { items, total } = useCart();
  const { isAuthed, user } = useViewer();
  const navigate = useNavigate();
  const search = useSearch({ from: "/club/checkout" }) as { payment_error?: string };

  const profileQ = useMyProfile();
  const addressQ = useMyAddress();

  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState<CheckoutProfile>({
    name: user?.nick ?? "",
    phone: "",
    email: user?.email ?? "",
    city: "",
    address: "",
  });

  const touchedRef = useRef<Set<keyof CheckoutProfile>>(new Set());

  useEffect(() => {
    const saved = readProfile();
    setForm((f) => ({
      name: saved.name || f.name,
      phone: saved.phone || f.phone,
      email: saved.email || f.email,
      city: saved.city || f.city,
      address: saved.address || f.address,
    }));
  }, []);

  useEffect(() => {
    const p = profileQ.data;
    if (!p) return;
    setForm((f) => {
      const next = { ...f };
      const t = touchedRef.current;
      if (!t.has("name") && !next.name && p.nick) next.name = p.nick;
      if (!t.has("email") && !next.email && p.email) next.email = p.email;
      if (!t.has("phone") && !next.phone && p.phone) next.phone = formatRuPhone(p.phone);
      if (!t.has("city") && !next.city && p.city) next.city = p.city;
      return next;
    });
  }, [profileQ.data]);

  useEffect(() => {
    const a = addressQ.data;
    if (!a) return;
    const composed = [a.city, a.postalCode, a.pickupPoint].filter(Boolean).join(", ");
    setForm((f) => {
      const next = { ...f };
      const t = touchedRef.current;
      if (!t.has("name") && a.fullName) next.name = a.fullName;
      if (!t.has("phone") && a.phone) next.phone = formatRuPhone(a.phone);
      if (!t.has("city") && a.city) next.city = a.city;
      if (!t.has("address") && composed) next.address = composed;
      return next;
    });
  }, [addressQ.data]);

  useEffect(() => {
    if (!isAuthed) navigate({ to: "/login" });
    else if (items.length === 0) navigate({ to: "/club/cart" });
  }, [isAuthed, items.length, navigate]);

  // Если бекенд редиректнул сюда с ошибкой — показываем тост один раз.
  useEffect(() => {
    if (search.payment_error) {
      hhToast.error("Ошибка оплаты", { meta: search.payment_error });
      navigate({ to: "/club/checkout", search: {}, replace: true });
    }
  }, [search.payment_error, navigate]);

  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  const orderableItems = useMemo(
    () => items.filter((i) => Boolean(i.productId)),
    [items],
  );

  // JSON, который кладём в hidden input — бекенд распарсит.
  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        orderableItems.map((i) => ({ productId: i.productId!, qty: i.qty, size: i.size })),
      ),
    [orderableItems],
  );

  const cityFallback = form.city.trim() || form.address.split(",")[0]?.trim() || "—";

  const set = <K extends keyof CheckoutProfile>(k: K, v: string) => {
    touchedRef.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const { sbp: sbpEnabled } = usePaymentMethods();

  // Клиентская валидация. Бросаем preventDefault если данные не годятся —
  // иначе пускаем нативный submit формы прямо на бекенд (он 303→на банк).
  const guard = (e: React.FormEvent<HTMLFormElement>) => {
    if (orderableItems.length === 0) {
      e.preventDefault();
      hhToast.error("Корзина пустая или товары устарели — обнови корзину.");
      return;
    }
    if (form.name.trim().length < 2) {
      e.preventDefault();
      hhToast.error("Укажи имя получателя.");
      return;
    }
    if (form.phone.trim().length < 5) {
      e.preventDefault();
      hhToast.error("Укажи телефон.");
      return;
    }
    if (form.address.trim().length < 5) {
      e.preventDefault();
      hhToast.error("Укажи адрес доставки.");
      return;
    }
    if (!agree) {
      e.preventDefault();
      hhToast.error("Поставь галочку согласия с офертой внизу формы.");
      if (typeof document !== "undefined") {
        document
          .querySelector<HTMLInputElement>('input[type="checkbox"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    // Сохраняем профиль для следующего заказа.
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(form));
      } catch {
        /* ignore */
      }
    }
    // Дальше — нативный POST на BACKEND_URL/api/v1/payments/redirect
  };

  if (!isAuthed || items.length === 0) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-[calc(32px+env(safe-area-inset-bottom))] md:max-w-6xl md:px-8 md:py-10 md:pb-16">
      <PageHeader title="Оформление" subtitle="Доставка и оплата" />

      <form
        method="POST"
        action={PAY_ACTION}
        onSubmit={guard}
        className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8"
      >
        {/* Скрытые поля для бекенда — он сам создаст заказ и редиректнёт на банк */}
        <input type="hidden" name="target" value="order" />
        <input type="hidden" name="items" value={itemsJson} />
        <input type="hidden" name="shipping_fio" value={form.name} />
        <input type="hidden" name="shipping_phone" value={form.phone} />
        <input type="hidden" name="shipping_city" value={cityFallback} />
        <input type="hidden" name="shipping_address" value={form.address} />

        {/* ЛЕВАЯ КОЛОНКА: данные получателя/доставки */}
        <div className="space-y-5">
          {/* Контакты */}
          <Section icon={<User className="h-3.5 w-3.5" />} title="Получатель">
            <FieldRow label="Имя">
              <DadataInput
                type="fio"
                value={form.name}
                onChange={(v) => set("name", v)}
                params={{ parts: ["SURNAME", "NAME", "PATRONYMIC"] }}
                placeholder="Иван Иванов"
                autoComplete="name"
                required
              />
            </FieldRow>
            <FieldRow label="Телефон">
              <input
                value={form.phone}
                onChange={(e) => set("phone", formatRuPhone(e.target.value))}
                type="tel"
                inputMode="tel"
                placeholder="+7 (___) ___-__-__"
                autoComplete="tel"
                required
                className="min-w-0 flex-1 bg-transparent py-1.5 text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </FieldRow>
            <FieldRow label="Email" last>
              <DadataInput
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                inputType="email"
                inputMode="email"
                placeholder="rider@example.com"
                autoComplete="email"
                required
              />
            </FieldRow>
          </Section>

          {/* Доставка */}
          <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Доставка">
            <FieldRow label="Адрес" last>
              <DadataInput
                type="address"
                value={form.address}
                onChange={(v) => set("address", v)}
                onSelect={(s) => {
                  const d = s.data as DadataAddressData;
                  const city = d.city_with_type || d.settlement_with_type || "";
                  setForm((f) => ({ ...f, address: s.value, city: city || f.city }));
                  touchedRef.current.add("address");
                  if (city) touchedRef.current.add("city");
                }}
                placeholder="Город, улица, дом, кв."
                autoComplete="street-address"
                required
              />
            </FieldRow>
          </Section>

          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Truck className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-semibold text-foreground">СДЭК</div>
              <div className="text-[12px] text-muted-foreground">
                По всей России, 2–5 дней. Расчёт курьером.
              </div>
            </div>
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Продавец
            </div>
            <div className="text-[12px] leading-relaxed text-muted-foreground">
              {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn} · {LEGAL.address}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="text-[12px] leading-relaxed text-muted-foreground">
              Я согласен с{" "}
              <Link to="/legal/offer" className="text-primary underline-offset-2 hover:underline">
                публичной офертой
              </Link>
              ,{" "}
              <Link to="/legal/privacy" className="text-primary underline-offset-2 hover:underline">
                обработкой персональных данных
              </Link>{" "}
              и условиями{" "}
              <Link to="/shop-info" className="text-primary underline-offset-2 hover:underline">
                оплаты и доставки
              </Link>
              .
            </span>
          </label>
        </div>

        {/* ПРАВАЯ КОЛОНКА */}
        <aside className="mt-5 space-y-4 md:sticky md:top-24 md:mt-0">
          <section className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
            <div className="border-b border-white/[0.05] px-4 py-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Заказ · {items.length}
              </span>
            </div>
            <ul className="divide-y divide-white/[0.05]">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                  <img
                    src={i.image}
                    alt={i.name}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {i.name}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {i.size ? `${i.size} · ` : ""}× {i.qty}
                    </div>
                  </div>
                  <span className="font-mono text-[13px] tabular-nums text-foreground">
                    {(i.price * i.qty).toLocaleString("ru-RU")} ₽
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-3.5">
              <span className="text-[15px] font-semibold">Итого</span>
              <span className="font-display text-2xl font-black tabular-nums">
                {total.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </section>

          {ticketsTotal > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.08] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                <Ticket className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Бонус билетов
                </div>
                <div className="text-[12px] text-muted-foreground">
                  Начислим после оплаты — для розыгрышей клуба.
                </div>
              </div>
              <span className="font-display text-xl font-black italic tabular-nums text-primary">
                +{ticketsTotal}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Принимаем
            </div>
            <PaymentBadges size="sm" />
          </div>

          {/* Мобильные кнопки оплаты */}
          <div className="flex flex-col gap-2 md:hidden">
            <PayCardButton type="submit" name="method" value="card" size="lg" />
            {sbpEnabled && (
              <PaySbpButton type="submit" name="method" value="sbp" size="lg" />
            )}
          </div>

          {/* Desktop кнопки оплаты */}
          <div className="hidden flex-col gap-2 md:flex">
            <PayCardButton type="submit" name="method" value="card" size="lg" />
            {sbpEnabled && (
              <PaySbpButton type="submit" name="method" value="sbp" size="lg" />
            )}
          </div>
        </aside>
      </form>
    </main>
  );
}



function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2 px-3">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40">
        {children}
      </div>
    </section>
  );
}

function FieldRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-2.5 ${last ? "" : "border-b border-white/[0.05]"}`}
    >
      <span className="w-[88px] shrink-0 text-[13px] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

