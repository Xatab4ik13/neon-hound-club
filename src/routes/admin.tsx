// Admin layout: sidebar + topbar + light/dark toggle.
// Гейт: пускает только role === "admin". Иначе — форма входа прямо на /admin.

import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  LayoutDashboard,
  Trophy,
  Target,
  PlumpUsers as Users,
  PlumpStore,
  PlumpTicket,
  PlumpImage as ImageIcon,
  PlumpFeed,
  Wallet,
  Bot,
  GraduationCap,
  PlumpPackage as Package,
  Settings,
  Menu,
  Sun,
  Moon,
  LogOut,
  Loader2,
  LifeBuoy,
  Newspaper,
  Crown,
} from "@/components/ui/icons";

import { cn } from "@/lib/utils";
import { AdminViewerProvider, useAdminViewer } from "@/hooks/use-admin-viewer";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Админка — HELLHOUND" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoot,
});

function AdminRoot() {
  // Админский контекст изолирован от клубного useViewer — отдельная cookie
  // hh_admin_sid, отдельные роуты /api/v1/auth/admin/*. Вход сюда НЕ создаёт
  // сессию в клубе и наоборот.
  return (
    <AdminViewerProvider>
      <AdminGate />
    </AdminViewerProvider>
  );
}

function AdminGate() {
  const { hydrated, isAuthed, user } = useAdminViewer();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAuthed || user?.role !== "admin") {
    return <AdminLogin />;
  }

  return <AdminLayout />;
}

function AdminLogin() {
  const { signIn } = useAdminViewer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message || "Неверный email или пароль"
          : "Не удалось войти";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4 text-zinc-100">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-6"
        >
          <div>
            <div className="text-lg font-semibold">Вход в админку</div>
            <div className="mt-1 text-xs text-zinc-400">
              Только для администраторов HELLHOUND.
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-zinc-400">Email</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-zinc-400">Пароль</label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}


type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV: NavItem[] = [
  { to: "/admin", label: "Дашборд", icon: LayoutDashboard },
  { to: "/admin/raffles", label: "Розыгрыши", icon: Trophy },
  { to: "/admin/quests", label: "Челленджи", icon: Target },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/feed", label: "Лента", icon: PlumpFeed },
  { to: "/admin/news", label: "Новости", icon: Newspaper },
  { to: "/admin/shop", label: "Магазин", icon: PlumpStore },

  { to: "/admin/orders", label: "Заказы", icon: Package },
  { to: "/admin/tickets", label: "Билеты", icon: PlumpTicket },
  { to: "/admin/support", label: "Помощь", icon: LifeBuoy },
  { to: "/admin/banners", label: "Баннеры", icon: ImageIcon },

  
  { to: "/admin/economy", label: "Экономика", icon: Wallet },
  { to: "/admin/hell-ai", label: "Hell AI", icon: Bot },
  { to: "/admin/school", label: "Школа", icon: GraduationCap },
  { to: "/admin/cdek", label: "СДЭК", icon: Package },
  { to: "/admin/settings", label: "Настройки", icon: Settings },
];

function AdminLayout() {
  const { user, signOut } = useAdminViewer();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("admin-theme") as "light" | "dark" | null) ?? "dark";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Тема применяется на <html>, чтобы порталы (модалки, шторки)
  // тоже подхватывали dark-вариант — иначе они остаются белыми.
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("admin-theme", theme);
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("hh-admin");
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    return () => {
      root.classList.remove("hh-admin");
      if (!hadDark) root.classList.remove("dark");
    };
  }, [theme]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:flex">
        <SidebarBrand />
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV.map((item) => (
            <NavLink key={item.to} item={item} active={isActive(pathname, item.to)} />
          ))}
        </nav>
        <SidebarFooter onSignOut={handleSignOut} signingOut={signingOut} />
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
            <SidebarFooter onSignOut={handleSignOut} signingOut={signingOut} />
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
            <div className="text-xs font-medium">{user?.email ?? "—"}</div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Администратор</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="hidden rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-rose-400 sm:inline-flex"
            aria-label="Выйти из админки"
            title="Выйти"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
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

function SidebarFooter({
  onSignOut,
  signingOut,
}: {
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <div className="space-y-1 border-t border-zinc-200 p-2 dark:border-zinc-800">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <LogOut className="h-4 w-4" />
        На сайт
      </Link>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
      >
        {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
        Выйти из админки
      </button>
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
