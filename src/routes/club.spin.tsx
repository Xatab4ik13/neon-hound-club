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
import { subscribeToPush } from "@/lib/push";

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
import imgCapsule from "@/assets/spin/capsule-x2.png";
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
  { id: "sticker", title: "Ремувка", rarity: "epic", img: imgRemovka },
  { id: "boost_x2", title: "Капсула ×2", sub: "24 часа · цифра", rarity: "legend", img: imgCapsule },
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
  10: silverBadge,
  20: imgSocks,
  30: goldBadge,
};

// Фото товара нужно кропать по кругу, а бейджи — вписывать целиком.
const MILESTONE_FIT: Record<number, "cover" | "contain"> = {
  10: "contain",
  20: "cover",
  30: "contain",
};

const CALENDAR = [
  { day: 10, title: "Hell Pass Silver + 5 билетов", sub: "10 дней подряд" },
  { day: 20, title: "Носки", sub: "20 дней подряд" },
  { day: 30, title: "Hell Pass Gold + 20 билетов", sub: "30 дней подряд" },
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
  access: { granted: boolean; pwa: boolean; phoneVerified: boolean; pushEnabled: boolean };
  tier: SpinTier;
  season: { periodKey: string; daysTotal: number; startsAt?: string; endsAt: string };
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
  // Тосты в проекте отключены, поэтому ошибку крутки показываем прямо на странице.
  const [spinError, setSpinError] = useState<string | null>(null);


  const access = useSpinAccess();
  // Локально видим PWA + push, телефон проверяет сервер — блокируем по обоим сигналам.
  const phoneMissing = state ? !state.access.phoneVerified : false;
  const locked = !access.granted || phoneMissing;
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
      const res = await apiFetch<{ promoCode?: string }>("/api/v1/spin/streak/claim", {
        method: "POST",
        body: JSON.stringify({ milestone: day }),
      });
      haptic("success");
      toast.success(
        res?.promoCode
          ? `Промокод ${res.promoCode} — носки за 0₽, платишь только доставку`
          : "Награда забрана",
      );
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
    let lastBuzz = 0;

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
        // Вибрация синхронно с тиком. Каждый вызов vibrate() отменяет предыдущий,
        // а импульсы <10ms Android вообще не успевает отыграть — поэтому дросселим
        // до ~55ms и даём ощутимую длительность.
        if (now - lastBuzz > 55) {
          lastBuzz = now;
          try {
            navigator.vibrate?.(Math.round(14 + (1 - speed) * 12));
          } catch {
            /* iOS — no-op */
          }
        }
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
    setSpinError(null);
    setSpinning(true);

    const roll = () =>

      apiFetch<RollResult>("/api/v1/spin/roll", {
        method: "POST",
        headers: pwaHeaders(),
        body: JSON.stringify({ pwa: isStandalone() }),
      });

    try {
      let result: RollResult;
      try {
        result = await roll();
      } catch (err) {
        // Сервер мог удалить протухшую push-подписку (FCM 410), пока браузер
        // локально всё ещё считает её живой. Пере-подписываемся и повторяем.
        if (err instanceof ApiError && err.status === 403) {
          const res = await subscribeToPush();
          if (!res.ok) throw err;
          result = await roll();
        } else {
          throw err;
        }
      }
      const target = prizeByCode(result.prizeCode, result.prizeTitle, result.rarity);
      runRoller(target, result);
    } catch (err) {
      setSpinning(false);
      const msg =
        err instanceof ApiError
          ? err.status === 401
            ? "Сессия истекла — зайди в аккаунт заново."
            : err.message
          : "Нет связи с сервером. Проверь интернет и попробуй ещё раз.";
      setSpinError(msg);
      toast.error(msg);
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
          onClick={() => void spin()}
          disabled={spinning || loading || spinsLeft <= 0 || locked}
          className="relative mt-3 flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#B6FF3C] font-display text-[17px] font-black uppercase tracking-tight text-black shadow-[0_10px_30px_-12px_#B6FF3C] transition-transform active:scale-[0.97] disabled:opacity-40 disabled:shadow-none"
        >
          {!spinning && spinsLeft > 0 && !locked && (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[hs-sweep_2600ms_linear_infinite]"
              style={{
                background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)",
              }}
            />
          )}
          <span className="relative">
            {phoneMissing
              ? "Подтверди телефон"
              : locked
                ? "Доступно в приложении"
                : loading
                  ? "Загружаем…"
                  : spinning
                    ? "Крутим…"
                    : spinsLeft > 0
                      ? "Крутить"
                      : "Спины закончились"}
          </span>
        </button>

        {spinError && !spinning && (
          <p className="mt-3 rounded-2xl border border-[#F000C0]/40 bg-[#F000C0]/10 px-4 py-3 text-center text-[13px] leading-snug text-foreground">
            {spinError}
          </p>
        )}



        {phoneMissing && (
          <Link
            to="/club/me"
            className="mt-3 block text-center font-mono text-[11px] uppercase tracking-widest text-primary"
          >
            Подтвердить номер в профиле
          </Link>
        )}

        {lastPrize && !spinning && (
          <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Твой последний приз:{" "}
            <span className="text-foreground">{lastPrize.title}</span>
          </p>
        )}

      </section>

      <WinModal
        prize={won}
        promoCode={wonPromo}
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
                    onClick={() => void claimMilestone(c.day)}
                    disabled={claiming !== null}
                    className="shrink-0 rounded-lg bg-primary px-2.5 py-1 font-display text-[10px] font-black uppercase text-primary-foreground transition-transform active:scale-[0.94] disabled:opacity-50"
                  >
                    {claiming === c.day ? "…" : "Забрать"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <HowItWorks season={state?.season} />

      {/* Пул призов */}
      <section aria-label="Что можно выиграть" className="mb-2">
        <h2 className="mb-3 px-1 text-[17px] font-semibold text-foreground">Что можно выиграть</h2>
        <ul className="overflow-hidden rounded-3xl bg-card">
          {VISIBLE.map((p, i) => (
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

      <CapsuleAbout />
    </main>
  );
}

/* ---------------- Описание капсулы ×2 ---------------- */

const CAPSULE_CHIP = RARITY.legend.chip;

function CapsuleAbout() {
  return (
    <section
      aria-label="Капсула ×2"
      className="relative mb-2 mt-5 overflow-hidden rounded-3xl bg-card p-4"
      style={{ boxShadow: `inset 0 0 0 1.5px ${RARITY.legend.ring}` }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{ background: `radial-gradient(110% 100% at 20% 0%, ${RARITY.legend.glow}, transparent 70%)` }}
      />

      <div className="relative flex items-center gap-3">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-black/40"
          style={{ boxShadow: `inset 0 0 0 1px ${RARITY.legend.ring}` }}
        >
          <img
            src={imgCapsule}
            alt="Капсула ×2"
            width={1024}
            height={1024}
            loading="lazy"
            className="h-[52px] w-[52px] animate-[hs-capsule-float_3s_ease-in-out_infinite] object-contain"
            style={{ filter: `drop-shadow(0 6px 16px ${RARITY.legend.glow})` }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="inline-block rounded-lg px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-tight text-black"
            style={{ background: CAPSULE_CHIP }}
          >
            Легенда
          </span>
          <span className="mt-1 block font-display text-[17px] font-black uppercase leading-tight tracking-tight text-foreground">
            Капсула ×2
          </span>
          <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            двойные билеты · 24 часа
          </span>
        </span>
      </div>

      <p className="relative mt-3 text-[13px] leading-relaxed text-muted-foreground">
        Выпала капсула — на <span className="text-foreground">24 часа</span> включается двойное
        начисление билетов. Покупаешь в магазине цифровой товар — билетов приходит{" "}
        <span className="text-foreground">в два раза больше</span>.
      </p>

      <ul className="relative mt-3 space-y-1.5">
        {[
          "Работает только на цифровые товары — открытки Hell",
          "На физический мерч и доставку не действует",
          "Одна капсула за раз, срок продлевается, а не суммируется",
          "Пока капсула активна, цифровые товары в магазине горят",
        ].map((t) => (
          <li key={t} className="flex gap-2 text-[12.5px] leading-snug text-muted-foreground">
            <span
              className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: CAPSULE_CHIP }}
            />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
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
  promoCode,
  open,
  onClose,
}: {
  prize: Prize | null;
  promoCode?: string | null;
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
  const capsule = prize.id === "boost_x2";

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
          {capsule && (
            <span
              className="pointer-events-none absolute inset-[-10px] animate-[hs-capsule-glow_2.2s_ease-in-out_infinite] rounded-full"
              style={{ boxShadow: `0 0 40px 6px ${r.glow}, inset 0 0 0 1px ${r.ring}` }}
            />
          )}
          <span className={capsule ? "animate-[hs-capsule-float_3s_ease-in-out_infinite]" : undefined}>
            <PrizeMedia prize={prize} size={96} />
          </span>
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
        {promoCode && (
          <>
            <p className="relative mx-auto mt-3 w-fit rounded-xl bg-black/40 px-3 py-2 font-mono text-[14px] font-bold tracking-widest text-foreground">
              {promoCode}
            </p>
            <p className="relative mt-2 text-[12px] leading-snug text-muted-foreground">
              {prize.id === "sticker"
                ? "Промокод на 100% скидку на ремувку. Оформи её в магазине — оплатишь только доставку."
                : "Промокод сохранён в профиле, вкладка «Промокоды»."}
            </p>
          </>
        )}


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

function HowItWorks({ season }: { season?: SpinState["season"] }) {
  const [open, setOpen] = useState(false);

  // Сезон приходит с бэка: начало, конец периода + число дней. Ничего не хардкодим.
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const startsLabel = season?.startsAt ? fmt(season.startsAt) : null;
  const endsLabel = season ? fmt(season.endsAt) : null;
  const days = season?.daysTotal ?? 30;
  const seasonLabel =
    startsLabel && endsLabel
      ? `Сезон ${startsLabel} — ${endsLabel} · ${days} дней`
      : endsLabel
        ? `Сезон до ${endsLabel} · ${days} дней`
        : `Сезон · ${days} дней`;

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
            {seasonLabel}
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
                {startsLabel && endsLabel ? (
                  <>
                    <span className="text-foreground">
                      Сезон идёт с {startsLabel} по {endsLabel}.
                    </span>{" "}
                  </>
                ) : (
                  endsLabel && (
                    <>
                      <span className="text-foreground">Сезон идёт до {endsLabel}.</span>{" "}
                    </>
                  )
                )}
                {days} дней, каждый день — новая пачка спинов. Не крутанул сегодня — завтра обнулилось.
              </p>
            </div>

            {/* Календарь активности */}
            <div>
              <h3 className="mb-1.5 font-display text-[13px] font-black uppercase tracking-tight text-foreground">
                Календарь активности
              </h3>
              <p className="mb-3 text-[13px] leading-relaxed text-muted-foreground">
                Каждый день, когда ты крутанул хотя бы один спин, засчитывается в календарь. Дни{" "}
                <span className="text-foreground">не обязательно подряд</span> — считаем сколько
                дней из {days} ты был активен. Награды забираются вручную кнопкой «Забрать».
              </p>
              <div className="space-y-1.5">
                {CALENDAR.map((c) => (
                  <div key={c.day} className="flex items-center gap-3 rounded-2xl bg-black/30 px-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/[0.06]">
                      <img
                        src={MILESTONE_IMG[c.day]}
                        alt=""
                        loading="lazy"
                        className={`h-full w-full ${
                          (MILESTONE_FIT[c.day] ?? "contain") === "cover"
                            ? "scale-[1.15] object-cover"
                            : "object-contain p-0.5"
                        }`}
                      />
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold text-foreground">
                      {c.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {c.day} дней
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                Носки приходят персональным промокодом на{" "}
                <span className="text-foreground">100% скидку</span> — одна пара любого размера,
                платишь только доставку.
              </p>
            </div>

            {/* Призы гарантированы */}
            <div>
              <h3 className="mb-2 font-display text-[13px] font-black uppercase tracking-tight text-foreground">
                Призы гарантированы
              </h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Призы гарантированно{" "}
                <span className="text-foreground">найдут своих владельцев</span> за {days} дней.
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

