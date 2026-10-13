import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import ticketImg from "@/assets/spin/ticket.webp";
import tshirtImg from "@/assets/spin/tshirt-blur.webp";
import bikeImg from "@/assets/vanya-bike.webp";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";

/**
 * Набросок Telegram Mini App: только визуал, без оплаты и сервера.
 * Цены и названия футболок — заглушки, пока владелец не пришлёт реальные.
 */
export const Route = createFileRoute("/tg")({
  head: () => ({
    meta: [
      { title: "HELLHOUND — розыгрыш и мерч" },
      { name: "description", content: "Билеты на розыгрыш Yamaha MT-07 и предзаказ футболок HELLHOUND." },
    ],
  }),
  component: TgMiniApp,
});

const TICKET_PRICE = 300;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const SHIRTS = [
  { id: "a", name: "Футболка №1", price: 2500 },
  { id: "b", name: "Футболка №2", price: 2500 },
];

type Cart = { tickets: number; shirts: Record<string, { size: string; qty: number }> };

function TgMiniApp() {
  const [cart, setCart] = useState<Cart>({ tickets: 0, shirts: {} });
  const [checkout, setCheckout] = useState(false);

  const total = useMemo(
    () =>
      cart.tickets * TICKET_PRICE +
      SHIRTS.reduce((s, sh) => s + (cart.shirts[sh.id]?.qty ?? 0) * sh.price, 0),
    [cart],
  );
  const hasShirts = Object.values(cart.shirts).some((s) => s.qty > 0);

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-28 text-foreground">
      <header className="flex items-center justify-between px-4 pt-5">
        <span className="font-display text-xl font-black uppercase tracking-tight">HELLHOUND</span>
        <span className="rounded-full border border-border px-3 py-1 font-mono text-[11px] uppercase text-muted-foreground">
          Mini App
        </span>
      </header>

      {/* Розыгрыш */}
      <section className="mt-5 px-4">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative aspect-[4/3]">
            <img src={bikeImg} alt="Yamaha MT-07" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="font-mono text-[11px] uppercase tracking-wider text-primary">Розыгрыш · финал 29 октября</div>
              <h1 className="mt-1 font-display text-3xl font-black uppercase leading-none">Yamaha MT-07</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4">
            <img src={ticketImg} alt="" className="h-14 w-14 object-contain" />
            <div className="flex-1">
              <div className="font-display text-lg font-bold uppercase">Билет</div>
              <div className="text-sm text-muted-foreground">{TICKET_PRICE} ₽ за 1 билет</div>
            </div>
            <Stepper
              value={cart.tickets}
              onChange={(v) => setCart((c) => ({ ...c, tickets: v }))}
              max={500}
            />
          </div>
        </div>
      </section>

      {/* Футболки */}
      <section className="mt-8 px-4">
        <h2 className="font-display text-2xl font-black uppercase">Предзаказ мерча</h2>
        <div className="mt-4 grid gap-4">
          {SHIRTS.map((sh) => {
            const line = cart.shirts[sh.id] ?? { size: "L", qty: 0 };
            const update = (patch: Partial<typeof line>) =>
              setCart((c) => ({ ...c, shirts: { ...c.shirts, [sh.id]: { ...line, ...patch } } }));
            return (
              <div key={sh.id} className="rounded-3xl border border-border bg-card p-4">
                <div className="flex gap-4">
                  <img src={tshirtImg} alt={sh.name} className="h-28 w-28 rounded-2xl bg-secondary object-contain" />
                  <div className="flex flex-1 flex-col">
                    <div className="font-display text-lg font-bold uppercase leading-tight">{sh.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{sh.price.toLocaleString("ru-RU")} ₽</div>
                    <div className="mt-auto">
                      <Stepper value={line.qty} onChange={(qty) => update({ qty })} max={10} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => update({ size: s })}
                      className={`h-10 flex-1 rounded-xl border font-mono text-sm font-bold transition-colors ${
                        line.size === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Аналог MainButton Telegram */}
      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur">
        <button
          disabled={total === 0}
          onClick={() => setCheckout(true)}
          className="h-14 w-full rounded-2xl bg-primary font-display text-lg font-black uppercase text-primary-foreground disabled:opacity-40"
        >
          {total === 0 ? "Выбери билеты или мерч" : `Оплатить ${total.toLocaleString("ru-RU")} ₽`}
        </button>
      </div>

      {checkout && (
        <CheckoutSheet total={total} needAddress={hasShirts} onClose={() => setCheckout(false)} />
      )}
    </div>
  );
}

function Stepper({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Меньше"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-10 w-10 place-items-center rounded-xl border border-border"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center font-display text-xl font-bold tabular-nums">{value}</span>
      <button
        aria-label="Больше"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CheckoutSheet({ total, needAddress, onClose }: { total: number; needAddress: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-background/70 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md rounded-t-3xl border-t border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black uppercase">Оформление</h3>
          <button aria-label="Закрыть" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <Field placeholder="Имя и фамилия" />
          <Field placeholder="Телефон" />
          {needAddress && <Field placeholder="Город" />}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {needAddress ? "Доставку посчитаем и согласуем при отправке." : "Билеты придут на этот аккаунт Telegram."}
        </p>
        <button className="mt-5 h-14 w-full rounded-2xl bg-primary font-display text-lg font-black uppercase text-primary-foreground">
          К оплате {total.toLocaleString("ru-RU")} ₽
        </button>
      </div>
    </div>
  );
}

function Field({ placeholder }: { placeholder: string }) {
  return (
    <input
      placeholder={placeholder}
      className="h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
    />
  );
}
