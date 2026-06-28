// Нижний таб-бар для мобильной версии /blogger. 4 вкладки: Лента, Hell AI,
// Розыгрыши, Настройки. Стиль и поведение — как клубный MobileTabBar:
// стеклянный фон, pill-подсветка активной вкладки, haptic-фидбек.

import { Link, useRouterState } from "@tanstack/react-router";
import { Newspaper, Bot, PlumpTicket, Settings, type LucideIcon } from "@/components/ui/icons";
import { haptic } from "@/hooks/use-haptic";

type Tab = {
  label: string;
  href: "/blogger" | "/blogger/hell-ai" | "/blogger/raffles" | "/blogger/settings";
  icon: LucideIcon;
  exact?: boolean;
};

const TABS: Tab[] = [
  { label: "Лента", href: "/blogger", icon: Newspaper, exact: true },
  { label: "Hell AI", href: "/blogger/hell-ai", icon: Bot },
  { label: "Розыгрыши", href: "/blogger/raffles", icon: PlumpTicket },
  { label: "Настройки", href: "/blogger/settings", icon: Settings },
];

export function BloggerMobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isTabActive = (tab: Tab) =>
    tab.exact
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(tab.href + "/");

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
      </ul>
    </nav>
  );
}
