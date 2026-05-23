import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Newspaper, Ticket, Bot, Settings, type LucideIcon } from "lucide-react";
import { HellhoundPlaqueLarge } from "@/components/club/HellhoundPlaque";
import { BloggerMobileTopBar } from "@/components/blogger/BloggerMobileTopBar";
import { BloggerMobileTabBar } from "@/components/blogger/BloggerMobileTabBar";
import { MobileTransition } from "@/components/club/MobileTransition";
import { PullToRefresh } from "@/components/club/PullToRefresh";
import { useBloggerProfile } from "@/data/blogger-profile";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/blogger")({
  head: () => ({
    meta: [
      { title: "Кабинет блогера — HELLHOUND" },
      { name: "description", content: "Личный кабинет блогера HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BloggerLayout,
});

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Лента", href: "/blogger", icon: Newspaper },
  { label: "Hell AI", href: "/blogger/hell-ai", icon: Bot },
  { label: "Розыгрыши", href: "/blogger/raffles", icon: Ticket },
  { label: "Настройки", href: "/blogger/settings", icon: Settings },
];

function BloggerLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const viewer = useViewer();
  const navigate = useNavigate();

  const goToSettings = () => navigate({ to: "/blogger/settings" });

  // В кабинет блогера пускаем только blogger/admin. Остальных — в /club или /login.
  useEffect(() => {
    if (!viewer.hydrated) return;
    if (!viewer.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (viewer.user.role !== "blogger" && viewer.user.role !== "admin") {
      navigate({ to: "/club", replace: true });
    }
  }, [viewer.hydrated, viewer.user, navigate]);

  if (!viewer.hydrated || !viewer.user || (viewer.user.role !== "blogger" && viewer.user.role !== "admin")) {
    return <div className="min-h-screen bg-background" />;
  }

  // Mobile shell — iOS-app feel: top bar + push/pop transition + bottom tab bar.
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <BloggerMobileTopBar onPlaqueClick={goToSettings} />
        <main
          className="relative"
          style={{ paddingBottom: "calc(52px + env(safe-area-inset-bottom) + 8px)" }}
        >
          <PullToRefresh>
            <MobileTransition>
              <Outlet />
            </MobileTransition>
          </PullToRefresh>
        </main>
        <BloggerMobileTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 22px)",
        }}
      />

      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-black/40 backdrop-blur-md lg:flex">
          <SidebarBody pathname={pathname} />
        </aside>

        <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMenuOpen(true)} onPlaqueClick={goToSettings} />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeIndex = NAV.findIndex((item) =>
    item.href === "/blogger" ? pathname === "/blogger" : pathname.startsWith(item.href),
  );
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute -right-16 -top-10 h-64 w-64 rounded-full bg-primary/60 blur-[100px]" />
        <div className="absolute -bottom-10 -left-16 h-64 w-64 rounded-full bg-primary/30 blur-[100px]" />
      </div>

      <div className="relative z-10 px-6 pb-3 pt-7">
        <Link to="/" onClick={onNavigate} className="block" aria-label="HELLHOUND home">
          <span
            className="block font-display text-3xl font-black tracking-tight text-foreground"
            style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 25%, transparent)" }}
          >
            HELL<span className="italic text-primary">HOUND</span>
          </span>
        </Link>
        <div className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
          Кабинет блогера
        </div>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-3">
          {NAV.map((item, idx) => {
            const isActive = idx === activeIndex;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onNavigate}
                  className="group relative flex h-14 items-center transition-transform duration-300 hover:translate-x-1"
                >
                  <div
                    aria-hidden
                    className={`absolute inset-0 -skew-x-12 transition-all duration-300 ${
                      isActive
                        ? "scale-x-[1.02] bg-primary shadow-[0_10px_24px_-6px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
                        : "border border-white/[0.08] bg-white/[0.02] group-hover:border-primary/60 group-hover:bg-white/[0.05]"
                    }`}
                  />
                  <div className="relative flex w-full items-center px-6">
                    <Icon
                      className={`mr-4 h-5 w-5 transition-colors ${
                        isActive ? "text-black" : "text-muted-foreground group-hover:text-primary"
                      }`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span
                      className={`font-display uppercase tracking-tighter transition-colors ${
                        isActive
                          ? "text-lg font-black italic text-black"
                          : "text-sm font-bold text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-primary via-primary/40 to-transparent opacity-60"
      />
    </>
  );
}

function MobileDrawer({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      className={`fixed inset-0 z-50 lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute left-0 top-0 flex h-full w-80 flex-col overflow-hidden border-r border-white/[0.06] bg-black transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarBody pathname={pathname} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function TopBar({ onMenu, onPlaqueClick }: { onMenu: () => void; onPlaqueClick: () => void }) {
  const profile = useBloggerProfile();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label="Открыть меню"
          className="flex h-10 w-10 items-center justify-center border border-white/[0.08] text-muted-foreground transition-colors hover:text-primary lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <HellhoundPlaqueLarge
          nick={profile.nick}
          initials={profile.initials}
          avatarUrl={profile.avatarUrl}
          onClick={onPlaqueClick}
        />

        <div className="flex-1" />
      </div>
    </header>
  );
}
