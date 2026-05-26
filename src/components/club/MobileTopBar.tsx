import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { RANKS } from "@/data/ranks";
import type { RankMeta } from "@/data/ranks";
import { useCurrentRank } from "@/data/rank-state";
import { useCart } from "@/hooks/use-cart";
import { haptic } from "@/hooks/use-haptic";
import { useViewer } from "@/hooks/use-viewer";
import { useMyProfile } from "@/lib/garage-api";
import { NotificationsSheet } from "./NotificationsSheet";

// Единый iOS-like top-bar для всех мобильных экранов клуба:
// аватар (→ профиль) · капсула HELL/XP (→ ранг) · корзина (только в магазине) · колокольчик.
// Кнопки «Назад» нет — навигация системным swipe-back + нижним таб-баром.
export function MobileTopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  const openNotif = () => {
    haptic("light");
    setNotifOpen(true);
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
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
          <span className="relative truncate font-display text-[15px] font-black italic tracking-tight text-white">
            {nick || "—"}
          </span>
          <span className="relative whitespace-nowrap font-mono text-[12px] font-bold tabular-nums">
            <span className="text-white">{xp.toLocaleString("ru-RU")}</span>
            <span className="ml-1 text-white/60">/ {xpMax.toLocaleString("ru-RU")} XP</span>
          </span>
        </Link>

        {/* Корзина — только на страницах магазина */}
        {isShop && (
          <Link
            to="/club/cart"
            aria-label="Корзина"
            className="relative grid h-10 w-10 shrink-0 place-items-center text-foreground transition-transform active:scale-90 active:opacity-60"
          >
            <ShoppingBag className="h-[22px] w-[22px]" strokeWidth={1.9} />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background">
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
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"
          />
        </button>
      </div>
      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}

