// Модалка выставления счёта учеником (только моки).

import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { haptic } from "@/hooks/use-haptic";
import { IOSDateSheet } from "@/components/ios/IOSDateSheet";
import { IOSTimeSheet } from "@/components/ios/IOSTimeSheet";

export type InvoiceDraft = {
  hours: number;
  description: string;
  dateTime: string;
  amount: number;
};

function defaultDateISO() {
  const d = new Date(Date.now() + 24 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const MONTHS_GEN = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

function formatDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Выбрать дату";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`;
}

export function InvoiceComposer({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (draft: InvoiceDraft) => void;
}) {
  const [hours, setHours] = useState("1");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDateISO());
  const [time, setTime] = useState("10:00");
  const [amount, setAmount] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const h = Number(hours.replace(",", "."));
  const a = Number(amount);
  const valid =
    Number.isFinite(h) &&
    h > 0 &&
    h <= 24 &&
    description.trim().length > 0 &&
    description.trim().length <= 300 &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(time) &&
    Number.isFinite(a) &&
    a > 0 &&
    a <= 1_000_000;

  const combinedISO = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "";
    const [y, mo, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, mo - 1, d, hh, mm, 0, 0).toISOString();
  }, [date, time]);

  const reset = () => {
    setHours("1");
    setDescription("");
    setDate(defaultDateISO());
    setTime("10:00");
    setAmount("");
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-[#0a0a0a] px-5 pb-6 pt-4"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-display text-lg font-black uppercase tracking-tight text-foreground">
            Выставить счёт
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            haptic("light");
            onSubmit({
              hours: h,
              description: description.trim(),
              dateTime: combinedISO,
              amount: Math.round(a),
            });
            reset();
            onOpenChange(false);
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Длительность (часы)">
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value.replace(/[^\d.,]/g, "").slice(0, 5))}
              inputMode="decimal"
              placeholder="1"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата">
              <button
                type="button"
                onClick={() => setDateOpen(true)}
                className={`${inputCls} text-left`}
              >
                {formatDate(date)}
              </button>
            </Field>
            <Field label="Время">
              <button
                type="button"
                onClick={() => setTimeOpen(true)}
                className={`${inputCls} text-left tabular-nums`}
              >
                {time}
              </button>
            </Field>
          </div>
          <Field label="Описание занятия">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="Например: первое занятие, базовая посадка и старт"
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Сумма, ₽">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, "").slice(0, 7))}
              inputMode="numeric"
              placeholder="0"
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={!valid}
            className="mt-2 rounded-2xl bg-[#B6FF3C] px-5 py-3 font-display text-[15px] font-black uppercase tracking-tight text-black transition-transform active:scale-95 disabled:opacity-40"
          >
            Отправить счёт
          </button>
        </form>

        <IOSDateSheet
          open={dateOpen}
          onOpenChange={setDateOpen}
          value={date}
          onChange={setDate}
          title="Дата занятия"
        />
        <IOSTimeSheet
          open={timeOpen}
          onOpenChange={setTimeOpen}
          value={time}
          onChange={setTime}
          title="Время занятия"
        />
      </SheetContent>
    </Sheet>
  );
}

export function PayInvoiceSheet({
  open,
  onOpenChange,
  amountTotal,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amountTotal: number;
  onSubmit: (payer: { name: string; email: string; phone: string }) => void;
}) {
  const [step, setStep] = useState<"form" | "pay">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);

  const digits = phone.replace(/\D/g, "");
  const valid =
    name.trim().length >= 3 &&
    name.trim().length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.trim().length <= 254 &&
    digits.length >= 10 &&
    digits.length <= 15;

  const reset = () => {
    setStep("form");
    setName("");
    setEmail("");
    setPhone("");
    setProcessing(false);
  };

  const confirmPay = () => {
    if (processing) return;
    setProcessing(true);
    haptic("light");
    // Мок оплаты — короткая задержка «процессинга», потом сабмит.
    window.setTimeout(() => {
      onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      reset();
      onOpenChange(false);
    }, 800);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (processing) return;
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-[#0a0a0a] px-5 pb-6 pt-4"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-display text-lg font-black uppercase tracking-tight text-foreground">
            {step === "form"
              ? `Оплата · ${amountTotal.toLocaleString("ru-RU")} ₽`
              : "Окно оплаты"}
          </SheetTitle>
        </SheetHeader>

        {step === "form" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              haptic("light");
              setStep("pay");
            }}
            className="flex flex-col gap-4"
          >
            <Field label="Фамилия Имя Отчество">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 120))}
                placeholder="Иванов Иван Иванович"
                className={inputCls}
                autoComplete="name"
              />
            </Field>
            <Field label="Email для чека">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 254))}
                placeholder="you@example.com"
                className={inputCls}
                autoComplete="email"
                inputMode="email"
              />
            </Field>
            <Field label="Телефон">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 20))}
                placeholder="+7 900 000 00 00"
                className={inputCls}
                autoComplete="tel"
                inputMode="tel"
              />
            </Field>

            <button
              type="submit"
              disabled={!valid}
              className="mt-2 rounded-2xl bg-[#B6FF3C] px-5 py-3 font-display text-[15px] font-black uppercase tracking-tight text-black transition-transform active:scale-95 disabled:opacity-40"
            >
              Оплатить {amountTotal.toLocaleString("ru-RU")} ₽
            </button>
          </form>
        )}

        {step === "pay" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                К оплате
              </div>
              <div className="mt-1 font-display text-[28px] font-black leading-none tracking-tight text-foreground">
                {amountTotal.toLocaleString("ru-RU")} ₽
              </div>
              <div className="mt-3 flex flex-col gap-1 font-display text-[13px] font-bold text-foreground/80">
                <span>{name}</span>
                <span className="text-foreground/60">{email}</span>
                <span className="text-foreground/60">{phone}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-center">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
                Тестовый режим
              </div>
              <div className="mt-1 font-display text-[13px] font-bold text-white/70">
                Здесь появится реальная страница оплаты. Сейчас просто подтверди — счёт станет оплачен.
              </div>
            </div>
            <button
              type="button"
              onClick={confirmPay}
              disabled={processing}
              className="rounded-2xl bg-[#B6FF3C] px-5 py-3 font-display text-[15px] font-black uppercase tracking-tight text-black transition-transform active:scale-95 disabled:opacity-60"
            >
              {processing ? "Оплата…" : `Подтвердить ${amountTotal.toLocaleString("ru-RU")} ₽`}
            </button>
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={processing}
              className="rounded-2xl border border-white/10 bg-black/40 px-5 py-3 font-display text-[13px] font-black uppercase tracking-tight text-foreground/70 transition-transform active:scale-95 disabled:opacity-40"
            >
              Назад
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

const inputCls =
  "w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 font-display text-[14px] font-bold text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-[#B6FF3C]/60 focus:shadow-[0_0_0_3px_rgba(182,255,60,0.10)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
        {label}
      </span>
      {children}
    </label>
  );
}
