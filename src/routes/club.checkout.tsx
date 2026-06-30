import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, PlumpMap as MapPin, PlumpTicket, PlumpTruck as Truck, User } from "@/components/ui/icons";
import { PageHeader } from "@/components/club/PageHeader";
import { PaymentBadges } from "@/components/brand/PaymentBadges";
import { PayButton } from "@/components/brand/PayButton";
import { DadataInput } from "@/components/ui/DadataInput";
import { CdekDeliveryPicker, EMPTY_CDEK_STATE, type CdekPickerState } from "@/components/checkout/CdekDeliveryPicker";
import { LEGAL } from "@/data/legal";
import { useCart } from "@/hooks/use-cart";
import { useViewer } from "@/hooks/use-viewer";

import { useMyProfile, useMyAddress } from "@/lib/garage-api";
import { formatRuPhone } from "@/lib/phone";
import { hhToast } from "@/lib/hh-toast";
import { apiFetch, BACKEND_URL } from "@/lib/api";
import { startPayment } from "@/lib/pwa-pay";

const PAY_ACTION = `${BACKEND_URL}/api/v1/payments/redirect`;

export const Route = createFileRoute("/club/checkout")({
  validateSearch: (s: Record<string, unknown>): { payment_error?: string } => {
    const v = typeof s.payment_error === "string" ? s.payment_error : undefined;
    return v ? { payment_error: v } : {};
  },
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
  const { items, total, loading: cartLoading } = useCart();
  const { isAuthed, user, hydrated } = useViewer();
  const navigate = useNavigate();
  const search = useSearch({ from: "/club/checkout" }) as { payment_error?: string };

  const profileQ = useMyProfile();
  const addressQ = useMyAddress();

  const [agree, setAgree] = useState(false);
  // Имя НЕ префиллим из nick/профиля: для накладной нужно реальное ФИО,
  // а ник часто не совпадает с паспортным именем. Пусть юзер вводит руками.
  const [form, setForm] = useState<CheckoutProfile>({
    name: "",
    phone: "",
    email: user?.email ?? "",
    city: "",
    address: "",
  });

  const touchedRef = useRef<Set<keyof CheckoutProfile>>(new Set());

  useEffect(() => {
    const saved = readProfile();
    setForm((f) => ({
      // Имя НЕ восстанавливаем из localStorage — чтобы каждый раз вводили
      // получателя осознанно (иначе накладная уйдёт на старое имя).
      name: f.name,
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
      // Имя не префиллим из ника профиля — нужен реальный получатель.
      if (!t.has("email") && !next.email && p.email) next.email = p.email;
      if (!t.has("phone") && !next.phone && p.phone) next.phone = formatRuPhone(p.phone);
      if (!t.has("city") && !next.city && p.city) next.city = p.city;
      return next;
    });
  }, [profileQ.data]);

  // СДЭК-блок. Состояние держим тут — компонент только редактирует.
  const [cdek, setCdek] = useState<CdekPickerState>(EMPTY_CDEK_STATE);

  useEffect(() => {
    const a = addressQ.data;
    if (!a) return;
    setForm((f) => {
      const next = { ...f };
      const t = touchedRef.current;
      if (!t.has("name") && a.fullName) next.name = a.fullName;
      if (!t.has("phone") && a.phone) next.phone = formatRuPhone(a.phone);
      if (!t.has("city") && a.city) next.city = a.city;
      return next;
    });
    // Подставляем сохранённый ПВЗ/город из профиля, если юзер ещё ничего не выбрал.
    setCdek((c) => {
      if (c.cityCode) return c;
      const next: CdekPickerState = { ...c };
      const anyA = a as unknown as {
        cdekCityCode?: number | null;
        cdekPvzCode?: string | null;
        cdekPvzAddress?: string | null;
        preferredMode?: "pvz" | "courier";
        streetAddress?: string;
      };
      if (anyA.cdekCityCode) {
        next.cityCode = anyA.cdekCityCode;
        next.cityName = a.city || "";
      }
      if (anyA.preferredMode === "courier") next.mode = "courier";
      if (anyA.cdekPvzCode) {
        next.pvzCode = anyA.cdekPvzCode;
        next.pvzAddress = anyA.cdekPvzAddress ?? null;
      }
      if (anyA.streetAddress) next.street = anyA.streetAddress;
      return next;
    });
  }, [addressQ.data]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthed) {
      navigate({ to: "/login" });
      return;
    }
    // НЕ выкидываем юзера, пока корзина с бекенда ещё грузится — иначе
    // после возврата с /payments/redirect он мигом улетит в /club/cart
    // и не увидит ни тоста с ошибкой, ни самой страницы оформления.
    if (cartLoading) return;
    // Если бек вернул нас с ошибкой оплаты — даём увидеть тост, не редиректим.
    if (search.payment_error) return;
    if (items.length === 0) navigate({ to: "/club/cart" });
  }, [hydrated, isAuthed, items.length, cartLoading, search.payment_error, navigate]);

  // Если бекенд редиректнул сюда с ошибкой — показываем тост один раз.
  // НЕ чистим search моментально, чтобы юзер успел увидеть причину.
  useEffect(() => {
    if (search.payment_error) {
      // eslint-disable-next-line no-console
      console.error("[payment_error]", search.payment_error);
      hhToast.error("Ошибка оплаты", { meta: search.payment_error, duration: 15000 });
    }
  }, [search.payment_error]);

  const ticketsTotal = useMemo(
    () => items.reduce((s, i) => s + (i.ticketsBonus ?? 0) * i.qty, 0),
    [items],
  );

  const orderableItems = useMemo(
    () => items.filter((i) => Boolean(i.productId)),
    [items],
  );

  // Digital-only: в заказе одни цифровые товары → адрес не нужен.
  const isDigitalOnly = useMemo(
    () => orderableItems.length > 0 && orderableItems.every((i) => i.kind === "digital"),
    [orderableItems],
  );

  // Виртуальные товары (Hell Pass, билеты): доставка не нужна.
  const needsShipping = useMemo(
    () => orderableItems.some((i) => i.kind === "physical" || i.kind === "preorder"),
    [orderableItems],
  );

  // --- Расчёт стоимости доставки СДЭК (дебаунс, при смене города/режима/ПВЗ) ---
  const [shipPrice, setShipPrice] = useState<number | null>(null);
  const [shipDays, setShipDays] = useState<{ min: number; max: number } | null>(null);
  const [shipCalcLoading, setShipCalcLoading] = useState(false);
  const [shipCalcError, setShipCalcError] = useState<string | null>(null);

  const canCalculate =
    needsShipping &&
    cdek.cityCode != null &&
    ((cdek.mode === "pvz" && cdek.pvzCode) || (cdek.mode === "courier" && cdek.street.trim().length >= 5));

  useEffect(() => {
    if (!needsShipping) {
      setShipPrice(0);
      setShipDays(null);
      setShipCalcError(null);
      return;
    }
    if (!canCalculate) {
      setShipPrice(null);
      setShipDays(null);
      setShipCalcError(null);
      return;
    }
    const productPayload = orderableItems
      .filter((i) => i.kind !== "virtual" && i.kind !== "digital")
      .map((i) => ({ productId: i.productId!, qty: i.qty }));
    if (productPayload.length === 0) {
      setShipPrice(0);
      setShipDays(null);
      return;
    }
    let cancelled = false;
    setShipCalcLoading(true);
    setShipCalcError(null);
    const t = setTimeout(() => {
      apiFetch<{ totalSum: number; periodMin: number; periodMax: number }>(
        "/api/v1/cdek/calculate",
        {
          method: "POST",
          body: JSON.stringify({
            cityCode: cdek.cityCode,
            mode: cdek.mode,
            items: productPayload,
          }),
        },
      )
        .then((r) => {
          if (cancelled) return;
          setShipPrice(r.totalSum);
          setShipDays({ min: r.periodMin, max: r.periodMax });
        })
        .catch((e: { message?: string }) => {
          if (cancelled) return;
          setShipPrice(null);
          setShipDays(null);
          setShipCalcError(e?.message || "Не удалось рассчитать доставку");
        })
        .finally(() => {
          if (!cancelled) setShipCalcLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // canCalculate уже включает cdek.cityCode/mode/pvzCode/street — этого достаточно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canCalculate, cdek.cityCode, cdek.mode, cdek.pvzCode, cdek.street, orderableItems.length, needsShipping]);

  const grandTotal = total + (shipPrice ?? 0);

  const courierAddress = useMemo(() => {
    const parts = [cdek.cityName, cdek.street.trim()].filter(Boolean);
    const apt = cdek.apartment.trim();
    const ent = cdek.entrance.trim();
    if (apt) parts.push(`кв. ${apt}`);
    if (ent) parts.push(`подъезд ${ent}`);
    return parts.join(", ");
  }, [cdek.cityName, cdek.street, cdek.apartment, cdek.entrance]);

  const shippingAddressForSubmit = needsShipping
    ? cdek.mode === "pvz"
      ? cdek.pvzAddress ?? ""
      : courierAddress
    : "—";
  const cityForSubmit = needsShipping ? cdek.cityName || "—" : "—";

  const set = <K extends keyof CheckoutProfile>(k: K, v: string) => {
    touchedRef.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Клиентская валидация.
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
    if (needsShipping) {
      if (!cdek.cityCode) {
        e.preventDefault();
        hhToast.error("Выбери город доставки.");
        return;
      }
      if (cdek.mode === "pvz" && !cdek.pvzCode) {
        e.preventDefault();
        hhToast.error("Выбери пункт выдачи СДЭК.");
        return;
      }
      if (cdek.mode === "courier" && cdek.street.trim().length < 5) {
        e.preventDefault();
        hhToast.error("Укажи улицу, дом и квартиру для курьера.");
        return;
      }
      if (shipPrice == null) {
        e.preventDefault();
        hhToast.error("Дождись расчёта стоимости доставки.");
        return;
      }
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
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(PROFILE_KEY, JSON.stringify(form));
      } catch {
        /* ignore */
      }
    }

    e.preventDefault();
    const payload: Record<string, string> = {
      target: "order",
      shipping_fio: form.name,
      shipping_phone: form.phone,
      shipping_city: cityForSubmit,
      shipping_address: shippingAddressForSubmit || "—",
      shipping_mode: needsShipping ? cdek.mode : "none",
      method: "sbp",
    };
    if (needsShipping && cdek.cityCode) {
      payload.cdek_city_code = String(cdek.cityCode);
      if (cdek.mode === "pvz" && cdek.pvzCode) {
        payload.cdek_pvz_code = cdek.pvzCode;
        if (cdek.pvzAddress) payload.cdek_pvz_address = cdek.pvzAddress;
      }
    }
    void startPayment(payload, { forceLandingPage: true }).then((r) => {
      if (!r.ok) hhToast.error("Ошибка оплаты", { meta: r.message });
    });
  };

  if (!hydrated || !isAuthed) return null;
  if (items.length === 0 && !search.payment_error) return null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-[calc(32px+env(safe-area-inset-bottom))] md:max-w-6xl md:px-8 md:py-10 md:pb-16">
      <PageHeader title="Оформление" subtitle="Доставка и оплата" />

      {search.payment_error ? (
        <section className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          <div className="font-semibold text-destructive">Не удалось открыть оплату</div>
          <div className="mt-1 text-muted-foreground">{search.payment_error}</div>
        </section>
      ) : null}

      <form
        method="POST"
        action={PAY_ACTION}
        onSubmit={guard}
        className="md:grid md:grid-cols-[1fr_380px] md:items-start md:gap-8"
      >
        {/* Скрытые поля для бекенда — он сам создаст заказ и редиректнёт на банк */}
        <input type="hidden" name="target" value="order" />
        <input type="hidden" name="method" value="sbp" />
        <input type="hidden" name="shipping_fio" value={form.name} />
        <input type="hidden" name="shipping_phone" value={form.phone} />
        <input type="hidden" name="shipping_city" value={cityForSubmit} />
        <input type="hidden" name="shipping_address" value={shippingAddressForSubmit || "—"} />
        <input type="hidden" name="shipping_mode" value={needsShipping ? cdek.mode : "none"} />
        {needsShipping && cdek.cityCode ? (
          <input type="hidden" name="cdek_city_code" value={String(cdek.cityCode)} />
        ) : null}
        {needsShipping && cdek.mode === "pvz" && cdek.pvzCode ? (
          <>
            <input type="hidden" name="cdek_pvz_code" value={cdek.pvzCode} />
            {cdek.pvzAddress ? (
              <input type="hidden" name="cdek_pvz_address" value={cdek.pvzAddress} />
            ) : null}
          </>
        ) : null}

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

          {/* Доставка / выдача */}
          {isDigitalOnly || !needsShipping ? (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-foreground">
                  {isDigitalOnly ? "Цифровой товар" : "Доступ сразу после оплаты"}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {isDigitalOnly
                    ? `Файл придёт на ${form.email || "указанный email"} сразу после оплаты.`
                    : "Доставка не требуется — активируем в кабинете."}
                </div>
              </div>
            </div>
          ) : (
            <>
              <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Доставка СДЭК">
                <div className="p-3">
                  <CdekDeliveryPicker value={cdek} onChange={setCdek} />
                </div>
              </Section>

              <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-foreground">
                      Стоимость доставки
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {!cdek.cityCode
                        ? "Выбери город — рассчитаем автоматически."
                        : cdek.mode === "pvz" && !cdek.pvzCode
                          ? "Выбери пункт выдачи."
                          : cdek.mode === "courier" && cdek.street.trim().length < 5
                            ? "Укажи улицу и дом."
                            : shipCalcLoading
                              ? "Считаем тариф СДЭК…"
                              : shipCalcError
                                ? shipCalcError
                                : shipDays
                                  ? `~${shipDays.min}–${shipDays.max} дн., из Краснодара`
                                  : "—"}
                    </div>
                  </div>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-foreground">
                    {shipCalcLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : shipPrice != null ? (
                      `${shipPrice.toLocaleString("ru-RU")} ₽`
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Продавец
            </div>
            <div className="text-[12px] leading-relaxed text-muted-foreground">
              {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn} · {LEGAL.address}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border-2 border-primary/40 bg-primary/[0.06] px-5 py-4 shadow-[0_0_0_4px_rgba(0,0,0,0)] transition hover:border-primary/60 hover:bg-primary/[0.1]">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            />
            <span className="text-[14px] leading-relaxed text-foreground">
              Я согласен с{" "}
              <Link to="/legal/offer" className="font-semibold text-primary underline underline-offset-2">
                публичной офертой
              </Link>
              ,{" "}
              <Link to="/legal/privacy" className="font-semibold text-primary underline underline-offset-2">
                обработкой персональных данных
              </Link>{" "}
              и условиями{" "}
              <Link to="/shop-info" className="font-semibold text-primary underline underline-offset-2">
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
            <div className="space-y-1.5 border-t border-white/[0.05] px-4 py-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Товары</span>
                <span className="font-mono tabular-nums text-foreground">
                  {total.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              {needsShipping && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Доставка СДЭК</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {shipCalcLoading
                      ? "…"
                      : shipPrice != null
                        ? `${shipPrice.toLocaleString("ru-RU")} ₽`
                        : "—"}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-3.5">
              <span className="text-[15px] font-semibold">Итого</span>
              <span className="font-display text-2xl font-black tabular-nums">
                {grandTotal.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </section>


          {ticketsTotal > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.08] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                <PlumpTicket className="h-4 w-4" />
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

          <PayButton type="submit" size="lg" />

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

