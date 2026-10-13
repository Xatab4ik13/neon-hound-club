import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppRoot,
  Badge,
  Button,
  Cell,
  Chip,
  List,
  Section,
} from "@telegram-apps/telegram-ui";
import "@telegram-apps/telegram-ui/dist/styles.css";
import { Slider } from "@/components/ui/slider";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { getTgTicketSelection, TG_TICKET_MIN, TG_TICKET_MAX, TG_TICKET_STEP } from "@/lib/tg-tickets";
import { Minus, Plus } from "lucide-react";
import { PlumpTruck, PlumpClose } from "@/components/ui/icons";
import { LEGAL } from "@/data/legal";
import { OfferContent } from "@/components/legal/content/OfferContent";
import { TermsContent } from "@/components/legal/content/TermsContent";
import { PrivacyContent } from "@/components/legal/content/PrivacyContent";
import { PromoRulesContent } from "@/components/legal/content/PromoRulesContent";
import { RequisitesContent } from "@/components/legal/content/RequisitesContent";
import { apiFetch } from "@/lib/api";
import { DadataInput } from "@/components/ui/DadataInput";
import { formatRuPhone, isValidRuPhone } from "@/lib/phone";
import { TgPvzPicker } from "@/components/tg/TgPvzPicker";
import { EMPTY_CDEK_STATE, type CdekPickerState } from "@/components/checkout/CdekDeliveryPicker";
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
  { id: "a", name: "Сегодня ехал 299", price: 2500, productId: null as string | null, image: shirt299.url },
  { id: "b", name: "Еду к шалавам", price: 2600, productId: null as string | null, image: shirtShalavam.url },
];

type Line = { size: string; qty: number };

