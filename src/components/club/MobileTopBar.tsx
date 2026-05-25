import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronLeft, PawPrint, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { ME } from "@/data/profile";
import { useCurrentRank } from "@/data/rank-state";
import { useCart } from "@/hooks/use-cart";
import { haptic } from "@/hooks/use-haptic";
import { useScrollCollapse } from "@/hooks/use-scroll-collapse";

import { NotificationsSheet } from "./NotificationsSheet";




// Routes that act as primary tabs — no back button, show avatar instead.
const TAB_PATHS = ["/club", "/club/garage", "/club/tickets", "/club/me"];

// Map pathname → compact title shown in the top bar.
function titleFor(pathname: string): string {
  if (pathname === "/club") return "Лента";
  if (pathname.startsWith("/club/garage")) return "Гараж";
  if (pathname.startsWith("/club/tickets")) return "Билеты";
  if (pathname.startsWith("/club/shop")) return "Магазин";
  if (pathname.startsWith("/club/orders")) return "Заказы";
  if (pathname.startsWith("/club/rank")) return "Ранг";
  if (pathname.startsWith("/club/quests")) return "Квесты";
  if (pathname.startsWith("/club/raffles")) return "Розыгрыши";
  if (pathname.startsWith("/club/invite")) return "Пригласить";
  if (pathname.startsWith("/club/hell-ai")) return "Hell AI";
  if (pathname.startsWith("/club/hell-pass")) return "Hell Pass";
  if (pathname.startsWith("/club/school")) return "Школа";
  if (pathname.startsWith("/club/u/")) return "Профиль";
  if (pathname === "/club/me") return ME.nick;
  return "Клуб";
}

export function MobileTopBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const { rank, xp, xpMax } = useCurrentRank();
  const { count: cartCount } = useCart();
  const isTab = TAB_PATHS.includes(pathname);
  const isShop = pathname.startsWith("/club/shop");
  const title = titleFor(pathname);
  // iOS-style: titlle в навбаре появляется только после скролла большого заголовка.
  const scrolled = useScrollCollapse(40);
  const [notifOpen, setNotifOpen] = useState(false);

  const openNotif = () => {
    haptic("light");
    setNotifOpen(true);
  };

  const handleBack = () => {
    haptic("light");
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/club" });
    }
  };


  // On primary tabs — компактная плашка как на скрине:
  // круглая розовая лапка + капсула HELL/XP + колокольчик.
  if (isTab) {
    return (
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Лапка-аватар → профиль */}
          <Link
            to="/club/me"
            aria-label="Профиль"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary transition-transform active:scale-90"
          >
            <PawPrint className="h-[18px] w-[18px]" strokeWidth={2.4} fill="currentColor" />
          </Link>

          {/* Капсула HELL · XP → ранг */}
          <Link
            to="/club/rank"
            aria-label={`Ранг: ${xp} из ${xpMax} XP`}
            className="relative flex h-10 min-w-0 flex-1 items-center justify-between overflow-hidden rounded-full px-4 text-primary-foreground transition-transform active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.55 0.22 357.3) 0%, oklch(0.72 0.26 357.3) 50%, oklch(0.55 0.22 357.3) 100%)",
              boxShadow: "0 4px 18px rgba(255,45,149,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            {/* Переливающийся блик */}
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
            <span className="relative font-display text-[15px] font-black italic tracking-tight">
              HELL
            </span>
            <span className="relative whitespace-nowrap font-mono text-[12px] font-bold tabular-nums">
              <span className="text-white">{xp.toLocaleString("ru-RU")}</span>
              <span className="ml-1 text-white/60">/ {xpMax.toLocaleString("ru-RU")} XP</span>
            </span>
          </Link>

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

  // Nested routes — iOS-style back chevron + centered title + bell.
  // Suppress rank reference so we don't warn about unused vars on this branch.
  void rank; void xp; void xpMax;

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative flex h-11 items-center px-3">
        <div className="flex w-20 items-center">
          <button
            type="button"
            onClick={handleBack}
            className="-ml-1 flex h-8 items-center pl-1 pr-2 text-primary active:opacity-60"
            aria-label="Назад"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
            <span className="font-medium text-[15px]">Назад</span>
          </button>
        </div>

        <h1
          className="pointer-events-none absolute left-1/2 max-w-[55%] -translate-x-1/2 overflow-hidden text-ellipsis whitespace-nowrap pr-[3px] font-display text-[16px] font-black italic uppercase tracking-tight transition-all duration-200"
          style={{
            opacity: scrolled ? 1 : 0,
            transform: `translate(-50%, ${scrolled ? "0" : "4px"})`,
          }}
        >
          {title}
        </h1>


        <div className="ml-auto flex w-20 items-center justify-end gap-1">
          {isShop && (
            <Link
              to="/club/cart"
              aria-label="Корзина"
              className="relative flex h-8 w-8 items-center justify-center text-foreground active:opacity-60"
            >
              <ShoppingBag className="h-[20px] w-[20px]" strokeWidth={1.9} />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-[16px] min-w-[16px] place-items-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          )}
          <button
            type="button"
            onClick={openNotif}
            aria-label="Уведомления"
            className="relative flex h-8 w-8 items-center justify-center text-foreground transition-transform active:scale-[0.9] active:opacity-60"
          >
            <Bell className="h-[20px] w-[20px]" strokeWidth={1.9} />
            <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </div>
      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}

