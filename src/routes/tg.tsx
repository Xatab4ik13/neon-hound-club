import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import ticketImg from "@/assets/spin/ticket.webp";
import tshirtImg from "@/assets/spin/tshirt-blur.webp";
import bikeImg from "@/assets/vanya-bike-float.png";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";

/**
 * Набросок страницы для Telegram: только визуал, без оплаты и сервера.
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

// Наборы билетов — как у цифровых открыток Hell: те же объёмы и цены, только билеты напрямую.
const TICKET_PACKS = [
  { tickets: 1, price: 300 },
  { tickets: 3, price: 500, badge: "−45%" },
  { tickets: 5, price: 700, badge: "−54%" },
  { tickets: 10, price: 1000, badge: "Hot · −67%" },
  { tickets: 20, price: 1500, badge: "−75%" },
  { tickets: 50, price: 3000, badge: "−80%" },
];

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const SHIRTS = [
  { id: "a", name: "Футболка №1", price: 2500 },
  { id: "b", name: "Футболка №2", price: 2500 },
];

type Cart = { shirts: Record<string, { size: string; qty: number }> };

function TgMiniApp() {
  const [pack, setPack] = useState(0);
  const [cart, setCart] = useState<Cart>({ shirts: {} });
  const [checkout, setCheckout] = useState(false);

  const selectedPack = TICKET_PACKS[pack];
  const total = useMemo(
    () =>
      selectedPack.price +
      SHIRTS.reduce((s, sh) => s + (cart.shirts[sh.id]?.qty ?? 0) * sh.price, 0),
    [selectedPack, cart],
  );
  const hasShirts = Object.values(cart.shirts).some((s) => s.qty > 0);

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-background pb-28 text-foreground">
      <header className="flex justify-center px-4 pt-5">
        <img
          src={hhrLogo.url}
          alt="HELLHOUND Racing"
          className="h-16 w-auto"
          draggable={false}
        />
      </header>

      {/* Розыгрыш: Ваня на байке парит в воздухе, без рамок и фона */}
      <section className="mt-2 px-4">
        <img
          src={bikeImg}
          alt="Ваня на розовой Yamaha MT-07"
          className="mx-auto block w-full max-w-[280px] -rotate-1 select-none drop-shadow-[0_26px_34px_rgba(240,0,192,0.25)]"
          draggable={false}
        />

        <h1 className="mt-2 text-center font-display text-[clamp(24px,7.2vw,34px)] font-black uppercase leading-[0.95] tracking-tight text-foreground">
          Легендарный{" "}
          <span className="text-primary drop-shadow-[0_0_16px_rgba(240,0,192,0.5)]">
            розыгрыш
          </span>{" "}
          <span className="text-primary drop-shadow-[0_0_16px_rgba(240,0,192,0.5)]">
            Yamaha MT-07
          </span>
        </h1>
        <p className="mx-auto mt-3 w-fit rounded-full border border-primary/60 bg-primary/10 px-4 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.25em] text-primary">
          Финал 29 октября
        </p>

        {/* Наборы билетов — по аналогии с цифровыми открытками */}
        <div className="mt-7">
          <div className="flex items-center gap-3">
            <img src={ticketImg} alt="" className="h-11 w-11 object-contain" />
            <div>
              <div className="font-display text-base font-bold uppercase leading-none">
                Билеты на розыгрыш
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                1 билет = 1 шанс забрать Yamaha MT-07
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {TICKET_PACKS.map((p, i) => (
              <button
                key={p.tickets}
                onClick={() => setPack(i)}
                className={`relative rounded-2xl border p-3 text-center transition-colors ${
                  i === pack
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {p.badge && (
                  <span
                    className={`absolute right-1.5 top-1.5 font-mono text-[9px] font-bold uppercase ${
                      i === pack ? "text-primary-foreground/80" : "text-primary"
                    }`}
                  >
                    {p.badge}
                  </span>
                )}
                <div className="font-display text-xl font-black leading-none tabular-nums">
                  {p.tickets}
                </div>
                <div
                  className={`mt-1 font-mono text-[10px] uppercase tracking-wider ${
                    i === pack ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {pluralTickets(p.tickets)}
                </div>
                <div
                  className={`mt-1.5 font-display text-sm font-bold tabular-nums ${
                    i === pack ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {p.price.toLocaleString("ru-RU")} ₽
                </div>
              </button>
            ))}
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
          {selectedPack.tickets}{" "}
          {pluralTickets(selectedPack.tickets)} · {total.toLocaleString("ru-RU")} ₽
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

function pluralTickets(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "билет";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "билета";
  return "билетов";
}

  return (
    <input
      placeholder={placeholder}
      className="h-12 rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary"
    />
  );
}
