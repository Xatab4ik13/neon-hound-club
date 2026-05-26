import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Ticket, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { PaymentBadges } from "@/components/brand/PaymentBadges";
import { DadataInput } from "@/components/ui/DadataInput";
import type { DadataAddressData, DadataSuggestion } from "@/lib/dadata";
import { LEGAL } from "@/data/legal";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile, useMyAddress } from "@/lib/garage-api";
import { formatRuPhone } from "@/lib/phone";
import { createOrder, initOrderPayment, qk } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { hhToast } from "@/lib/hh-toast";

export const Route = createFileRoute("/club/checkout")({
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
  const { items, total, clear } = useCart();
  const { isAuthed, user } = useViewer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Профиль и сохранённый адрес доставки из аккаунта
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

  // Поля, которые юзер вручную правил — их не перетираем при гидрации
  const touchedRef = useRef<Set<keyof CheckoutProfile>>(new Set());

  // Гидрация из прошлого заказа (localStorage) — сразу при маунте
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

  // Автозаполнение из аккаунта: профиль (email, nick, phone, city)
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

  // Автозаполнение из сохранённого адреса доставки (приоритет выше профиля)
  useEffect(() => {
    const a = addressQ.data;
    if (!a) return;
    const composed = [a.postalCode, a.pickupPoint].filter(Boolean).join(", ");
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

  // Гард
  useEffect(() => {
    if (!isAuthed) navigate({ to: "/login" });
    else if (items.length === 0) navigate({ to: "/club/cart" });
  }, [isAuthed, items.length, navigate]);

  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  const orderableItems = useMemo(
    () => items.filter((i) => Boolean(i.productId)),
    [items],
  );

  const set = <K extends keyof CheckoutProfile>(k: K, v: string) => {
    touchedRef.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const mutation = useMutation({
    mutationFn: async (input: Parameters<typeof createOrder>[0]) => {
      const order = await createOrder(input);
      // Сразу инициируем оплату через Т-Банк и получаем ссылку на платёжку.
      const pay = await initOrderPayment(order.id);
      return { order, pay };
    },
    onSuccess: ({ order, pay }) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(form));
      }
      clear();
      queryClient.invalidateQueries({ queryKey: qk.shopOrders });
      queryClient.invalidateQueries({ queryKey: qk.ticketsBalance });
      // Редирект на платёжную страницу Т-Банка. После оплаты юзер вернётся на /pay/success.
      window.location.href = pay.paymentUrl;
      // На случай если редирект завис — fallback на success-страницу заказа.
      void order;
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Не удалось оформить заказ";
      hhToast.error("Ошибка оплаты", { meta: msg });
    },
  });

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 5 &&
    form.city.trim().length >= 1 &&
    form.address.trim().length >= 3 &&
    orderableItems.length > 0 &&
    agree &&
    !mutation.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({
      items: orderableItems.map((i) => ({ productId: i.productId!, qty: i.qty })),
      shipping: {
        fio: form.name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
      },
    });
  };

  const submitting = mutation.isPending;

  if (!isAuthed || items.length === 0) return null;

  // Если в корзине только старые позиции без productId — оформить нельзя

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(124px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Оформление" subtitle="Доставка и оплата" />

      <form onSubmit={submit} className="space-y-5">
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
          <FieldRow label="Город">
            <DadataInput
              type="address"
              value={form.city}
              onChange={(v) => set("city", v)}
              onSelect={(s) => {
                const d = s.data as DadataAddressData;
                const city = d.city_with_type || d.settlement_with_type || s.value;
                set("city", city);
              }}
              params={{ from_bound: { value: "city" }, to_bound: { value: "settlement" } }}
              placeholder="Москва"
              autoComplete="address-level2"
              required
            />
          </FieldRow>
          <FieldRow label="Адрес" last>
            <DadataInput
              type="address"
              value={form.address}
              onChange={(v) => set("address", v)}
              onSelect={(s) => {
                const d = s.data as DadataAddressData;
                if (!touchedRef.current.has("city")) {
                  const city = d.city_with_type || d.settlement_with_type || "";
                  if (city) set("city", city);
                  touchedRef.current.delete("city");
                }
                onAddressSelectedSetAddress(set, s);
              }}
              params={{ from_bound: { value: "street" }, to_bound: { value: "flat" } }}
              placeholder="Улица, дом, кв."
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

        {/* Состав заказа */}
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

        {/* Платёжные системы */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Принимаем
          </div>
          <PaymentBadges size="sm" />
        </div>

        {/* Продавец (для банка-эквайера) */}
        <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
          <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Продавец
          </div>
          <div className="text-[12px] leading-relaxed text-muted-foreground">
            {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn} · {LEGAL.address}
          </div>
        </div>

        {/* Согласие на оферту */}
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

        {/* Sticky CTA */}
        <div
          className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-black/85 px-4 py-3 backdrop-blur-xl"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
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
              type="submit"
              disabled={!canSubmit || submitting}
              className="ml-auto flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-sm font-black uppercase tracking-wider text-primary-foreground transition-opacity active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? "Оформляем…" : "Оплатить"}
            </button>
          </div>
        </div>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  required,
  last,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "tel" | "email" | "text" | "numeric";
  placeholder?: string;
  required?: boolean;
  last?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-2.5 ${last ? "" : "border-b border-white/[0.05]"}`}
    >
      <span className="w-[88px] shrink-0 text-[13px] text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className="min-w-0 flex-1 bg-transparent py-1.5 text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </label>
  );
}
