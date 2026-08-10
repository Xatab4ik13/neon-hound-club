import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpSpin, PlumpTicket, PlumpGift, PlumpDiamond, PlumpQuests } from "@/components/ui/icons";
import { haptic } from "@/hooks/use-haptic";

export const Route = createFileRoute("/club/spin")({
  head: () => ({
    meta: [
      { title: "HellSpin — клуб HELLHOUND" },
      { name: "description", content: "Ежедневная рулетка клуба HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SpinPage,
});

/* ---------------- Моки ---------------- */

type Rarity = "common" | "rare" | "epic" | "legend";

type Prize = {
  id: string;
  title: string;
  sub?: string;
  rarity: Rarity;
};

// Цвета редкости — из палитры проекта (магента / лайм / лаванда).
const RARITY: Record<Rarity, { ring: string; glow: string; label: string; chip: string }> = {
  common: { ring: "#3A3A3A", glow: "rgba(255,255,255,0.06)", label: "Обычный", chip: "#8A8A8A" },
  rare: { ring: "#B6FF3C", glow: "rgba(182,255,60,0.22)", label: "Редкий", chip: "#B6FF3C" },
  epic: { ring: "#C6A8FF", glow: "rgba(198,168,255,0.24)", label: "Эпик", chip: "#C6A8FF" },
  legend: { ring: "#F000C0", glow: "rgba(240,0,192,0.3)", label: "Легенда", chip: "#F000C0" },
};

const POOL: Prize[] = [
  { id: "xp100", title: "100 XP", rarity: "common" },
  { id: "t1", title: "1 билет", rarity: "common" },
  { id: "xp250", title: "250 XP", rarity: "common" },
  { id: "t3", title: "3 билета", rarity: "rare" },
  { id: "spin", title: "Бонус-спин", sub: "+1 прокрут", rarity: "rare" },
  { id: "xp500", title: "500 XP", rarity: "rare" },
  { id: "promo", title: "Промокод 20%", sub: "на товары", rarity: "epic" },
  { id: "t10", title: "10 билетов", rarity: "epic" },
  { id: "sticker", title: "Ремувка", sub: "с ближайшим заказом", rarity: "epic" },
  { id: "silver", title: "Hell Pass Silver", sub: "30 дней", rarity: "legend" },
  { id: "airpods", title: "AirPods 4", rarity: "legend" },
  { id: "watch", title: "Apple Watch SE", rarity: "legend" },
  { id: "ps5", title: "PlayStation 5 Slim", rarity: "legend" },
];

const CALENDAR = [
  { day: 10, title: "Носки", sub: "10 дней подряд" },
  { day: 20, title: "Silver + носки + 5 билетов", sub: "20 дней подряд" },
  { day: 30, title: "Gold + носки + ремувка + 20 билетов", sub: "30 дней подряд" },
];

const ITEM_W = 116; // ширина карточки
const GAP = 10;
const STEP = ITEM_W + GAP;
const STRIP_LEN = 64;

function buildStrip(): Prize[] {
  const out: Prize[] = [];
  for (let i = 0; i < STRIP_LEN; i++) out.push(POOL[Math.floor(Math.random() * POOL.length)]);
  return out;
}

/* ---------------- Страница ---------------- */

function SpinPage() {
  const [strip, setStrip] = useState<Prize[]>(() => buildStrip());
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Prize | null>(null);
  const [spinsLeft, setSpinsLeft] = useState(3); // мок: Gold-тир
  const [streak] = useState(7); // мок
  const viewportRef = useRef<HTMLDivElement>(null);

  const dayTicks = useMemo(() => Array.from({ length: 30 }, (_, i) => i + 1), []);

  function spin() {
    if (spinning || spinsLeft <= 0) return;
    haptic("selection");
    setWon(null);
    setSpinning(true);

    const fresh = buildStrip();
    setStrip(fresh);
    setOffset(0);

    // Цель — ближе к концу ленты, чтобы прокрут был длинным.
    const targetIndex = STRIP_LEN - 8 - Math.floor(Math.random() * 4);
    const jitter = (Math.random() - 0.5) * (ITEM_W * 0.5);

    requestAnimationFrame(() => {
      const w = viewportRef.current?.clientWidth ?? 360;
      setOffset(targetIndex * STEP + ITEM_W / 2 - w / 2 + jitter);
    });

    window.setTimeout(() => {
      setSpinning(false);
      setSpinsLeft((n) => Math.max(0, n - 1));
      setWon(fresh[targetIndex]);
      haptic("success");
    }, 5400);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="HellSpin" subtitle="Крути каждый день" />

      {/* Баланс спинов */}
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-card p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <PlumpSpin className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Спинов сегодня
          </p>
          <p className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
            {spinsLeft} <span className="text-muted-foreground">/ 4</span>
          </p>
        </div>
        <span className="shrink-0 rounded-xl bg-[#C6A8FF] px-2.5 py-1 font-display text-[11px] font-black uppercase tracking-tight text-black">
          Gold
        </span>
      </div>

      {/* Роллер */}
      <section aria-label="Рулетка" className="mb-4 overflow-hidden rounded-3xl bg-card p-4">
        <div
          ref={viewportRef}
          className="relative overflow-hidden rounded-2xl bg-black/40 py-4"
          style={{
            maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
            WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)",
          }}
        >
          {/* Указатель */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2">
            <div className="mx-auto h-full w-[3px] rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary))]" />
          </div>

          <div
            className="flex will-change-transform"
            style={{
              gap: `${GAP}px`,
              transform: `translate3d(${-offset}px,0,0)`,
              transition: spinning ? "transform 5.4s cubic-bezier(0.08,0.82,0.12,1)" : "none",
            }}
          >
            {strip.map((p, i) => (
              <PrizeCell key={`${p.id}-${i}`} prize={p} />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || spinsLeft <= 0}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-display text-[17px] font-black uppercase tracking-tight text-primary-foreground transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          <PlumpSpin className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? "Крутим…" : spinsLeft > 0 ? "Крутить" : "Спины закончились"}
        </button>

        {won && !spinning && (
          <div
            className="mt-4 flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: RARITY[won.rarity].glow,
              boxShadow: `inset 0 0 0 1px ${RARITY[won.rarity].ring}`,
            }}
          >
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{ background: RARITY[won.rarity].chip }}
            >
              <PlumpGift className="h-5 w-5 text-black" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Твой приз · {RARITY[won.rarity].label}
              </span>
              <span className="block truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                {won.title}
              </span>
            </span>
          </div>
        )}
      </section>

      {/* Календарь активности */}
      <section aria-label="Календарь активности" className="mb-5 rounded-3xl bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            Календарь активности
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {streak} / 30 дней
          </span>
        </div>

        <div className="mb-4 grid grid-cols-10 gap-1.5">
          {dayTicks.map((d) => {
            const done = d <= streak;
            const milestone = d === 10 || d === 20 || d === 30;
            return (
              <span
                key={d}
                className={`grid aspect-square place-items-center rounded-[10px] font-mono text-[10px] font-bold ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : milestone
                      ? "bg-[#B6FF3C]/15 text-[#B6FF3C]"
                      : "bg-white/[0.05] text-muted-foreground"
                }`}
              >
                {d}
              </span>
            );
          })}
        </div>

        <ul className="space-y-2">
          {CALENDAR.map((c) => (
            <li key={c.day} className="flex items-center gap-3 rounded-2xl bg-black/30 px-3 py-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#B6FF3C] font-display text-[12px] font-black text-black">
                {c.day}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-foreground">
                  {c.title}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.sub}
                </span>
              </span>
              {streak >= c.day ? (
                <span className="shrink-0 rounded-lg bg-primary px-2 py-0.5 font-display text-[10px] font-black uppercase text-primary-foreground">
                  Забрать
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* Пул призов */}
      <section aria-label="Что можно выиграть" className="mb-2">
        <h2 className="mb-3 px-1 text-[17px] font-semibold text-foreground">Что можно выиграть</h2>
        <ul className="overflow-hidden rounded-2xl bg-card">
          {POOL.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{ background: RARITY[p.rarity].chip }}
              >
                <PrizeIcon rarity={p.rarity} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-foreground">
                  {p.title}
                </span>
                {p.sub && (
                  <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {p.sub}
                  </span>
                )}
              </span>
              <span
                className="shrink-0 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: RARITY[p.rarity].chip }}
              >
                {RARITY[p.rarity].label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function PrizeIcon({ rarity }: { rarity: Rarity }) {
  const cls = "h-4 w-4 text-black";
  if (rarity === "legend") return <PlumpDiamond className={cls} />;
  if (rarity === "epic") return <PlumpGift className={cls} />;
  if (rarity === "rare") return <PlumpTicket className={cls} />;
  return <PlumpQuests className={cls} />;
}

function PrizeCell({ prize }: { prize: Prize }) {
  const r = RARITY[prize.rarity];
  return (
    <div
      className="relative flex shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl px-2 py-4 text-center"
      style={{
        width: ITEM_W,
        background: `linear-gradient(180deg, ${r.glow}, rgba(0,0,0,0.35))`,
        boxShadow: `inset 0 0 0 1px ${r.ring}`,
      }}
    >
      <span
        className="mb-2 grid h-9 w-9 place-items-center rounded-xl"
        style={{ background: r.chip }}
      >
        <PrizeIcon rarity={prize.rarity} />
      </span>
      <span className="line-clamp-2 font-display text-[12px] font-black uppercase leading-tight tracking-tight text-foreground">
        {prize.title}
      </span>
      <span
        className="absolute inset-x-0 bottom-0 h-[3px]"
        style={{ background: r.chip }}
      />
    </div>
  );
}
