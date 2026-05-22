import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Ticket, Truck, User } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";
import { formatRuPhone } from "@/lib/phone";
import { createOrder, qk } from "@/lib/queries";
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
  const { isAuthed, viewer } = useViewer();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<CheckoutProfile>({
    name: viewer?.nick ?? "",
    phone: "",
    email: viewer?.email ?? "",
    city: viewer?.city ?? "",
    address: "",
  });

  // Гидрация из прошлого заказа
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

  // Подхватываем актуальный профиль, когда он подгрузится
  useEffect(() => {
    if (!viewer) return;
    setForm((f) => ({
      ...f,
      name: f.name || viewer.nick || "",
      email: f.email || viewer.email || "",
      city: f.city || viewer.city || "",
    }));
  }, [viewer]);

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
  const hasLegacyItems = orderableItems.length !== items.length;

  const set = <K extends keyof CheckoutProfile>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(form));
      }
      clear();
      queryClient.invalidateQueries({ queryKey: qk.shopOrders });
      queryClient.invalidateQueries({ queryKey: qk.ticketsBalance });
      const shortId = order.id.slice(0, 8).toUpperCase();
      navigate({
        to: "/checkout/success",
        search: { o: shortId, t: ticketsTotal },
      });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Не удалось оформить заказ";
      hhToast.error("Ошибка оформления", { meta: msg });
    },
  });

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.phone.trim().length >= 5 &&
    form.city.trim().length >= 1 &&
    form.address.trim().length >= 3 &&
    orderableItems.length > 0 &&
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
  const cannotOrderBecauseLegacy = orderableItems.length === 0;

  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Оформление" subtitle="Доставка и оплата" />

      <form onSubmit={submit} className="space-y-5">
        {/* Контакты */}
        <Section icon={<User className="h-3.5 w-3.5" />} title="Получатель">
          <Field label="Имя" value={form.name} onChange={(v) => set("name", v)} required />
          <Field
            label="Телефон"
            value={form.phone}
            onChange={(v) => set("phone", formatRuPhone(v))}
            type="tel"
            inputMode="tel"
            placeholder="+7 (___) ___-__-__"
            required
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            type="email"
            inputMode="email"
            placeholder="rider@example.com"
            required
            last
          />
        </Section>

        {/* Доставка */}
        <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Доставка">
          <Field label="Город" value={form.city} onChange={(v) => set("city", v)} required />
          <Field
            label="Адрес"
            value={form.address}
            onChange={(v) => set("address", v)}
            placeholder="Улица, дом, кв."
            required
            last
          />
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

        <p className="px-1 text-center text-[11px] text-muted-foreground/80">
          Нажимая «Оплатить», вы соглашаетесь с{" "}
          <Link to="/about" className="text-primary">
            условиями клуба
          </Link>
          .
        </p>

        {/* Sticky CTA */}
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
