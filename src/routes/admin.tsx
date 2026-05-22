// Admin layout: sidebar + topbar + light/dark toggle.
// Phase 1a: UI scaffold на мок-данных. Авторизация и БД подключим
// после согласования визуала.

import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Trophy,
  Users,
  ShoppingBag,
  Ticket,
  Newspaper,
  Wallet,
  Bot,
  GraduationCap,
  Package,
  Settings,
  Menu,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админка — HELLHOUND" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { to: "/admin/raffles", label: "Розыгрыши", icon: Trophy },
  { to: "/admin/quests", label: "Челленджи", icon: Target },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/shop", label: "Магазин", icon: ShoppingBag },
  { to: "/admin/tickets", label: "Билеты", icon: Ticket },
  { to: "/admin/news", label: "Новости", icon: Newspaper },
  { to: "/admin/economy", label: "Экономика", icon: Wallet },
  { to: "/admin/hell-ai", label: "Hell AI", icon: Bot },
  { to: "/admin/school", label: "Школа", icon: GraduationCap },
  { to: "/admin/cdek", label: "СДЭК", icon: Package },
  { to: "/admin/settings", label: "Настройки", icon: Settings },
];

function AdminLayout() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("admin-theme") as "light" | "dark" | null) ?? "dark";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className={cn(theme === "dark" ? "dark" : "")}>
      <div className="flex min-h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* Sidebar — desktop */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
          <SidebarBrand />
          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {NAV.map((item) => (
              <NavLink key={item.to} item={item} active={isActive(pathname, item.to)} />
            ))}
          </nav>
          <SidebarFooter />
        </aside>

        {/* Sidebar — mobile */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <SidebarBrand />
              <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
                {NAV.map((item) => (
                  <NavLink key={item.to} item={item} active={isActive(pathname, item.to)} />
                ))}
              </nav>
              <SidebarFooter />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900 md:px-6">
            <button
              type="button"
              className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Открыть меню"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 truncate text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {currentTitle(pathname)}
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-md p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Переключить тему"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />
            <div className="hidden text-right sm:block">
              <div className="text-xs font-medium">admin@hellhound</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Администратор</div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
        HH
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">HELLHOUND</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          admin
        </span>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <LogOut className="h-4 w-4" />
        На сайт
      </Link>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/admin") return pathname === "/admin";
  return pathname === to || pathname.startsWith(to + "/");
}

function currentTitle(pathname: string) {
  const match = NAV.find((i) => isActive(pathname, i.to));
  return match?.label ?? "Админ";
}
