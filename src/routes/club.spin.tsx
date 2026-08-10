import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpSpin, PlumpBook, PlumpArrowRight as ChevronRight } from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { haptic } from "@/hooks/use-haptic";
import { useSpinAccess } from "@/hooks/use-spin-access";
import { SpinAccessGate } from "@/components/club/SpinAccessGate";
import { playWin, playClick, playTick } from "@/lib/roller-sfx";
import silverBadge from "@/assets/hellpass/tpl-silver.webp";
import goldBadge from "@/assets/hellpass/tpl-gold.webp";
import platinumBadge from "@/assets/hellpass/tpl-platinum.webp";
import imgAirpods from "@/assets/spin/airpods.webp";
import imgWatch from "@/assets/spin/watch.webp";
import imgPs5 from "@/assets/spin/ps5.webp";
import imgBonusSpin from "@/assets/spin/bonus-spin.webp";
import imgTicket from "@/assets/spin/ticket.webp";
import imgXp from "@/assets/spin/xp.webp";
import imgPromo from "@/assets/spin/promo.webp";
import imgRemovka from "@/assets/spin/removka.webp";
import imgSocks from "@/assets/spin/socks.webp";
import { apiFetch, ApiError } from "@/lib/api";
import { isStandalone } from "@/hooks/use-install-prompt";

import { hhToast as toast } from "@/lib/hh-toast";



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

/* ---------------- Данные призов (картинки — локальные ассеты, тексты совпадают с бэком) ---------------- */

type Rarity = "common" | "rare" | "epic" | "legend";

type Prize = {
  id: string;
  title: string;
  sub?: string;
  rarity: Rarity;
  img?: string;
  /** Фото товара кропаем по кругу, 3D-рендеры вписываем целиком. */
  fit?: "cover" | "contain";
  /** Не показываем в списке «что можно выиграть» и в ленте. */
  hidden?: boolean;
};


// Цвета редкости — плашки из школы: 03 циан → 04 лайм → 06 магента → 08 золото.
const RARITY: Record<Rarity, { ring: string; glow: string; label: string; chip: string }> = {
  common: { ring: "rgba(61,219,217,0.32)", glow: "rgba(61,219,217,0.16)", label: "Обычный", chip: "#3DDBD9" },
  rare: { ring: "rgba(182,255,60,0.35)", glow: "rgba(182,255,60,0.20)", label: "Редкий", chip: "#B6FF3C" },
  epic: { ring: "rgba(240,0,192,0.42)", glow: "rgba(240,0,192,0.24)", label: "Эпик", chip: "#F000C0" },
  legend: { ring: "rgba(255,217,61,0.48)", glow: "rgba(255,217,61,0.26)", label: "Легенда", chip: "#FFD93D" },
};

// Все картинки призов — локальные ассеты в бандле. Никаких ссылок на медиа-сервер:
// иначе после деплоя картинка может не отдаться (как было с фото инструкторов).
const POOL: Prize[] = [
  { id: "xp100", title: "100 XP", rarity: "common", img: imgXp },
  { id: "t1", title: "1 билет", rarity: "common", img: imgTicket },
  { id: "xp250", title: "250 XP", rarity: "common", img: imgXp },
  { id: "t3", title: "3 билета", rarity: "rare", img: imgTicket },
  { id: "spin", title: "Бонус-спин", sub: "+1 прокрут", rarity: "rare", img: imgBonusSpin },
  { id: "xp500", title: "500 XP", rarity: "rare", img: imgXp },
  { id: "promo", title: "Промокод 20%", sub: "на товары", rarity: "epic", img: imgPromo },
  { id: "t10", title: "10 билетов", rarity: "epic", img: imgTicket },
  { id: "sticker", title: "Ремувка", sub: "подарок · доставка за нами", rarity: "epic", img: imgRemovka },
  { id: "silver", title: "Hell Pass Silver", sub: "30 дней", rarity: "legend", img: silverBadge },
  { id: "airpods", title: "AirPods 4", rarity: "legend", img: imgAirpods },
  { id: "watch", title: "Apple Watch SE", rarity: "legend", img: imgWatch },
  { id: "ps5", title: "PlayStation 5 Slim", rarity: "legend", img: imgPs5 },
  // Скрытые сектора: бэкенд подменяет ими приз, когда пул закончился.
  { id: "t50", title: "50 билетов", rarity: "epic", img: imgTicket, hidden: true },
  { id: "socks", title: "Носки", rarity: "rare", img: imgSocks, fit: "cover", hidden: true },
];

