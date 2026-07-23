// Модалка выставления счёта учеником (только моки).

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { haptic } from "@/hooks/use-haptic";

export type InvoiceDraft = {
  hours: number;
  description: string;
  dateTime: string;
  amount: number;
};

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
  const [dateTime, setDateTime] = useState(defaultLocal());
  const [amount, setAmount] = useState("");

  const h = Number(hours);
  const a = Number(amount);
  const valid =
    h > 0 &&
    h <= 24 &&
    description.trim().length > 0 &&
    description.trim().length <= 300 &&
    dateTime.length > 0 &&
    a > 0 &&
    a <= 1_000_000;

  const reset = () => {
    setHours("1");
    setDescription("");
    setDateTime(defaultLocal());
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
              dateTime: new Date(dateTime).toISOString(),
              amount: Math.round(a),
            });
            reset();
            onOpenChange(false);
          }}
          className="flex flex-col gap-4"
        >
          <Field label="Длительность (часы)">
            <input
              type="number"
              min={0.5}
              max={24}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              inputMode="decimal"
              className={inputCls}
            />
          </Field>
          <Field label="Дата и время занятия">
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className={inputCls}
            />
          </Field>
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
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
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
  onSubmit: (payer: { name: string; email: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const valid =
    name.trim().length >= 3 &&
    name.trim().length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    email.trim().length <= 254;

  const reset = () => {
    setName("");
    setEmail("");
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
            Оплата · {amountTotal.toLocaleString("ru-RU")} ₽
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            haptic("light");
            onSubmit({ name: name.trim(), email: email.trim() });
            reset();
            onOpenChange(false);
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

          <button
            type="submit"
            disabled={!valid}
            className="mt-2 rounded-2xl bg-[#B6FF3C] px-5 py-3 font-display text-[15px] font-black uppercase tracking-tight text-black transition-transform active:scale-95 disabled:opacity-40"
          >
            Оплатить {amountTotal.toLocaleString("ru-RU")} ₽
          </button>
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Тестовый режим — оплата не проводится
          </p>
        </form>
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

function defaultLocal() {
  const d = new Date(Date.now() + 24 * 3600_000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
