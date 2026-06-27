import { Link, useRouterState } from "@tanstack/react-router";
import { Newspaper, ShoppingBag, Ticket, Bike, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { haptic } from "@/hooks/use-haptic";

type Tab = {
  label: string;
  href: "/club" | "/club/shop" | "/club/tickets" | "/club/garage";
  icon: LucideIcon;
  exact?: boolean;
};

const TABS: Tab[] = [
  { label: "Лента", href: "/club", icon: Newspaper, exact: true },
  { label: "Магазин", href: "/club/shop", icon: ShoppingBag },
  { label: "Билеты", href: "/club/tickets", icon: Ticket },
  { label: "Гараж", href: "/club/garage", icon: Bike },
];


// Pathnames that should keep "More" highlighted as the active tab.
const MORE_PATHS = [
  "/club/hell-ai",
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

  const itemClass = (active: boolean) =>
    `relative flex h-full w-full flex-col items-center justify-center gap-1 transition-transform active:scale-[0.9] ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  const pillClass = (active: boolean) =>
    `flex h-9 w-14 items-center justify-center rounded-2xl transition-all duration-200 ${
      active
        ? "bg-[color-mix(in_oklab,var(--primary)_18%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
        : "bg-transparent"
    }`;

  return (
    <>
      <nav
        aria-label="Основная навигация"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-black/85 backdrop-blur-md lg:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <ul className="mx-auto flex h-[64px] max-w-xl items-stretch px-1">
          {TABS.map((tab) => {
            const active = isTabActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1">
                <Link
                  to={tab.href}
                  onClick={(e) => {
                    // iOS-стандарт: тап по активной вкладке — скролл наверх.
                    if (active) {
                      e.preventDefault();
                      haptic("light");
                      if (typeof window !== "undefined") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    } else {
                      haptic("selection");
                    }
                  }}
                  className={itemClass(active)}
                >
                  <span className={pillClass(active)}>
                    <Icon
                      className="h-[24px] w-[24px]"
                      strokeWidth={active ? 2.6 : 2}
                    />
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider ${
                      active ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {tab.label}
                  </span>
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
              className={itemClass(moreActive || moreOpen)}
              aria-label="Открыть остальную навигацию"
            >
              <span className={pillClass(moreActive || moreOpen)}>
                <MoreHorizontal
                  className="h-[24px] w-[24px]"
                  strokeWidth={moreActive || moreOpen ? 2.6 : 2}
                />
              </span>
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  moreActive || moreOpen ? "font-bold" : "font-semibold"
                }`}
              >
                Ещё
              </span>
            </button>
          </li>
        </ul>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
