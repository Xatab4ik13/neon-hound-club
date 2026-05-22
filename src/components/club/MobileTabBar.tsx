import { Link, useRouterState } from "@tanstack/react-router";
import { Newspaper, Bot, Ticket, Bike, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";

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
  "/club/hell-ai",
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-black/85 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex h-[52px] max-w-xl items-stretch">
          {TABS.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  to={tab.href}
                  className={`flex h-full flex-col items-center justify-center gap-0.5 transition-colors active:scale-[0.95] ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 1.9} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={`flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors active:scale-[0.95] ${
                moreActive || moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label="Открыть остальную навигацию"
            >
              <MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.4 : 1.9} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Ещё</span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
