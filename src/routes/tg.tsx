import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AppRoot,
  Badge,
  Button,
  Cell,
  Chip,
  Input,
  List,
  Section,
} from "@telegram-apps/telegram-ui";
import "@telegram-apps/telegram-ui/dist/styles.css";
import { Slider } from "@/components/ui/slider";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { getTgTicketSelection, TG_TICKET_MIN, TG_TICKET_MAX, TG_TICKET_STEP } from "@/lib/tg-tickets";
import { Minus, Plus } from "lucide-react";
import { PlumpTruck, PlumpClose } from "@/components/ui/icons";
import ticketImg from "@/assets/spin/ticket.webp";
import shirt299 from "@/assets/tg-shirt-299.webp.asset.json";
import shirtShalavam from "@/assets/tg-shirt-shalavam.webp.asset.json";
import bikeImg from "@/assets/vanya-bike-float.png";
import hhrLogo from "@/assets/hhr-logo.png.asset.json";

/**
 * Страница для Telegram на базе TelegramUI (нативные блоки Telegram)
 * + пара «вау»-эффектов в духе Magic UI: бегущая рамка, счётчик суммы, таймер до финала.
 * Пока только визуал — оплата и сервер не подключены.
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

const FINAL_AT = new Date("2026-10-29T20:00:00+03:00").getTime();

const TICKET_PACKS = [
  { tickets: 1, price: 300 },
  { tickets: 3, price: 500, badge: "−45%" },
  { tickets: 5, price: 700, badge: "−54%" },
  { tickets: 10, price: 1000, badge: "−67%", hot: true },
  { tickets: 20, price: 1500, badge: "−75%" },
  { tickets: 50, price: 3000, badge: "−80%" },
];

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const SHIRTS = [
  { id: "a", name: "Сегодня ехал 299", price: 2500, image: shirt299.url },
  { id: "b", name: "Еду к шалавам", price: 2500, image: shirtShalavam.url },
];

type Line = { size: string; qty: number };

function TgMiniApp() {
  const [pack, setPack] = useState(3);
  const [customTickets, setCustomTickets] = useState<number | null>(null);
  const [shirts, setShirts] = useState<Record<string, Line>>({});
  const [checkout, setCheckout] = useState(false);

  const selected = customTickets === null ? TICKET_PACKS[pack] : getTgTicketSelection(customTickets);
  const shirtsTotal = SHIRTS.reduce((s, sh) => s + (shirts[sh.id]?.qty ?? 0) * sh.price, 0);
  const total = selected.price + shirtsTotal;
  const hasShirts = shirtsTotal > 0;
  const perTicket = Math.round(selected.price / selected.tickets);

  return (
    <AppRoot appearance="dark" platform="ios" className="hh-tg">
      <div className="mx-auto min-h-dvh max-w-md pb-32">
        <header className="flex justify-center pt-5">
          <img src={hhrLogo.url} alt="HELLHOUND Racing" className="h-14 w-auto" draggable={false} />
        </header>

        {/* Hero: Ваня на байке парит */}
        <div className="px-5 pt-2 text-center">
          <img
            src={bikeImg}
            alt="Ваня на розовой Yamaha MT-07"
            className="mx-auto block w-full max-w-[250px] select-none"
            draggable={false}
          />
          <div className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#c6ff00]">
            Легендарный розыгрыш
          </div>
          <h1 className="hh-shine mt-1 font-display text-[44px] font-black uppercase leading-none tracking-tight">
            Yamaha MT-07
          </h1>
          <Countdown />
        </div>

        <List className="mt-4">
          <Section
            footer={
              <Section.Footer className="!text-[#8b8b99]">
                1 билет = 1 шанс. Билеты привязываются к твоему Telegram и потом переносятся в аккаунт HHR.
              </Section.Footer>
            }
          >
            <div className="grid grid-cols-3 gap-2 p-3">
              {TICKET_PACKS.map((p, i) => {
                const active = customTickets === null && i === pack;
                return (
                  <button
                    key={p.tickets}
                    onClick={() => { setPack(i); setCustomTickets(null); }}
                    className={`relative rounded-2xl px-2 pb-3 pt-4 text-center transition-all active:scale-95 ${
                      active ? "hh-beam bg-[#f000c0]/15" : "bg-[#1f1f29]"
                    }`}
                  >
                    {p.badge && (
                      <span
                        className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[9px] font-bold ${
                          p.hot ? "bg-[#c6ff00] text-black" : "bg-[#2a2a36] text-[#ff2bd6]"
                        }`}
                      >
                        {p.hot ? "ХИТ " : ""}
                        {p.badge}
                      </span>
                    )}
                    <div className="font-display text-2xl font-black leading-none tabular-nums text-white">
                      {p.tickets}
                    </div>
                    <div className="mt-1 text-[11px] text-[#8b8b99]">{pluralTickets(p.tickets)}</div>
                    <div className={`mt-2 text-sm font-bold tabular-nums ${active ? "text-[#ff2bd6]" : "text-white"}`}>
                      {p.price.toLocaleString("ru-RU")} ₽
                    </div>
                  </button>
                );
              })}
            </div>
            <div className={`hh-ticket-slider px-4 pb-4 pt-2 ${customTickets !== null ? "hh-ticket-slider-active" : ""}`}>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-bold">Больше билетов</span>
                <PlumpNum value={customTickets ?? TG_TICKET_MIN} size={20} />
              </div>
              <Slider aria-label="Количество билетов" min={TG_TICKET_MIN} max={TG_TICKET_MAX}
                step={TG_TICKET_STEP} value={[customTickets ?? TG_TICKET_MIN]}
                onValueChange={([value]) => { if (value !== undefined) setCustomTickets(value); }}
                onPointerDown={() => setCustomTickets((current) => current ?? TG_TICKET_MIN)} />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>100</span><span>1 000</span></div>
            </div>
            <Cell
              before={<img src={ticketImg} alt="" className="h-9 w-9 object-contain" />}
              subtitle={`${perTicket} ₽ за билет`}
              after={<Badge type="number" mode="primary">{selected.tickets}</Badge>}
            >
              Выбрано
            </Cell>
          </Section>

          <Section
            header={<Section.Header large><span className="hh-merch-heading">Предзаказ мерча</span></Section.Header>}
            footer={<Section.Footer className="!text-[#8b8b99]"><span className="hh-section-footer"><PlumpTruck size={14} />Доставку посчитаем и согласуем при отправке.</span></Section.Footer>}
          >
            {SHIRTS.map((sh) => {
              const line = shirts[sh.id] ?? { size: "L", qty: 0 };
              const update = (patch: Partial<Line>) =>
                setShirts((s) => ({ ...s, [sh.id]: { ...line, ...patch } }));
              return (
                <div key={sh.id} className="hh-merch-item">
                  <img src={sh.image} alt={sh.name} className="hh-shirt-image" />
                  <Cell
                    subtitle={`${sh.price.toLocaleString("ru-RU")} ₽`}
                    after={<Stepper value={line.qty} onChange={(qty) => update({ qty })} max={10} />}
                  >
                    {sh.name}
                  </Cell>
                  <div className="flex gap-1.5 px-4 pb-3">
                    {SIZES.map((s) => (
                      <Chip
                        key={s}
                        mode={line.size === s ? "elevated" : "outline"}
                        onClick={() => update({ size: s })}
                        className={`flex-1 justify-center text-center [&>*]:mx-auto ${line.size === s ? "!bg-[#f000c0] !text-white" : ""}`}
                      >
                        {s}
                      </Chip>
                    ))}
                  </div>
                </div>
              );
            })}
          </Section>
        </List>

        {/* Аналог MainButton Telegram */}
        <div className="hh-payment-dock fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
          <Button className="hh-pay-button hh-pay-button-docked" size="l" stretched onClick={() => setCheckout(true)}>
            <span className="hh-payment-label">Оплатить</span>
            <span className="hh-payment-amount"><NumberTicker value={total} /> ₽</span>
          </Button>
        </div>

        {checkout && <CheckoutSheet total={total} needAddress={hasShirts} onClose={() => setCheckout(false)} />}
      </div>
    </AppRoot>
  );
}

/** Таймер до финала */
function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, FINAL_AT - (now ?? FINAL_AT));
  const parts = [
    [Math.floor(left / 86400000), "дн"],
    [Math.floor(left / 3600000) % 24, "ч"],
    [Math.floor(left / 60000) % 60, "мин"],
    [Math.floor(left / 1000) % 60, "сек"],
  ] as const;
  return (
    <div className="mt-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-[#8b8b99]">Финал 29 октября · через</div>
      <div className="mt-2 flex justify-center gap-2">
        {parts.map(([v, l]) => (
          <div key={l} className="w-16 rounded-2xl bg-[#15151c] py-2">
            <div className="font-display text-2xl font-black tabular-nums text-white">
              {now === null ? "—" : String(v).padStart(2, "0")}
            </div>
            <div className="text-[10px] uppercase text-[#8b8b99]">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Плавный счётчик суммы */
function NumberTicker({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 400);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="inline-flex"><PlumpNum value={shown} format size={18} /></span>;
}

function Stepper({ value, onChange, max }: { value: number; onChange: (v: number) => void; max: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        aria-label="Меньше"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#2a2a36] text-white"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-5 text-center font-bold tabular-nums text-white">{value}</span>
      <button
        aria-label="Больше"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#f000c0] text-white"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CheckoutSheet({ total, needAddress, onClose }: { total: number; needAddress: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-md rounded-t-3xl bg-[#15151c] pb-5 pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5">
          <h3 className="font-display text-xl font-black uppercase text-white">Оформление</h3>
          <button aria-label="Закрыть" onClick={onClose} className="text-[#8b8b99]">
            <PlumpClose size={20} />
          </button>
        </div>
        <div className="mt-2">
          <Input header="Имя и фамилия" placeholder="Иван Иванов" />
          <Input header="Телефон" placeholder="+7" type="tel" />
          {needAddress && <Input header="Город" placeholder="Москва" />}
        </div>
        <p className="px-5 text-xs text-[#8b8b99]">
          {needAddress ? "Доставку посчитаем и согласуем при отправке." : "Билеты придут на этот аккаунт Telegram."}
        </p>
        <div className="px-4 pt-4">
          <Button className="hh-pay-button" size="l" stretched>
            К оплате {total.toLocaleString("ru-RU")} ₽
          </Button>
        </div>
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
