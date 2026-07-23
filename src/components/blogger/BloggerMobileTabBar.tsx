// Нижний таб-бар для мобильной версии /blogger. 4 вкладки + «Ещё»:
// Лента, VIP чат, Розыгрыши, Ещё (Hell AI + Настройки).

import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Newspaper, PlumpChat, PlumpTicket, PlumpMore, type LucideIcon } from "@/components/ui/icons";
import { haptic } from "@/hooks/use-haptic";
import { BloggerMoreSheet } from "./BloggerMoreSheet";

type TabIcon = LucideIcon | React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Tab = {
  label: string;
  href: "/blogger" | "/club/vip-chat" | "/blogger/raffles";
  icon: TabIcon;
  exact?: boolean;
};

const TABS: Tab[] = [
  { label: "Лента", href: "/blogger", icon: Newspaper, exact: true },
  { label: "VIP чат", href: "/club/vip-chat", icon: PlumpChat },
  { label: "Розыгрыши", href: "/blogger/raffles", icon: PlumpTicket },
];

const MORE_PATHS = ["/blogger/hell-ai", "/blogger/settings"];

export function BloggerMobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  const isTabActive = (tab: Tab) =>
    tab.exact
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(tab.href + "/");
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-black/75 backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
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
                  onClick={() => {
                    if (!active) haptic("selection");
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
                <PlumpMore
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

      <BloggerMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
