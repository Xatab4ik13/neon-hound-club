import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

  const pay = () => {
    if (delivery.sizes && !size) return hhToast.error("Выбери размер футболки.");
    if (fio.trim().length < 2) return hhToast.error("Укажи ФИО получателя.");
    if (!phone || !isValidPhoneNumber(phone)) return hhToast.error("Укажи телефон получателя.");
    if (!cdek.cityCode || !cdek.pvzCode) return hhToast.error("Выбери пункт выдачи СДЭК.");
    if (price == null) return hhToast.error("Дождись расчёта доставки.");
    const payload: Record<string, string> = {
      target: "spin_delivery",
      winner_id: delivery.winnerId,
      shipping_fio: fio,
      shipping_phone: phone,
      shipping_city: cdek.cityName || "—",
      cdek_city_code: String(cdek.cityCode),
      cdek_pvz_code: cdek.pvzCode,
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

      <section className="mb-4 space-y-3 rounded-3xl bg-card p-4">
        <h2 className="font-display text-[14px] font-black uppercase tracking-tight">1. Пункт выдачи</h2>
        <CdekDeliveryPicker value={cdek} onChange={onCdek} />
      </section>

      {delivery.sizes && (
        <section className="mb-4 rounded-3xl bg-card p-4">
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
        </section>
      )}

      <section className="mb-4 space-y-3 rounded-3xl bg-card p-4">
        <h2 className="font-display text-[14px] font-black uppercase tracking-tight">
          {delivery.sizes ? "3" : "2"}. Получатель
        </h2>
        <DadataInput
          type="fio"
          value={fio}
          onChange={setFio}
          params={{ parts: ["SURNAME", "NAME", "PATRONYMIC"] }}
          placeholder="Иван Иванов"
          autoComplete="name"
        />
        <PhoneInput value={phone} onChange={(v) => setPhone(v || "")} placeholder="Номер телефона" autoComplete="tel" />
      </section>

      <div className="mb-3 flex items-center justify-between rounded-2xl bg-card px-4 py-3">
        <span className="text-[14px] font-semibold">Доставка</span>
        <span className="font-mono text-[14px] font-bold">
          {calcError ? calcError : price != null ? `${price.toLocaleString("ru-RU")} ₽` : cdek.cityCode ? "…" : "выбери город"}
        </span>
      </div>
      <PayButton size="lg" onClick={pay} loading={paying} label="Оплатить доставку" />
    </main>
  );
}
