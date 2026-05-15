import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Newspaper,
  Wrench,
  Ticket,
  ShoppingBag,
  GraduationCap,
  Gem,
  type LucideIcon,
} from "lucide-react";
import { ME } from "@/data/profile";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Клуб HELLHOUND" },
      { name: "description", content: "Внутренний клуб HELLHOUND Racing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubLayout,
});

// ---------- Nav ----------

const NAV: { label: string; href: string; icon: LucideIcon; final?: boolean }[] = [
  { label: "Лента", href: "/club", icon: Newspaper },
  { label: "Мой Гараж", href: "/club/garage", icon: Wrench },
  { label: "Розыгрыши", href: "/club/raffles", icon: Ticket },
  { label: "Магазин", href: "/shop", icon: ShoppingBag },
  { label: "Школа", href: "/school", icon: GraduationCap },
  { label: "Hell Pass", href: "/hell-pass", icon: Gem, final: true },
];

// ---------- Layout ----------

function ClubLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

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
          <TopBar onMenu={() => setMenuOpen(true)} />
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------

function SidebarBody({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const activeIndex = NAV.findIndex((item) =>
    item.href === "/club" ? pathname === "/club" : pathname.startsWith(item.href),
  );
  return (
    <>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute -right-16 -top-10 h-64 w-64 rounded-full bg-primary/60 blur-[100px]" />
        <div className="absolute -bottom-10 -left-16 h-64 w-64 rounded-full bg-primary/30 blur-[100px]" />
      </div>

      <div className="relative z-10 px-6 pb-5 pt-7">
        <Link to="/" onClick={onNavigate} className="block" aria-label="HELLHOUND home">
          <span
            className="block font-display text-3xl font-black tracking-tight text-foreground"
            style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 25%, transparent)" }}
          >
            HELL<span className="italic text-primary">HOUND</span>
          </span>
        </Link>
      </div>

      <nav className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
        <ul className="flex flex-col gap-3">
          {NAV.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isFinal = item.final;
            const Icon = item.icon;

            if (isFinal) {
              return (
                <li key={item.href} className="mt-2">
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    className="group relative flex h-16 items-center transition-transform duration-300 hover:translate-x-1"
                  >
                    <div
                      aria-hidden
                      className={`absolute inset-0 -skew-x-12 border-r-4 border-primary bg-gradient-to-r from-primary/40 to-black transition-all duration-300 ${
                        isActive ? "from-primary/60" : "group-hover:from-primary/55"
                      }`}
                    />
                    <div className="relative flex w-full items-center px-6">
                      <Icon
                        className={`mr-4 h-5 w-5 transition-colors ${
                          isActive ? "text-foreground" : "text-primary group-hover:text-foreground"
                        }`}
                        strokeWidth={2}
                      />
                      <span
                        className={`font-display text-sm font-black uppercase italic tracking-widest transition-colors ${
                          isActive ? "text-foreground" : "text-primary group-hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            }

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
                        isActive
                          ? "text-black"
                          : "text-muted-foreground group-hover:text-primary"
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

// ---------- Top bar ----------

function TopBar({ onMenu }: { onMenu: () => void }) {
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

        <div className="flex-1" />

        <button
          type="button"
          aria-label="Уведомления"
          className="relative hidden h-10 w-10 items-center justify-center border border-white/[0.08] text-muted-foreground transition-colors hover:text-primary md:flex"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21a2 2 0 004 0" />
          </svg>
          <span aria-hidden className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </button>

        <ProfilePlaque compact bg="captain-speedlines" />
      </div>
    </header>
  );
}

// ---------- Profile plaque ----------

export type PlaqueBg =
  | "rider"
  | "pit-diamond"
  | "pit-carbon"
  | "pit-hazard"
  | "captain-speedlines"
  | "captain-sweep"
  | "captain-halftone"
  | "alpha-aurora"
  | "alpha-grid"
  | "alpha-claw";

type PlaqueVariant = {
  base: string;
  decor?: () => React.ReactNode;
};

const PLAQUE_BG: Record<PlaqueBg, PlaqueVariant> = {
  rider: { base: "bg-[#0f0f0f]" },
  "pit-diamond": {
    base: "bg-[#141414]",
    decor: () => (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'><path d='M0 14 L14 0 L16 2 L2 16 Z M12 28 L26 14 L28 16 L14 30 Z' fill='%23ffffff' fill-opacity='0.08'/></svg>\")",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.04] via-transparent to-primary/[0.10]"
        />
      </>
    ),
  },
  "pit-carbon": {
    base: "bg-[#0d0d0d]",
    decor: () => (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 4px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/[0.12]" />
      </>
    ),
  },
  "pit-hazard": {
    base: "bg-[#0f0f0f]",
    decor: () => (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 10px, transparent 10px 22px)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/[0.06] via-transparent to-transparent" />
      </>
    ),
  },

  // ---- Road Captain (3 концепта) ----
  "captain-speedlines": {
    base: "bg-[#0a0a0a]",
    decor: () => (
      <>
        {/* dark asphalt base + radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 180% at 100% 50%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 55%), #0a0a0a",
          }}
        />
        {/* moving speedlines */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 2px, transparent 2px 80px), repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)",
            backgroundSize: "200px 100%, 80px 100%",
            animation: "plaque-speedlines 1.6s linear infinite",
            maskImage:
              "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%)",
          }}
        />
      </>
    ),
  },
  "captain-sweep": {
    base: "bg-[#101010]",
    decor: () => (
      <>
        {/* brushed metal */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* slow chrome sweep */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 45%, color-mix(in oklab, var(--primary) 60%, transparent) 55%, transparent 100%)",
            animation: "plaque-sweep 4s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/[0.10]" />
      </>
    ),
  },
  "captain-halftone": {
    base: "bg-[#0c0c0c]",
    decor: () => (
      <>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--primary) 70%, white 20%) 1px, transparent 1.6px)",
            backgroundSize: "10px 10px",
            animation: "plaque-halftone 3.2s ease-in-out infinite",
            maskImage:
              "linear-gradient(105deg, transparent 0%, #000 35%, #000 65%, transparent 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-primary/[0.12]" />
      </>
    ),
  },
};

export function ProfilePlaque({
  compact = false,
  onNavigate,
  bg = "rider",
}: {
  compact?: boolean;
  onNavigate?: () => void;
  bg?: PlaqueBg;
}) {
  const variant = PLAQUE_BG[bg];
  const xpPct = Math.round((ME.xp / ME.xpMax) * 100);
  const size = compact ? 44 : 56;

  return (
    <Link
      to="/club/me"
      onClick={onNavigate}
      aria-label={`Профиль ${ME.nick}, ${ME.rank}, ${ME.xp} из ${ME.xpMax} XP`}
      className="group relative flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: compact ? "360px" : "100%" }}
    >
      <div
        className="relative shrink-0 rounded-full bg-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background transition-all group-hover:ring-primary group-hover:shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
        style={{ height: `${size}px`, width: `${size}px` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
            backgroundSize: "4px 4px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-display font-black italic uppercase text-black ${
              compact ? "text-base" : "text-lg"
            }`}
          >
            {ME.nick.slice(0, 2)}
          </span>
        </div>
      </div>

      <div
        className={`relative flex h-full min-w-0 flex-1 flex-col justify-center overflow-hidden ${variant.base} py-2 pl-4 pr-6`}
        style={{
          height: `${size}px`,
          clipPath: "polygon(0 0, 96% 0, 100% 50%, 96% 100%, 0 100%)",
        }}
      >
        {variant.decor?.()}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.04] to-primary/15 opacity-0 transition-opacity group-hover:opacity-100"
        />

        <div className="relative flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate font-display font-black italic uppercase tracking-tight text-foreground transition-colors group-hover:text-primary ${
              compact ? "text-[15px]" : "text-[17px]"
            }`}
          >
            {ME.nick}
          </span>
        </div>

        <div className="relative mt-1.5 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-neutral-900/80 ring-1 ring-inset ring-white/5">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent 0, rgba(255,255,255,0.04) 50%, transparent 100%)",
              }}
            />
            <div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-sm bg-primary"
              style={{
                width: `${xpPct}%`,
                animation: "xp-pulse 2.4s ease-in-out infinite",
              }}
            >
              <div
                aria-hidden
                className="absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                  animation: "xp-shimmer 2.8s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          <div className="flex items-baseline whitespace-nowrap font-mono text-[10px] font-bold tabular-nums text-neutral-500">
            <span className="text-foreground">{ME.xp}</span>
            <span className="mx-0.5 opacity-30">/</span>
            <span>{ME.xpMax}</span>
            <span className="ml-1 font-extrabold text-primary">XP</span>
          </div>

          <div className="flex h-3 shrink-0 items-center border-l-2 border-primary pl-1.5">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary">
              {ME.rank}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
