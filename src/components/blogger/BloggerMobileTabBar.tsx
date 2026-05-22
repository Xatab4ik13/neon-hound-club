// Нижний таб-бар для мобильной версии /blogger. 4 вкладки: Лента, Hell AI,
// Розыгрыши, Настройки.

import { Link, useRouterState } from "@tanstack/react-router";
import { Newspaper, Bot, Ticket, Settings, type LucideIcon } from "lucide-react";

type Tab = {
  label: string;
  href: "/blogger" | "/blogger/hell-ai" | "/blogger/raffles" | "/blogger/settings";
  icon: LucideIcon;
  exact?: boolean;
};

const TABS: Tab[] = [
  { label: "Лента", href: "/blogger", icon: Newspaper, exact: true },
  { label: "Hell AI", href: "/blogger/hell-ai", icon: Bot },
  { label: "Розыгрыши", href: "/blogger/raffles", icon: Ticket },
  { label: "Настройки", href: "/blogger/settings", icon: Settings },
];

export function BloggerMobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isTabActive = (tab: Tab) =>
    tab.exact
      ? pathname === tab.href
      : pathname === tab.href || pathname.startsWith(tab.href + "/");

  return (
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
      </ul>
    </nav>
  );
}
