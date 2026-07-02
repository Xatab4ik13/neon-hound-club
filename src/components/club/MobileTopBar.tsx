import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { PlumpBell as Bell, PlumpArrowLeft as ChevronLeft, PlumpCart } from "@/components/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { RANKS, getRankSpan, type RankId } from "@/data/ranks";
import type { RankMeta } from "@/data/ranks";
import { useCurrentRank } from "@/data/rank-state";
import { useCart } from "@/hooks/use-cart";
import { haptic } from "@/hooks/use-haptic";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { NotificationsSheet } from "./NotificationsSheet";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";

// Корни вкладок — на них back-arrow не показываем.
const TAB_ROOTS = new Set([
  "/club",
  "/club/shop",
  "/club/tickets",
  "/club/garage",
]);

function parentPath(pathname: string): string | null {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length <= 1) return null;
  segs.pop();
  return "/" + segs.join("/");
}


// Единый iOS-like top-bar для всех мобильных экранов клуба:
// [← back, на подстраницах] · аватар (→ профиль) · капсула HELL/XP (→ ранг) ·
// корзина (только в магазине) · колокольчик.
export function MobileTopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { rank, xp, xpMax, xpPct } = useCurrentRank();
  const viewer = useViewer();
  const myProfile = useMyProfile(viewer.isAuthed);
  const effectiveRank: RankMeta = useMemo(() => {
    const rid = myProfile.data?.rank?.rankId;
    if (rid) {
      const found = RANKS.find((r) => r.id === rid);
      if (found) return found;
    }
    return rank;
  }, [myProfile.data?.rank?.rankId, rank]);
  const avatarUrl = myProfile.data?.avatarUrl ?? null;
  const nick = myProfile.data?.nick ?? viewer.nick ?? "";
  const { count: cartCount } = useCart();
  const isShop = pathname.startsWith("/club/shop") || pathname.startsWith("/club/cart");
  const [notifOpen, setNotifOpen] = useState(false);
  const scrolled = useScrollCollapse(8);

  // Back-arrow показываем на всём, что не корень вкладки.
  const showBack = !TAB_ROOTS.has(pathname) && pathname !== "/club";

  // Bump бейджа при изменении count и glow при «приземлении» анимации.
  const prevCount = useRef(cartCount);
  const [bump, setBump] = useState(0);
  const [glow, setGlow] = useState(0);
  useEffect(() => {
    if (cartCount !== prevCount.current) {
      prevCount.current = cartCount;
      setBump((n) => n + 1);
    }
  }, [cartCount]);
  useEffect(() => {
    const onLanded = () => setGlow((n) => n + 1);
    window.addEventListener("hh:cart:landed", onLanded);
    return () => window.removeEventListener("hh:cart:landed", onLanded);
  }, []);

  const openNotif = () => {
    haptic("light");
    setNotifOpen(true);
  };

  const onBack = () => {
    haptic("light");
    const hasInAppHistory =
      typeof window !== "undefined" &&
      typeof window.history.state === "object" &&
      window.history.state !== null &&
      typeof (window.history.state as { __TSR_index?: number }).__TSR_index ===
        "number" &&
      (window.history.state as { __TSR_index?: number }).__TSR_index! > 0;

    if (hasInAppHistory) {
      router.history.back();
      return;
    }
    const segs = pathname.split("/").filter(Boolean);
    if (segs.length <= 1) {
      router.navigate({ to: "/club", replace: true });
      return;
    }
    segs.pop();
    router.navigate({ to: "/" + segs.join("/"), replace: true });
  };

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur-md transition-[background-color,border-color] duration-200 lg:hidden ${
        scrolled ? "border-b border-white/[0.06] bg-background/85" : "border-b border-transparent bg-background/55"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Back ← только на подстраницах */}
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Назад"
            className="grid h-10 w-10 shrink-0 place-items-center text-foreground transition-transform active:scale-90 active:opacity-60"
          >
            <ChevronLeft className="h-[26px] w-[26px]" strokeWidth={2.2} />
          </button>
        )}


        {/* Аватар → профиль */}
        <Link
          to="/club/me"
          aria-label="Профиль"
          className="relative grid h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/15 text-primary transition-transform active:scale-90"
          style={{ boxShadow: `0 0 0 2px ${effectiveRank.accentSoft}` }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : nick ? (
            <span className="grid h-full w-full place-items-center font-display text-[13px] font-black italic uppercase text-primary">
              {nick.slice(0, 2)}
            </span>
          ) : null}
        </Link>

        {/* Капсула HELL · XP → ранг */}
        <Link
          to="/club/me"
          aria-label={`Ранг: ${xp} из ${xpMax} XP`}
          className="relative flex h-10 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-full border border-white/[0.08] bg-[oklch(0.18_0.02_357.3)] px-4 text-foreground transition-transform active:scale-[0.98]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
            style={(() => {
              const a = effectiveRank.accent;
              const from = a.startsWith('var(')
                ? 'oklch(0.55 0.22 357.3)'
                : `color-mix(in oklab, ${a}, #000 25%)`;
              const to = a.startsWith('var(')
                ? 'oklch(0.72 0.26 357.3)'
                : a;
              return {
                width: `${xpPct}%`,
                background: `linear-gradient(90deg, ${from} 0%, ${to} 100%)`,
                boxShadow: `0 0 18px ${effectiveRank.accentSoft}`,
              };
            })()}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/3"
              style={{
                background:
                  "linear-gradient(110deg, transparent 20%, rgba(255,255,255,0.55) 50%, transparent 80%)",
                animation: "plaque-sweep 3.5s ease-in-out infinite",
                mixBlendMode: "screen",
              }}
            />
          </span>
          <span className="relative min-w-0 flex-1 truncate font-display text-[15px] font-black italic tracking-tight text-white">
            {nick || "—"}
          </span>
          <span className="relative ml-2 whitespace-nowrap font-mono text-[11px] font-bold tabular-nums">
            <span className="text-white">{xp.toLocaleString("ru-RU")}</span>
            {!isShop && (
              <span className="ml-1 text-white/60">/ {xpMax.toLocaleString("ru-RU")}</span>
            )}
            <span className="ml-1 text-white/60">XP</span>
          </span>
        </Link>

        {/* Корзина — только на страницах магазина */}
        {isShop && (
          <Link
            to="/club/cart"
            data-cart-anchor
            aria-label="Корзина"
            className="relative grid h-10 w-10 shrink-0 place-items-center text-foreground transition-transform active:scale-90 active:opacity-60"
          >
            <span key={`glow-${glow}`} className="absolute inset-0 hh-cart-glow" aria-hidden />
            <PlumpCart className="h-[22px] w-[22px]" strokeWidth={1.9} />
            {cartCount > 0 && (
              <span
                key={`badge-${bump}`}
                className="hh-cart-bump absolute right-0.5 top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        )}

        {/* Колокольчик */}
        <button
          type="button"
          onClick={openNotif}
          aria-label="Уведомления"
          className="relative grid h-10 w-10 shrink-0 place-items-center text-foreground transition-transform active:scale-90 active:opacity-60"
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={1.9} />
          {/* Красная точка зарезервирована под реальный счётчик непрочитанных.
              Пока такого источника нет — точку не показываем, чтобы не врать юзеру. */}
        </button>
      </div>
      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}

