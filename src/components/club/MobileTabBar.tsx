import { Link, useRouterState } from "@tanstack/react-router";
import { Newspaper, Bot, Ticket, Bike, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { haptic } from "@/hooks/use-haptic";

type Tab = {
  label: string;
  href: "/club" | "/club/hell-ai" | "/club/tickets" | "/club/garage";
  icon: LucideIcon;
  exact?: boolean;
};

const TABS: Tab[] = [
  { label: "Лента", href: "/club", icon: Newspaper, exact: true },
  { label: "Hell AI", href: "/club/hell-ai", icon: Bot },
  { label: "Билеты", href: "/club/tickets", icon: Ticket },
  { label: "Гараж", href: "/club/garage", icon: Bike },
];


// Pathnames that should keep "More" highlighted as the active tab.
const MORE_PATHS = [
  "/club/orders",
  "/club/rank",
  "/club/quests",
  "/club/raffles",
  "/club/invite",
  "/club/hell-pass",
  "/club/school",
];

export function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const isTabActive = (tab: Tab) =>
    tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith(tab.href + "/");
  const moreActive = MORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <>
      <nav
        aria-label="Основная навигация"
        // iOS translucent tab bar: насыщённый backdrop-blur + тонкая верхняя линия.
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.05] bg-black/70 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
        }}
      >
        <ul className="mx-auto flex h-[50px] max-w-xl items-stretch">
          {TABS.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  to={tab.href}
                  onClick={() => {
                    if (!active) haptic("selection");
                  }}
                  className={`relative flex h-full flex-col items-center justify-center gap-0.5 transition-transform active:scale-[0.92] ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                  {active && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute bottom-0.5 h-[3px] w-[3px] rounded-full bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                    />
                  )}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setMoreOpen(true);
              }}
              className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-transform active:scale-[0.92] ${
                moreActive || moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label="Открыть остальную навигацию"
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.4 : 1.9} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Ещё</span>
              {(moreActive || moreOpen) && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0.5 h-[3px] w-[3px] rounded-full bg-primary shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                />
              )}
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