const PRIZE_BY_ID = new Map(POOL.map((p) => [p.id, p]));

/** Приз по коду с бэка. Незнакомый код не должен ломать анимацию. */
function prizeByCode(code: string, title?: string, rarity?: string): Prize {
  const known = PRIZE_BY_ID.get(code);
  if (known) return known;
  return {
    id: code,
    title: title ?? code,
    rarity: (rarity as Rarity) ?? "common",
  };
}

const VISIBLE = POOL.filter((p) => !p.hidden);
const LEGENDS = VISIBLE.filter((p) => p.rarity === "legend");
const NON_LEGENDS = VISIBLE.filter((p) => p.rarity !== "legend");

const MILESTONE_IMG: Record<number, string> = {
  10: imgSocks,
  20: silverBadge,
  30: goldBadge,
};

// Фото товара нужно кропать по кругу, а бейджи — вписывать целиком.
const MILESTONE_FIT: Record<number, "cover" | "contain"> = {
  10: "cover",
  20: "contain",
  30: "contain",
};

const CALENDAR = [
  { day: 10, title: "Носки", sub: "10 дней подряд" },
  { day: 20, title: "Silver + носки + 5 билетов", sub: "20 дней подряд" },
  { day: 30, title: "Gold + носки + ремувка + 20 билетов", sub: "30 дней подряд" },
];

const TIER_LABEL: Record<SpinTier, { name: string; bg: string; fg: string }> = {
  none: { name: "Без Pass", bg: "rgba(255,255,255,0.12)", fg: "hsl(var(--foreground))" },
  silver: { name: "Silver", bg: "#C7CCD6", fg: "#000" },
  gold: { name: "Gold", bg: "#C6A8FF", fg: "#000" },
  platinum: { name: "Platinum", bg: "#F000C0", fg: "#fff" },
};

const ITEM_W = 104; // ширина карточки
const GAP = 8;
const STEP = ITEM_W + GAP;
const STRIP_LEN = 72;
const TOTAL_MS = 6200; // вся прокрутка — одна непрерывная анимация
const CRAWL_FROM = 0.66; // с этого момента лента уже еле ползёт

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Лента: случайные призы, «дразнилка» легендой перед финалом, финал — реальный приз с бэка. */
function buildStrip(teaseIndex: number, targetIndex: number, target: Prize) {
  const out: Prize[] = [];
  for (let i = 0; i < STRIP_LEN; i++) out.push(pick(VISIBLE));
  // Если реальный приз — легенда, дразнить легендой не нужно: пусть будет обычный сектор.
  out[teaseIndex] = target.rarity === "legend" ? pick(NON_LEGENDS) : pick(LEGENDS);
  out[targetIndex] = target;
  return out;
}


/** Кубический Эрмит: позиция + касательные, чтобы скорость стыковалась без рывка. */
function hermite(u: number, p0: number, p1: number, m0: number, m1: number) {
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * p0 +
    (u3 - 2 * u2 + u) * m0 +
    (-2 * u3 + 3 * u2) * p1 +
    (u3 - u2) * m1
  );
}

/* ---------------- API ---------------- */

type SpinTier = "none" | "silver" | "gold" | "platinum";

