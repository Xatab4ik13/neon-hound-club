import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { isValidPhoneNumber } from "libphonenumber-js";
import { PageHeader } from "@/components/club/PageHeader";
import { PayButton } from "@/components/brand/PayButton";
import { DadataInput } from "@/components/ui/DadataInput";
import { PhoneInput } from "@/components/ui/phone-input";
import { CdekDeliveryPicker, EMPTY_CDEK_STATE, type CdekPickerState } from "@/components/checkout/CdekDeliveryPicker";
import { apiFetch } from "@/lib/api";
import { startPayment } from "@/lib/pwa-pay";
import { hhToast } from "@/lib/hh-toast";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/club/spin-delivery/$winnerId")({
  head: () => ({
    meta: [
      { title: "Доставка награды — HellSpin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpinDeliveryPage,
});

type Delivery = {
  winnerId: string;
  prizeCode: string;
  title: string;
  sizes: string[] | null;
  orderId: string | null;
  orderStatus: string | null;
};

function SpinDeliveryPage() {
  const { winnerId } = Route.useParams();
  const { isAuthed, hydrated } = useViewer();
  const [delivery, setDelivery] = useState<Delivery | null | undefined>(undefined);
  const [fio, setFio] = useState("");
  const [phone, setPhone] = useState("");
  const [size, setSize] = useState<string | null>(null);
  const [cdek, setCdek] = useState<CdekPickerState>(EMPTY_CDEK_STATE);
  const [price, setPrice] = useState<number | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Красная подсветка незаполненных полей включается после первой попытки оплатить.
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!isAuthed) return;
    apiFetch<{ items: Delivery[] }>("/api/v1/spin/deliveries")
      .then((r) => setDelivery(r.items.find((d) => d.winnerId === winnerId) ?? null))
      .catch(() => setDelivery(null));
  }, [isAuthed, winnerId]);

  // Только ПВЗ.
  const onCdek = (v: CdekPickerState) => setCdek(v.mode === "pvz" ? v : { ...v, mode: "pvz" });

  useEffect(() => {
    setPrice(null);
    setCalcError(null);
    if (!cdek.cityCode) return;
    let cancelled = false;
    apiFetch<{ totalSum: number }>("/api/v1/spin/deliveries/calculate", {
      method: "POST",
      body: JSON.stringify({ winnerId, cityCode: cdek.cityCode }),
    })
      .then((r) => !cancelled && setPrice(r.totalSum))
      .catch((e: { message?: string }) => !cancelled && setCalcError(e?.message || "Не удалось рассчитать доставку"));
    return () => {
      cancelled = true;
    };
  }, [cdek.cityCode, winnerId]);

  if (!hydrated || !isAuthed || delivery === undefined) return null;

  if (!delivery) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-5">
        <PageHeader title="Доставка награды" />
        <p className="text-sm text-muted-foreground">Награда не найдена.</p>
      </main>
    );
  }

  if (delivery.orderId) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-5">
        <PageHeader title="Доставка награды" subtitle={delivery.title} />
        <p className="mb-3 text-sm text-foreground">Доставка уже оплачена — отправим в выбранный ПВЗ.</p>
        <Link to="/club/orders/$orderId" params={{ orderId: delivery.orderId }} className="text-sm font-semibold text-primary">
          Открыть заказ →
        </Link>
      </main>
    );
  }

  const fioOk = fio.trim().length >= 2;
  const phoneOk = !!phone && isValidPhoneNumber(phone);
  const pvzOk = !!cdek.cityCode && !!cdek.pvzCode;
  const sizeOk = !delivery.sizes || !!size;
  const hasRedFields = tried && !(fioOk && phoneOk && pvzOk && sizeOk);

  const pay = () => {
    setTried(true);
    if (delivery.sizes && !size) return hhToast.error("Выбери размер футболки.");
    if (!fioOk) return hhToast.error("Укажи ФИО получателя.");
    if (!phoneOk) return hhToast.error("Укажи телефон получателя.");
    const cityCode = cdek.cityCode;
    const pvzCode = cdek.pvzCode;
    if (cityCode == null || !pvzCode) return hhToast.error("Выбери пункт выдачи СДЭК.");
    if (price == null) return hhToast.error("Дождись расчёта доставки.");
    const payload: Record<string, string> = {
      target: "spin_delivery",
      winner_id: delivery.winnerId,
      shipping_fio: fio,
      shipping_phone: phone,
      shipping_city: cdek.cityName || "—",
      cdek_city_code: String(cityCode),
      cdek_pvz_code: pvzCode,
      method: "sbp",
    };
    if (cdek.pvzAddress) payload.cdek_pvz_address = cdek.pvzAddress;
    if (size) payload.size = size;
    setPaying(true);
    void startPayment(payload, { forceLandingPage: true }).then((r) => {
      setPaying(false);
      if (!r.ok) hhToast.error("Ошибка оплаты", { meta: r.message });
    });
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-5 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <PageHeader title="Доставка награды" subtitle={delivery.title} />
      <p className="mb-4 text-[13px] text-muted-foreground">
        Награда бесплатная — оплачивается только доставка СДЭК до пункта выдачи.
      </p>

      <div className="hh-spin-form space-y-4">
        <section className={`hh-spin-section rounded-3xl border border-white/10 bg-card p-4 ${tried && !pvzOk ? "is-error" : ""}`}>
          <h2 className="mb-3 font-display text-[14px] font-black uppercase tracking-tight">1. Пункт выдачи</h2>
          <CdekDeliveryPicker value={cdek} onChange={onCdek} />
          {tried && !pvzOk && <div className="hh-spin-hint mt-2">Выбери город и пункт выдачи СДЭК — без этого не доставим.</div>}
        </section>

        {delivery.sizes && (
          <section className={`hh-spin-section rounded-3xl border border-white/10 bg-card p-4 ${tried && !sizeOk ? "is-error" : ""}`}>
            <h2 className="mb-3 font-display text-[14px] font-black uppercase tracking-tight">2. Размер футболки</h2>
            <div className="grid grid-cols-4 gap-2">
              {delivery.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`h-12 rounded-xl font-display text-[15px] font-black transition-transform active:scale-[0.95] ${
                    size === s ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {tried && !sizeOk && (
              <div className="hh-spin-hint mt-2">
                Выбери размер: {delivery.sizes.join(", ")}.
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-card p-4">
          <h2 className="mb-3 font-display text-[14px] font-black uppercase tracking-tight">
            {delivery.sizes ? "3" : "2"}. Получатель
          </h2>
          <div className="space-y-3">
            <Field
              label="ФИО получателя"
              required
              error={tried && !fioOk}
              errorText="Напиши ФИО полностью — так же, как в паспорте."
            >
              <DadataInput
                type="fio"
                value={fio}
                onChange={setFio}
                params={{ parts: ["SURNAME", "NAME", "PATRONYMIC"] }}
                placeholder="Иванов Иван Иванович"
                autoComplete="name"
                className="w-full bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
            </Field>

            <Field
              label="Телефон получателя"
              required
              error={tried && !phoneOk}
              errorText="Нужен номер, по которому тебя позовут в пункт выдачи."
              frameClassName="px-2 py-2"
            >
              <PhoneInput
                bare
                value={phone}
                onChange={(v) => setPhone(v || "")}
                placeholder="Номер телефона"
                autoComplete="tel"
                className="w-full"
              />
            </Field>
          </div>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-card px-4 py-3">
          <span className="text-[14px] font-semibold">Доставка</span>
          <span className="font-mono text-[14px] font-bold">
            {calcError ? calcError : price != null ? `${price.toLocaleString("ru-RU")} ₽` : cdek.cityCode ? "…" : "выбери город"}
          </span>
        </div>

        {hasRedFields && (
          <div className="hh-spin-hint text-center">Осталось заполнить поля, подсвеченные красным.</div>
        )}

        <PayButton size="lg" onClick={pay} loading={paying} label="Оплатить доставку" />
      </div>
    </main>
  );
}

/** Подписанное поле в рамке: при error — красная рамка, свечение и подсказка. */
function Field({
  label,
  required,
  error,
  errorText,
  frameClassName,
  children,
}: {
  label: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  frameClassName?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className={`hh-spin-label mb-1 flex items-center gap-1 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ${
          error ? "is-error" : ""
        }`}
      >
        {label}
        {required && <span className={error ? "text-destructive" : "text-muted-foreground/50"}>*</span>}
      </div>
      <div className={`hh-spin-field px-3 py-3 ${frameClassName ?? ""} ${error ? "is-error" : ""}`}>{children}</div>
      {error && errorText && <div className="hh-spin-hint mt-1 px-1">{errorText}</div>}
    </div>
  );
}
