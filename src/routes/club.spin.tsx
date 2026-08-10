import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpTicket, PlumpGift, PlumpDiamond, PlumpQuests } from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { haptic } from "@/hooks/use-haptic";
import { playSpin, playWin, playClick } from "@/lib/roller-sfx";

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

// Цвета редкости — плашки из школы: 03 циан → 04 лайм → 06 магента → 08 золото.
const RARITY: Record<Rarity, { ring: string; glow: string; label: string; chip: string }> = {
  common: { ring: "rgba(61,219,217,0.32)", glow: "rgba(61,219,217,0.16)", label: "Обычный", chip: "#3DDBD9" },
  rare: { ring: "rgba(182,255,60,0.35)", glow: "rgba(182,255,60,0.20)", label: "Редкий", chip: "#B6FF3C" },
  epic: { ring: "rgba(240,0,192,0.42)", glow: "rgba(240,0,192,0.24)", label: "Эпик", chip: "#F000C0" },
  legend: { ring: "rgba(255,217,61,0.48)", glow: "rgba(255,217,61,0.26)", label: "Легенда", chip: "#FFD93D" },
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

// Картинки майлстоунов: носки — из каталога магазина, Silver/Gold — бейджи Hell Pass.
const SOCKS_IMG =
  "https://api.hhr.pro/media/shop/da0bcbf8-594f-43b3-a412-39a5905c1800/6bd9b090-727f-43ef-bac8-a0220dd583c4.png";

const MILESTONE_IMG: Record<number, string> = {
  10: SOCKS_IMG,
  20: silverBadge.url,
  30: goldBadge.url,
};

const CALENDAR = [
  { day: 10, title: "Носки", sub: "10 дней подряд" },
  { day: 20, title: "Silver + носки + 5 билетов", sub: "20 дней подряд" },
  { day: 30, title: "Gold + носки + ремувка + 20 билетов", sub: "30 дней подряд" },
];


const ITEM_W = 104; // ширина карточки
const GAP = 8;
const STEP = ITEM_W + GAP;
const STRIP_LEN = 72;
const SPIN_MS = 5400;

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
    playClick();
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

    playSpin(targetIndex, SPIN_MS);

    window.setTimeout(() => {
      setSpinning(false);
      setSpinsLeft((n) => Math.max(0, n - 1));
      setWon(fresh[targetIndex]);
      haptic("success");
      playWin();
    }, SPIN_MS);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="HellSpin" subtitle="Крути каждый день" />

      {/* Баланс спинов */}
      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-card px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Спинов сегодня
          </p>
          <span className="mt-0.5 flex items-center gap-1 text-foreground">
            <PlumpNum value={spinsLeft} size={22} />
            <span className="text-muted-foreground">
              <PlumpNum value="/4" size={16} />
            </span>
          </span>
        </div>
        <span className="shrink-0 rounded-xl bg-[#C6A8FF] px-2.5 py-1 font-display text-[11px] font-black uppercase tracking-tight text-black">
          Gold
        </span>
      </div>


      {/* Роллер */}
      <section aria-label="Рулетка" className="mb-4 overflow-hidden rounded-3xl bg-card p-3 pb-4">
        <div
          ref={viewportRef}
          className="relative overflow-hidden rounded-[22px] py-5"
          style={{
            background:
              "radial-gradient(120% 140% at 50% 0%, hsl(var(--primary) / 0.10), transparent 60%), #0B0B0D",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Рельсы сверху/снизу */}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-white/[0.07]" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/[0.07]" />

          {/* Лента */}
          <div
            className="relative"
            style={{
              maskImage: "linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)",
              WebkitMaskImage: "linear-gradient(90deg,transparent,#000 14%,#000 86%,transparent)",
            }}
          >
            <div
              className="flex will-change-transform"
              style={{
                gap: `${GAP}px`,
                transform: `translate3d(${-offset}px,0,0)`,
                transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.08,0.82,0.12,1)` : "none",
              }}
            >
              {strip.map((p, i) => (
                <PrizeCell key={`${p.id}-${i}`} prize={p} />
              ))}
            </div>
          </div>

          {/* Указатель: плампные «клыки» + луч */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2">
            <span
              className="absolute left-1/2 top-0 h-full w-14 -translate-x-1/2"
              style={{
                background:
                  "linear-gradient(180deg, hsl(var(--primary) / 0.22), transparent 45%, hsl(var(--primary) / 0.22))",
              }}
            />
            <span className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2 rounded-full bg-primary shadow-[0_0_22px_hsl(var(--primary))]" />
            <span
              className="absolute left-1/2 top-[-1px] h-3 w-3 -translate-x-1/2 rounded-[3px] bg-primary"
              style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
            />
            <span
              className="absolute bottom-[-1px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-[3px] bg-primary"
              style={{ clipPath: "polygon(50% 0, 0 100%, 100% 100%)" }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={spin}
          disabled={spinning || spinsLeft <= 0}
          className="mt-3 flex h-14 w-full items-center justify-center rounded-2xl bg-[#B6FF3C] font-display text-[17px] font-black uppercase tracking-tight text-black shadow-[0_10px_30px_-12px_#B6FF3C] transition-transform active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
        >
          {spinning ? "Крутим…" : spinsLeft > 0 ? "Крутить" : "Спины закончились"}
        </button>


        {won && !spinning && (
          <div
            className="mt-3 flex animate-scale-in items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: RARITY[won.rarity].glow,
              boxShadow: `inset 0 0 0 1px ${RARITY[won.rarity].ring}`,
            }}
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{ background: RARITY[won.rarity].chip }}
            >
              <PrizeIcon rarity={won.rarity} />
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
          <span className="flex items-center gap-1 text-muted-foreground">
            <PlumpNum value={`${streak}/30`} size={13} />
            <span className="font-mono text-[10px] uppercase tracking-widest">дней</span>
          </span>
        </div>

        <div className="mb-4 grid grid-cols-10 gap-1.5">
          {dayTicks.map((d) => {
            const done = d <= streak;
            const milestone = d === 10 || d === 20 || d === 30;
            return (
              <span
                key={d}
                className={`grid aspect-square place-items-center rounded-xl font-mono text-[10px] font-bold ${
                  done
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--primary))]"
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
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#B6FF3C] text-black">
                <PlumpNum value={c.day} size={14} />
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
        <ul className="overflow-hidden rounded-3xl bg-card">
          {POOL.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
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
  const cls = "h-5 w-5 text-black";
  if (rarity === "legend") return <PlumpDiamond className={cls} />;
  if (rarity === "epic") return <PlumpGift className={cls} />;
  if (rarity === "rare") return <PlumpTicket className={cls} />;
  return <PlumpQuests className={cls} />;
}

function PrizeCell({ prize }: { prize: Prize }) {
  const r = RARITY[prize.rarity];
  return (
    <div
      className="relative flex shrink-0 flex-col items-center justify-end overflow-hidden rounded-[20px] px-2 pb-3 pt-4 text-center"
      style={{
        width: ITEM_W,
        height: 132,
        background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.25) 45%, ${r.glow} 100%)`,
        boxShadow: `inset 0 0 0 1.5px ${r.ring}`,
      }}
    >
      {/* Луч редкости снизу */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: `linear-gradient(180deg, transparent, ${r.glow})` }}
      />
      <span
        className="relative mb-2 grid h-11 w-11 place-items-center rounded-2xl"
        style={{ background: r.chip, boxShadow: `0 8px 22px -10px ${r.chip}` }}
      >
        <PrizeIcon rarity={prize.rarity} />
      </span>
      <span className="relative line-clamp-2 font-display text-[12px] font-black uppercase leading-tight tracking-tight text-foreground">
        {prize.title}
      </span>
      <span className="absolute inset-x-3 bottom-0 h-[4px] rounded-t-full" style={{ background: r.chip }} />
    </div>
  );
}