type SpinState = {
  access: { granted: boolean; installed: boolean; phoneVerified: boolean; pushEnabled: boolean };
  tier: SpinTier;
  season: { periodKey: string; daysTotal: number; endsAt: string };
  spins: { allowed: number; used: number; left: number };
  streak: { days: number; claimed: number[] };
  history: { prizeCode: string; title: string; at: string }[];
};

type RollResult = {
  prizeCode: string;
  prizeTitle: string;
  rarity: Rarity;
  rewardKind: string;
  rewardValue: number;
  promoCode?: string;
  bonusSpin: boolean;
  spinsAllowed: number;
  spinsLeft: number;
  streakDays: number;
};

/** Бэк отдаёт спины только из установленной PWA — прокидываем признак заголовком. */
function pwaHeaders(): Record<string, string> {
  return { "x-pwa": isStandalone() ? "1" : "0" };
}

/* ---------------- Страница ---------------- */

function SpinPage() {
  const [strip, setStrip] = useState<Prize[]>(() =>
    buildStrip(STRIP_LEN - 12, STRIP_LEN - 10, pick(NON_LEGENDS)),
  );
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<Prize | null>(null);
  const [wonPromo, setWonPromo] = useState<string | null>(null);
  const [state, setState] = useState<SpinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);

  const access = useSpinAccess();
  // Замок ставим по локальным признакам (PWA + push) — сервер проверяет то же самое.
  const locked = !access.granted;
  const spinsLeft = state?.spins.left ?? 0;
  const spinsAllowed = state?.spins.allowed ?? 0;
  const tier: SpinTier = state?.tier ?? "none";
  const streak = state?.streak.days ?? 0;
  const claimed = state?.streak.claimed ?? [];
  const lastPrize = state?.history[0]
    ? prizeByCode(state.history[0].prizeCode, state.history[0].title)
    : null;

  const viewportRef = useRef<HTMLDivElement>(null);
  // Лента двигается напрямую через ref: никакого state на 60 fps → нет ре-рендера 72 карточек.
  const stripRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const dayTicks = useMemo(
    () => Array.from({ length: state?.season.daysTotal ?? 30 }, (_, i) => i + 1),
    [state?.season.daysTotal],
  );

  const loadState = useMemo(
    () => async () => {
      try {
        const s = await apiFetch<SpinState>("/api/v1/spin/state", { headers: pwaHeaders() });
        setState(s);
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) {
          toast.error("Не удалось загрузить рулетку");
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  function moveStrip(px: number) {
    const el = stripRef.current;
    if (el) el.style.transform = `translate3d(${-px}px,0,0)`;
  }

  function centerFor(index: number, extra = 0) {
    const w = viewportRef.current?.clientWidth ?? 360;
    return index * STEP + ITEM_W / 2 - w / 2 + extra;
  }

  async function claimMilestone(day: number) {
    if (claiming) return;
    setClaiming(day);
    try {
      await apiFetch("/api/v1/spin/streak/claim", {
        method: "POST",
        body: JSON.stringify({ milestone: day }),
      });
      haptic("success");
      toast.success("Награда забрана — заберём с тебя адрес доставки");
      await loadState();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Не удалось забрать награду");
    } finally {
      setClaiming(null);
    }
  }

  /** Крутим ленту к уже известному призу с бэка. */
  function runRoller(target: Prize, result: RollResult) {
    // Финал стоит сразу за «дразнилкой»: легенда почти встаёт под маркер,
    // а лента продолжает еле-еле ползти и мягко доводит настоящий приз.
    const targetIndex = STRIP_LEN - 8 - Math.floor(Math.random() * 3);
    const teaseIndex = targetIndex - 1;

    const fresh = buildStrip(teaseIndex, targetIndex, target);
    setStrip(fresh);
    moveStrip(0);

    const end = centerFor(targetIndex, (Math.random() - 0.5) * 8);
    // Точка, где легенда почти встала под маркер (чуть недоезд).
    const teaseStop = centerFor(teaseIndex, 4 + Math.random() * 6);
    const f = teaseStop / end;

    // Скорость на стыке: одинаковая с обеих сторон → никаких перескоков.
    const m1a = 0.075 * f; // медленное прибытие к легенде
    const d1 = CRAWL_FROM;
    const d2 = 1 - CRAWL_FROM;
    const m0b = (m1a * d2) / d1;

    const pos = (t: number) => {
      if (t <= CRAWL_FROM) {
        return end * hermite(t / d1, 0, f, 2.55 * f, m1a);
      }
      return end * hermite((t - CRAWL_FROM) / d2, f, 1, m0b, 0);
    };

    const t0 = performance.now();
    let lastCell = -1;

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / TOTAL_MS);
      const px = pos(t);
      moveStrip(px);

      // Тики по реально проехавшим карточкам — ритм всегда совпадает с картинкой.
      const cell = Math.floor(px / STEP);
      if (cell !== lastCell) {
        lastCell = cell;
        const speed = Math.min(1, Math.abs(pos(Math.min(1, t + 0.004)) - px) / (STEP * 0.9));
        playTick(0.05 + speed * 0.14, 0.25 + speed * 0.75);
        // Вибрация синхронно с тиком: на скорости сливается в «тр-т-т-т»,
        // к концу — отчётливые тапы, как звук. Vibration API (Android).
        try { navigator.vibrate?.(3); } catch { /* iOS — no-op */ }
      }


      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      rafRef.current = null;
      setSpinning(false);
      setWon(target);
      setWonPromo(result.promoCode ?? null);
      // Счётчики берём из ответа сервера — он единственный источник правды.
      setState((prev) =>
        prev
          ? {
              ...prev,
              spins: {
                allowed: result.spinsAllowed,
                used: Math.max(0, result.spinsAllowed - result.spinsLeft),
                left: result.spinsLeft,
              },
              streak: { ...prev.streak, days: result.streakDays },
              history: [
                { prizeCode: result.prizeCode, title: result.prizeTitle, at: new Date().toISOString() },
                ...prev.history,
              ].slice(0, 10),
            }
          : prev,
      );

      haptic("success");
      playWin();
    };

    rafRef.current = requestAnimationFrame(frame);
  }

  async function spin() {
    if (spinning || spinsLeft <= 0 || locked) return;
    haptic("selection");
    playClick();
    setWon(null);
    setWonPromo(null);
    setSpinning(true);

    try {
      const result = await apiFetch<RollResult>("/api/v1/spin/roll", {
        method: "POST",
        headers: pwaHeaders(),
        body: JSON.stringify({ pwa: isStandalone() }),
      });
      const target = prizeByCode(result.prizeCode, result.prizeTitle, result.rarity);
      runRoller(target, result);
    } catch (err) {
      setSpinning(false);
      toast.error(err instanceof ApiError ? err.message : "Не удалось прокрутить");
      void loadState();
    }
  }




  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <PageHeader title="HellSpin" subtitle="Крути каждый день" />

      {locked && !access.checking && <SpinAccessGate access={access} />}

      {/* Баланс спинов */}
      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-card px-4 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Спинов сегодня
          </p>
          <span className="mt-0.5 flex items-center gap-1 text-foreground">
            <PlumpNum value={loading ? "—" : spinsLeft} size={22} />
            <span className="text-muted-foreground">
              <PlumpNum value={`/${loading ? "—" : spinsAllowed}`} size={16} />
            </span>
          </span>
        </div>
        <span
          className="shrink-0 rounded-xl px-2.5 py-1 font-display text-[11px] font-black uppercase tracking-tight"
          style={{ background: TIER_LABEL[tier].bg, color: TIER_LABEL[tier].fg }}
        >
          {TIER_LABEL[tier].name}
        </span>
      </div>



      {/* Роллер */}
      <section
        aria-label="Рулетка"
        className={`mb-4 overflow-hidden rounded-3xl bg-card p-3 pb-4 ${locked ? "opacity-60 saturate-[0.35]" : ""}`}
      >
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
              ref={stripRef}
              className="flex will-change-transform"
              style={{ gap: `${GAP}px`, transform: "translate3d(0,0,0)" }}
            >

              {strip.map((p, i) => (
                <PrizeCell key={`${p.id}-${i}`} prize={p} />
              ))}
            </div>
          </div>

          {/* Бегущий свет по стеклу во время прокрута */}
          {spinning && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 animate-[hs-sweep_1100ms_linear_infinite]"
              style={{
                background:
                  "linear-gradient(100deg, transparent, rgba(255,255,255,0.10) 45%, transparent)",
              }}
            />
          )}

          {/* Указатель: плампные «клыки» + луч */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2">
            <span
              className={`absolute left-1/2 top-0 h-full w-14 -translate-x-1/2 ${spinning ? "animate-[hs-marker-pulse_620ms_ease-in-out_infinite]" : ""}`}
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
          disabled={spinning || spinsLeft <= 0 || locked}
          className="relative mt-3 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#B6FF3C] font-display text-[17px] font-black uppercase tracking-tight text-black shadow-[0_10px_30px_-12px_#B6FF3C] transition-transform active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
        >
          {!spinning && spinsLeft > 0 && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[hs-sweep_2600ms_linear_infinite]"
              style={{
                background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)",
              }}
            />
          )}
          <span className="relative">
            {locked
              ? "Доступно в приложении"
              : spinning
                ? "Крутим…"
                : spinsLeft > 0
                  ? "Крутить"
                  : "Спины закончились"}
          </span>
        </button>

        {lastPrize && !spinning && (
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Твой последний приз:{" "}
            <span className="text-foreground">{lastPrize.title}</span>
          </p>
        )}

      </section>

      <WinModal
        prize={won}
        open={!!won && !spinning}
        onClose={() => setWon(null)}
      />


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
            const img = MILESTONE_IMG[d];
            if (img) {
              const fit = MILESTONE_FIT[d] ?? "contain";
              const isClaimed = claimed.includes(d);
              return (
                <span
                  key={d}
                  className={`relative grid aspect-square place-items-center overflow-hidden rounded-full ${
                    done
                      ? "bg-[#B6FF3C] shadow-[0_4px_14px_-6px_#B6FF3C]"
                      : "bg-[#B6FF3C]/15 ring-1 ring-inset ring-[#B6FF3C]/40"
                  }`}
                >
                  <img
                    src={img}
                    alt=""
                    loading="lazy"
                    className={`h-full w-full ${
                      fit === "cover" ? "scale-[1.15] object-cover" : "object-contain p-[2px]"
                    } ${done ? "" : "opacity-70"}`}
                  />
                </span>
              );
            }
            return (
              <span
                key={d}
                className={`grid aspect-square place-items-center rounded-xl font-mono text-[10px] font-bold ${
                  done
                    ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-6px_hsl(var(--primary))]"
                    : "bg-white/[0.05] text-muted-foreground"
                }`}
              >
                {d}
              </span>
            );
          })}
        </div>

        <ul className="space-y-2">
          {CALENDAR.map((c) => {
            const isClaimed = claimed.includes(c.day);
            return (
              <li
                key={c.day}
                className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-black/30 px-3 py-2.5"
              >
                <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06]">
                  <img
                    src={MILESTONE_IMG[c.day]}
                    alt={c.title}
                    loading="lazy"
                    className={`h-full w-full ${
                      (MILESTONE_FIT[c.day] ?? "contain") === "cover"
                        ? "scale-[1.15] object-cover"
                        : "object-contain p-1"
                    }`}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[14px] font-semibold ${
                      isClaimed ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {c.title}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isClaimed ? "Забрано" : c.sub}
                  </span>
                </span>

                {isClaimed ? (
                  <span className="shrink-0 rounded-lg border-[2px] border-foreground bg-[#B6FF3C] px-2 py-1 font-display text-[10px] font-black uppercase tracking-tight text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]">
                    Твоё
                  </span>
                ) : streak >= c.day ? (
                  <button
                    type="button"
                    onClick={() => claimMilestone(c.day)}
                    className="shrink-0 rounded-lg bg-primary px-2.5 py-1 font-display text-[10px] font-black uppercase text-primary-foreground transition-transform active:scale-[0.94]"
                  >
                    Забрать
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <HowItWorks />

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
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black/40"
                style={{ boxShadow: `inset 0 0 0 1px ${RARITY[p.rarity].ring}` }}
              >
                <PrizeMedia prize={p} size={34} />
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




/** Медиа приза: 3D-рендер вписываем целиком, фото товара — кропаем в кругляш. */
function PrizeMedia({ prize, size }: { prize: Prize; size: number }) {
  const r = RARITY[prize.rarity];
  if (!prize.img) {
    return (
      <span
        className="grid place-items-center rounded-full"
        style={{ width: size, height: size, background: r.chip }}
      >
        <PlumpSpin className="text-black" style={{ width: size * 0.55, height: size * 0.55 }} />
      </span>
    );
  }
  if (prize.fit === "cover") {
    return (
      <span
        className="block overflow-hidden rounded-full"
        style={{
          width: size,
          height: size,
          boxShadow: `inset 0 0 0 2px ${r.ring}, 0 6px 16px -4px ${r.glow}`,
        }}
      >
        <img src={prize.img} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <img
      src={prize.img}
      alt=""
      loading="lazy"
      className="object-contain"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 6px 14px ${r.glow})`,
      }}
    />
  );
}

const PrizeCell = memo(function PrizeCell({ prize }: { prize: Prize }) {
  const r = RARITY[prize.rarity];
  const legend = prize.rarity === "legend";
  return (
    <div
      className="relative flex shrink-0 flex-col items-center justify-end overflow-hidden rounded-[20px] px-2 pb-3 pt-3 text-center"
      style={{
        width: ITEM_W,
        height: 148,
        background: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.28) 45%, ${r.glow} 100%)`,
        boxShadow: `inset 0 0 0 1.5px ${r.ring}`,
      }}
    >
      {/* Луч редкости снизу */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: `linear-gradient(180deg, transparent, ${r.glow})` }}
      />
      {legend && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(70% 50% at 50% 35%, ${r.glow}, transparent 70%)`,
          }}
        />
      )}
      {/* Глянцевый блик сверху — стекло поверх карточки */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent)",
        }}
      />
      <span className="relative mb-1.5 grid flex-1 place-items-center">
        <PrizeMedia prize={prize} size={legend ? 62 : 52} />
      </span>
      <span className="relative line-clamp-2 font-display text-[11px] font-black uppercase leading-tight tracking-tight text-foreground">
        {prize.title}
      </span>
      <span className="absolute inset-x-3 bottom-0 h-[4px] rounded-t-full" style={{ background: r.chip }} />
    </div>
  );
});



/* ---------------- Модалка выигрыша ---------------- */

function WinModal({
  prize,
  open,
  onClose,
}: {
  prize: Prize | null;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !prize || typeof document === "undefined") return null;
  const r = RARITY[prize.rarity];

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-label={`Приз: ${prize.title}`}
    >
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <div
        className="relative w-full max-w-sm animate-[hs-win-pop_420ms_cubic-bezier(0.2,1.4,0.3,1)_both] overflow-hidden rounded-[28px] bg-card px-6 pb-6 pt-7 text-center"
        style={{
          boxShadow: `inset 0 0 0 1.5px ${r.ring}, 0 30px 70px -30px ${r.chip}`,
        }}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{
            background: `radial-gradient(120% 100% at 50% 0%, ${r.glow}, transparent 70%)`,
          }}
        />

        <span
          className="relative inline-block rounded-xl px-2.5 py-1 font-display text-[11px] font-black uppercase tracking-tight text-black"
          style={{ background: r.chip }}
        >
          {r.label}
        </span>

        <span
          className="relative mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${r.glow}, rgba(0,0,0,0.35) 72%)`,
            boxShadow: `inset 0 0 0 1.5px ${r.ring}`,
          }}
        >
          <PrizeMedia prize={prize} size={96} />
        </span>

        <h2 className="relative mt-5 font-display text-[22px] font-black uppercase leading-tight tracking-tight text-foreground">
          {prize.title}
        </h2>
        {prize.sub && (
          <p
            className="relative mt-1 font-mono text-[11px] uppercase tracking-widest"
            style={{ color: r.chip }}
          >
            {prize.sub}
          </p>
        )}
        <p className="relative mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Приз зачислен в твой аккаунт
        </p>

        <button
          type="button"
          onClick={onClose}
          className="relative mt-6 w-full rounded-2xl bg-[#B6FF3C] py-4 font-display text-[16px] font-black uppercase tracking-tight text-black transition-transform active:scale-[0.97]"
        >
          Забрать
        </button>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Как это работает ---------------- */

function HowItWorks() {
  const [open, setOpen] = useState(false);

  const tiers: { name: string; spins: number; badge: string | null; vip?: boolean }[] = [
    { name: "Без Pass", spins: 1, badge: null },
    { name: "Silver", spins: 2, badge: silverBadge },
    { name: "Gold", spins: 4, badge: goldBadge },
    { name: "Platinum", spins: 7, badge: platinumBadge, vip: true },
  ];

  return (
    <section aria-label="Как это работает" className="mb-5 overflow-hidden rounded-3xl bg-card">
      <button
        type="button"
        onClick={() => {
          haptic("selection");
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.03]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#C6A8FF]">
          <PlumpBook className="h-5 w-5 text-black" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            Как это работает
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Сезон 11 авг — 10 сен · 30 дней
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 px-4 pb-5">
            {/* Сезон */}
            <div>
              <h3 className="mb-1.5 font-display text-[13px] font-black uppercase tracking-tight text-foreground">
                Сезон HellSpin
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="text-foreground">11 августа → 10 сентября.</span>{" "}
                30 дней, каждый день — новая пачка спинов. Не крутанул сегодня — завтра обнулилось.
              </p>
            </div>

            {/* Призы гарантированы */}
            <div>
              <h3 className="mb-2 font-display text-[13px] font-black uppercase tracking-tight text-foreground">
                Призы гарантированы
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Призы гарантированно{" "}
                <span className="text-foreground">найдут своих владельцев</span> за 30 дней.
                Больше спинов — больше шансов забрать приз.
              </p>
            </div>

            {/* Больше спинов */}
            <div>
              <h3 className="mb-1.5 font-display text-[13px] font-black uppercase tracking-tight text-foreground">
                Больше спинов — больше шансов
              </h3>
              <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                Каждый спин — шанс забрать приз. Чем выше тир, тем больше выстрелов в день.
              </p>
              <div className="space-y-1.5">
                {tiers.map((t) => (
                  <div
                    key={t.name}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                      t.vip
                        ? "bg-[#F000C0]/10 ring-1 ring-inset ring-[#F000C0]/30"
                        : "bg-black/30"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06]">
                      {t.badge ? (
                        <img
                          src={t.badge}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-contain p-0.5"
                        />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-semibold text-foreground">
                      {t.name}
                    </span>
                    <span className="flex items-baseline gap-1">
                      <PlumpNum value={t.spins} size={18} />
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        в день
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Link
              to="/club/hell-pass"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#B6FF3C] py-3.5 font-display text-[15px] font-black uppercase tracking-tight text-black shadow-[0_10px_30px_-12px_#B6FF3C] transition-transform active:scale-[0.97]"
            >
              Получить больше спинов
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