function TgMiniApp() {
  const [pack, setPack] = useState(3);
  const [customTickets, setCustomTickets] = useState<number | null>(null);
  const [shirts, setShirts] = useState<Record<string, Line>>({});
  const [checkout, setCheckout] = useState(false);
  const [paidState, setPaidState] = useState<"none" | "wait" | "paid" | "failed">("none");

  // Telegram WebApp SDK: initData для привязки покупки к Telegram-аккаунту
  useEffect(() => {
    const ready = () => { const w = (window as any).Telegram?.WebApp; w?.ready?.(); w?.expand?.(); };
    if ((window as any).Telegram?.WebApp) return ready();
    const sc = document.createElement("script");
    sc.src = "https://telegram.org/js/telegram-web-app.js";
    sc.onload = ready;
    document.head.appendChild(sc);
  }, []);

  // Возврат с платёжной формы банка: ?paid=<id> — ждём подтверждения
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("failed")) { setPaidState("failed"); return; }
    const id = q.get("paid");
    if (!id) return;
    setPaidState("wait");
    let n = 0;
    const tick = () => apiFetch<{ status: string }>(`/api/v1/tg/orders/${id}`)
      .then((r) => { if (r.status === "paid") setPaidState("paid"); else if (r.status === "failed") setPaidState("failed"); else if (++n < 20) setTimeout(tick, 3000); })
      .catch(() => { if (++n < 20) setTimeout(tick, 3000); });
    tick();
  }, []);

  const power = customTickets === null ? 0 : (customTickets - TG_TICKET_MIN) / (TG_TICKET_MAX - TG_TICKET_MIN);
  const isMax = customTickets === TG_TICKET_MAX;
  useEffect(() => {
    if (customTickets === null) return;
    const h = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!h) return;
    if (customTickets === TG_TICKET_MAX) h.notificationOccurred?.("success");
    else h.impactOccurred?.(power > 0.6 ? "heavy" : power > 0.3 ? "medium" : "light");
  }, [customTickets]);
  const selected = customTickets === null ? TICKET_PACKS[pack] : getTgTicketSelection(customTickets);
  const shirtsTotal = SHIRTS.reduce((s, sh) => s + (shirts[sh.id]?.qty ?? 0) * sh.price, 0);
  const total = selected.price + shirtsTotal;
  const hasShirts = shirtsTotal > 0;
  const shirtLines = useMemo(
    () =>
      SHIRTS.filter((sh) => (shirts[sh.id]?.qty ?? 0) > 0).map((sh) => ({
        id: sh.id,
        size: shirts[sh.id].size,
        qty: shirts[sh.id].qty,
        label: `${sh.name} · ${shirts[sh.id].size} × ${shirts[sh.id].qty}`,
      })),
    [shirts],
  );
  const perTicket = Math.round(selected.price / selected.tickets);

  return (
    <AppRoot appearance="dark" platform="ios" className="hh-tg">
      <div className="mx-auto min-h-dvh max-w-md pb-32">
        <header className="flex justify-center pt-5">
          <img src={hhrLogo.url} alt="HELLHOUND Racing" className="h-14 w-auto" draggable={false} />
        </header>
        {paidState !== "none" && (
          <div className="hh-paid-banner">
            {paidState === "paid" && <><b>Оплата прошла</b>Чек пришлём в этот чат. Всё привязано к вашему номеру телефона.</>}
            {paidState === "wait" && <><b>Проверяем оплату…</b>Обычно это занимает несколько секунд.</>}
            {paidState === "failed" && <><b>Оплата не прошла</b>Деньги не списаны. Попробуйте ещё раз.</>}
          </div>
        )}

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

        <List className="mt-6">
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
            <div className={`hh-ticket-slider px-4 pb-4 pt-2 ${customTickets !== null ? "hh-ticket-slider-active" : ""} ${isMax ? "is-max" : ""}`}
              style={{ ["--hh-power" as string]: power }}>
              <span className="hh-power-ring" aria-hidden />
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

          <div className="hh-merch">
            <div className="px-5">
              <span className="hh-merch-heading">Предзаказ мерча</span>
            </div>
            {SHIRTS.map((sh) => {
              const line = shirts[sh.id] ?? { size: "L", qty: 0 };
              const update = (patch: Partial<Line>) =>
                setShirts((s) => ({ ...s, [sh.id]: { ...line, ...patch } }));
              return (
                <div key={sh.id} className="hh-merch-item">
                  <img src={sh.image} alt={sh.name} className="hh-shirt-image" draggable={false} />
                  <div className="hh-merch-controls">
                    <div>
                      <div className="text-base font-bold text-white">{sh.name}</div>
                      <div className="text-sm text-[#8b8b99]">{sh.price.toLocaleString("ru-RU")} ₽</div>
                    </div>
                    <Stepper value={line.qty} onChange={(qty) => update({ qty })} max={10} />
                  </div>
                  <div className="flex gap-1.5 px-5 pt-3">
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
            <div className="px-5 pt-4 text-sm text-[#8b8b99]">
              <span className="hh-section-footer"><PlumpTruck size={14} />Доставку посчитаем и согласуем при отправке.</span>
            </div>
          </div>
        </List>

        <TgLegalFooter />

        {/* Аналог MainButton Telegram */}
        <div className={`hh-payment-dock fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md ${isMax ? "is-max" : ""}`}
          style={{ ["--hh-power" as string]: power }}>
          <Button className="hh-pay-button hh-pay-button-docked hh-pay-powered" size="l" stretched onClick={() => setCheckout(true)}>
            <span className="hh-payment-label">Оплатить</span>
            <span className="hh-payment-amount"><NumberTicker value={total} /> ₽</span>
          </Button>
        </div>

        {checkout && (
          <CheckoutSheet
            total={total}
            ticketsLabel={`${selected.tickets} ${pluralTickets(selected.tickets)} · ${selected.price.toLocaleString("ru-RU")} ₽`}
            shirtLines={shirtLines}
            ticketChoice={customTickets === null ? { pack } : { custom: selected.tickets }}
            onClose={() => setCheckout(false)}
          />
        )}
      </div>
    </AppRoot>
  );
}

const LEGAL_LINKS = [
  { label: "Публичная оферта", path: "/legal/offer" },
  { label: "Пользовательское соглашение", path: "/legal/terms" },
  { label: "Политика ПДн", path: "/legal/privacy" },
  { label: "Правила розыгрышей", path: "/legal/promo-rules" },
  { label: "Реквизиты", path: "/legal/requisites" },
];

function DocBody({ path }: { path: string }) {
  switch (path) {
    case "/legal/offer": return <OfferContent />;
    case "/legal/terms": return <TermsContent />;
    case "/legal/privacy": return <PrivacyContent basePath="/legal" />;
    case "/legal/promo-rules": return <PromoRulesContent basePath="/legal" />;
    default: return <RequisitesContent />;
  }
}

/** Документ открывается прямо внутри Telegram-страницы, без перехода на сайт */
function TgDocSheet({ path, onNavigate, onClose }: { path: string; onNavigate: (p: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const title = LEGAL_LINKS.find((l) => l.path === path)?.label ?? "Документ";
  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [path]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="hh-doc-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <div className="hh-doc-head">
        <span>{title}</span>
        <button type="button" aria-label="Закрыть" onClick={onClose}><PlumpClose /></button>
      </div>
      <div
        ref={ref}
        className="hh-doc-body"
        onClickCapture={(e) => {
          const a = (e.target as HTMLElement).closest("a");
          const href = a?.getAttribute("href") ?? "";
          const m = href.match(/\/legal\/(offer|terms|privacy|promo-rules|requisites)/);
          if (m) { e.preventDefault(); e.stopPropagation(); onNavigate(`/legal/${m[1]}`); }
        }}
      >
        <p className="hh-doc-date">Редакция от {LEGAL.registeredAt}</p>
        <DocBody path={path} />
      </div>
    </div>
  );
}

/** Подвал: предупреждение о восстановлении сервиса + ссылки на документы */
function TgLegalFooter() {
  return (
    <footer className="hh-legal">
      <div className="hh-notice">
        <div className="hh-notice-title">Внимание</div>
        <p>
          Ваши старые билеты, Hell Pass и прогресс в рулетке никуда не пропадут.
          Мы восстанавливаем HHR и вернём всё на ваши аккаунты.
        </p>
        <p>
          Билеты, купленные здесь, тоже привяжутся к вашему аккаунту — по номеру
          телефона, который вы укажете при оплате. Указывайте тот же номер, что в HHR.
        </p>
        <p>
          Если аккаунта в HHR у вас не было — это не проблема: по этому же номеру
          мы автоматически создадим вам аккаунт на hhr.pro, когда сервис снова
          заработает, и билеты уже будут лежать в нём.
        </p>
        <p>
          Эта страница нужна, чтобы розыгрыш и предзаказ футболок не ждали: она
          работает, пока основной сайт снова не заработал. Дата финала и правила
          не меняются.
        </p>
        <a className="hh-notice-contact" href={LEGAL.contactTelegram} target="_blank" rel="noreferrer">
          Вопросы — @HellGuarding
        </a>
      </div>

      <ul className="hh-legal-links">
        {LEGAL_LINKS.map((l) => (
          <li key={l.path}>
            <a
              href={l.path}
              onClick={(e) => {
                e.preventDefault();
                setDoc(l.path);
              }}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
      {doc && <TgDocSheet path={doc} onNavigate={setDoc} onClose={() => setDoc(null)} />}

      <div className="hh-legal-req">
        {LEGAL.shortName} · ОГРНИП {LEGAL.ogrnip} · ИНН {LEGAL.inn}
      </div>
    </footer>
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

function CheckoutSheet({
  total,
  ticketsLabel,
  shirtLines,
  ticketChoice,
  onClose,
}: {
  total: number;
  ticketsLabel: string;
  shirtLines: { id: string; size: string; qty: number; label: string }[];
  ticketChoice: { pack: number } | { custom: number };
  onClose: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const needAddress = shirtLines.length > 0;
  const [closing, setClosing] = useState(false);
  const [cdek, setCdek] = useState<CdekPickerState>(EMPTY_CDEK_STATE);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const phoneOk = isValidRuPhone(phone);
  const nameOk = name.trim().split(/\s+/).length >= 2;
  const canPay = phoneOk && (!needAddress || (nameOk && !!cdek.pvzCode));
  const [ship, setShip] = useState<{ price: number; min: number; max: number } | null>(null);
  const [shipState, setShipState] = useState<"idle" | "loading" | "error">("idle");

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 260);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Доставка СДЭК до ПВЗ с нашей наценкой — считает сервер
  const shirtQty = shirtLines.reduce((n, l) => n + l.qty, 0);
  useEffect(() => {
    setShip(null);
    if (!needAddress || !cdek.cityCode) { setShipState("idle"); return; }
    let cancelled = false;
    setShipState("loading");
    const t = setTimeout(() => {
      apiFetch<{ price: number; min: number; max: number }>("/api/v1/tg/shipping", {
        method: "POST",
        body: JSON.stringify({ cityCode: cdek.cityCode, qty: shirtQty }),
      })
        .then((r) => { if (!cancelled) { setShip(r); setShipState("idle"); } })
        .catch(() => { if (!cancelled) setShipState("error"); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [needAddress, cdek.cityCode, shirtQty]);

  const pay = async () => {
    if (!canPay || paying) return;
    setPaying(true); setPayError(null);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const r = await apiFetch<{ paymentUrl: string }>("/api/v1/tg/orders", {
        method: "POST",
        body: JSON.stringify({
          initData: tg?.initData ?? "",
          phone,
          tickets: ticketChoice,
          shirts: shirtLines.map(({ id, size, qty }) => ({ id, size, qty })),
          ...(needAddress ? {
            recipientName: name,
            pvz: { cityCode: cdek.cityCode, cityName: cdek.cityName, code: cdek.pvzCode, address: cdek.pvzAddress },
          } : {}),
        }),
      });
      window.location.href = r.paymentUrl;
    } catch (e) {
      setPayError((e as Error).message || "Не удалось создать оплату");
      setPaying(false);
    }
  };

  const grand = total + (ship?.price ?? 0);

  return (
    <div className={`hh-sheet-root ${closing ? "is-closing" : ""}`} onClick={close}>
      <div className="hh-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="hh-sheet-grip" />
        <div className="hh-sheet-head hh-stagger" style={{ ["--i" as string]: 0 }}>
          <h3>{needAddress ? "Оформление заказа" : "Почти готово"}</h3>
          <button aria-label="Закрыть" onClick={close}><PlumpClose size={20} /></button>
        </div>

        <div className="hh-sheet-body">
          <div className="hh-sheet-summary hh-stagger" style={{ ["--i" as string]: 1 }}>
            <div className="hh-sheet-row"><span>{ticketsLabel}</span></div>
            {shirtLines.map((l) => (
              <div key={l.label} className="hh-sheet-row"><span>{l.label}</span></div>
            ))}
          </div>

          <div className="hh-stagger" style={{ ["--i" as string]: 2 }}>
            <Section header="Телефон" footer="Тот же номер, что в HHR — по нему привяжем билеты к аккаунту. Если аккаунта не было — укажите любой свой номер, по нему и создадим.">
              <div className="hh-field">
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 (900) 000-00-00" value={phone}
                  onChange={(e) => setPhone(formatRuPhone(e.target.value))} className="min-w-0 flex-1" />
              </div>
            </Section>
          </div>

          {needAddress && (
            <>
              <div className="hh-stagger" style={{ ["--i" as string]: 3 }}>
                <Section header="Получатель">
                  <div className="hh-field">
                    <DadataInput type="fio" value={name} onChange={setName} placeholder="Фамилия и имя" autoComplete="name" className="min-w-0 flex-1" />
                  </div>
                </Section>
              </div>
              <div className="hh-stagger hh-sheet-cdek" style={{ ["--i" as string]: 4 }}>
                <TgPvzPicker value={cdek} onChange={setCdek} />
                <div className="hh-sheet-ship">
                  <PlumpTruck size={16} />
                  {!cdek.cityCode && <span>Выберите пункт — посчитаем доставку</span>}
                  {cdek.cityCode && shipState === "loading" && <span>Считаем доставку…</span>}
                  {cdek.cityCode && shipState === "error" && <span>Не удалось посчитать — согласуем при отправке</span>}
                  {ship && shipState === "idle" && (
                    <span>
                      Доставка <b>{ship.price.toLocaleString("ru-RU")} ₽</b>
                      {ship.max > 0 && <> · {ship.min === ship.max ? ship.min : `${ship.min}–${ship.max}`} дн.</>}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hh-sheet-foot hh-stagger" style={{ ["--i" as string]: needAddress ? 5 : 3 }}>
          {payError && <div className="hh-pay-error">{payError}</div>}
          <Button className="hh-pay-button hh-pay-button-docked" size="l" stretched disabled={!canPay || paying} loading={paying} onClick={pay}>
            <span className="hh-payment-label">{canPay ? "К оплате" : !phoneOk ? "Укажите телефон" : !nameOk ? "Укажите имя" : "Выберите пункт"}</span>
            <span className="hh-payment-amount"><NumberTicker value={grand} /> ₽</span>
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
