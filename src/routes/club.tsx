import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import {
  Newspaper,
  Bot,
  Ticket,
  ShoppingBag,
  GraduationCap,
  Gem,
  type LucideIcon,
} from "lucide-react";
import { ME } from "@/data/profile";
import { type PlaqueBg } from "@/data/ranks";
import { useCurrentRank } from "@/data/rank-state";

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
  { label: "Школа", href: "/club/school", icon: GraduationCap },
  { label: "Hell Pass", href: "/club/hell-pass", icon: Gem, final: true },
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

        <ProfilePlaque compact />
      </div>
    </header>
  );
}

// ---------- Profile plaque ----------

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

  // ---- Alpha Hound (3 концепта, "вау" нарастает) ----
  "alpha-aurora": {
    base: "bg-[#0a0510]",
    decor: () => (
      <>
        {/* aurora gradient — два пятна дрейфуют */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(50% 140% at 20% 50%, color-mix(in oklab, var(--primary) 55%, transparent), transparent 70%), radial-gradient(45% 130% at 80% 50%, color-mix(in oklab, #b026ff 65%, transparent), transparent 70%)",
            backgroundSize: "200% 100%, 200% 100%",
            animation: "plaque-aurora 8s ease-in-out infinite",
            mixBlendMode: "screen",
            opacity: 0.85,
          }}
        />
        {/* тонкий шум-сетка */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)",
          }}
        />
        {/* верхний vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
      </>
    ),
  },
  "alpha-grid": {
    base: "bg-[#070710]",
    decor: () => (
      <>
        {/* перспективная неон-сетка */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklab, var(--primary) 70%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--primary) 70%, transparent) 1px, transparent 1px)",
            backgroundSize: "26px 100%, 100% 14px",
            maskImage:
              "linear-gradient(180deg, transparent 0%, #000 35%, #000 65%, transparent 100%)",
            animation: "plaque-grid-pulse 2.4s ease-in-out infinite",
          }}
        />
        {/* розовый горизонт */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 90%, white) 50%, transparent)",
            boxShadow:
              "0 0 8px color-mix(in oklab, var(--primary) 80%, transparent), 0 0 16px color-mix(in oklab, var(--primary) 60%, transparent)",
          }}
        />
        {/* угловое свечение */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/40 blur-3xl" />
      </>
    ),
  },
  "alpha-claw": {
    base: "bg-[#0a0a0a]",
    decor: () => (
      <>
        {/* тёмная фактура */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 140% at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 5px)",
          }}
        />
        {/* три когтя — расходящиеся линии справа */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-[10%] flex flex-col justify-center gap-[6px]"
        >
          <span className="block h-[2px] w-16 bg-gradient-to-l from-primary via-primary/60 to-transparent shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_80%,transparent)]" />
          <span className="block h-[2px] w-20 bg-gradient-to-l from-primary via-primary/60 to-transparent shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_80%,transparent)]" />
          <span className="block h-[2px] w-14 bg-gradient-to-l from-primary via-primary/60 to-transparent shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_80%,transparent)]" />
        </div>
        {/* световой удар */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 70%, white) 50%, transparent)",
            filter: "blur(4px)",
            mixBlendMode: "screen",
            animation: "plaque-claw 3.2s ease-in-out infinite",
          }}
        />
      </>
    ),
  },

  // ---- Hell Legend (3 концепта, "вау") ----
  "legend-inferno": {
    base: "bg-[#0a0303]",
    decor: () => (
      <>
        {/* тёмный жар-фон */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 100% at 50% 110%, color-mix(in oklab, var(--primary) 70%, #ff3b00) 0%, color-mix(in oklab, var(--primary) 35%, transparent) 25%, transparent 60%)",
          }}
        />
        {/* пламя — нижняя кромка */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
          style={{
            background:
              "linear-gradient(to top, color-mix(in oklab, var(--primary) 90%, #ff5a00) 0%, color-mix(in oklab, var(--primary) 60%, transparent) 35%, transparent 100%)",
            filter: "blur(6px)",
            animation: "plaque-flame 1.6s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />
        {/* искры */}
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute bottom-1 h-[3px] w-[3px] rounded-full bg-white shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_90%,white)]"
            style={{
              left: `${15 + i * 17}%`,
              animation: `plaque-ember ${1.8 + i * 0.4}s ${i * 0.3}s ease-out infinite`,
            }}
          />
        ))}
        {/* верхний vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
      </>
    ),
  },
  "legend-storm": {
    base: "bg-[#050008]",
    decor: () => (
      <>
        {/* грозовое облако */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 120% at 30% 30%, rgba(60, 20, 80, 0.55), transparent 60%), radial-gradient(80% 120% at 70% 70%, rgba(20, 0, 40, 0.7), transparent 60%)",
            animation: "plaque-storm-bg 5s linear infinite",
          }}
        />
        {/* статичная фактура */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 4px)",
          }}
        />
        {/* молния — белая зигзаг-полоса */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2"
          style={{
            background:
              "linear-gradient(to bottom, transparent, white 30%, color-mix(in oklab, var(--primary) 90%, white) 60%, transparent)",
            transform: "translateX(-50%) skewX(-12deg)",
            filter: "blur(0.5px) drop-shadow(0 0 12px white) drop-shadow(0 0 20px color-mix(in oklab, var(--primary) 80%, transparent))",
            animation: "plaque-lightning 5s linear infinite",
          }}
        />
        {/* розовая аура */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
      </>
    ),
  },
  "legend-chrome": {
    base: "bg-[#080008]",
    decor: () => (
      <>
        {/* конический ореол вращается */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[40%]"
          style={{
            background:
              "conic-gradient(from 0deg, color-mix(in oklab, var(--primary) 80%, transparent), transparent 25%, color-mix(in oklab, #b026ff 70%, transparent) 50%, transparent 75%, color-mix(in oklab, var(--primary) 80%, transparent))",
            animation: "plaque-conic 6s linear infinite",
            filter: "blur(20px)",
            opacity: 0.55,
          }}
        />
        {/* жидкий хром */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(110deg, color-mix(in oklab, var(--primary) 70%, transparent) 0%, rgba(255,255,255,0.35) 25%, color-mix(in oklab, #b026ff 60%, transparent) 50%, rgba(255,255,255,0.35) 75%, color-mix(in oklab, var(--primary) 70%, transparent) 100%)",
            backgroundSize: "200% 100%",
            animation: "plaque-chrome 4s linear infinite",
            mixBlendMode: "overlay",
          }}
        />
        {/* затемнение для читаемости текста */}
        <div className="pointer-events-none absolute inset-0 bg-black/40" />
      </>
    ),
  },

  // ---- Hell Legend · расширенные «вау» концепты ----
  "legend-molten-gold": {
    base: "bg-[#0a0600]",
    decor: () => (
      <>
        {/* глубокая лава снизу */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 115%, #ffb648 0%, #ff5a00 18%, #7a1a00 40%, transparent 70%)",
            animation: "plaque-lava-pulse 4s ease-in-out infinite",
          }}
        />
        {/* трещины расплавленного золота */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(2px 60% at 22% 50%, #ffcf6b 0%, transparent 70%), radial-gradient(2px 80% at 58% 60%, #ffb648 0%, transparent 70%), radial-gradient(2px 50% at 82% 40%, #ffe28a 0%, transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
        {/* золотой шиммер-свип */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255, 215, 120, 0.55) 48%, rgba(255, 245, 200, 0.85) 50%, rgba(255, 215, 120, 0.55) 52%, transparent 65%, transparent 100%)",
            backgroundSize: "250% 100%",
            animation: "plaque-gold-sweep 6s linear infinite",
            mixBlendMode: "screen",
          }}
        />
        {/* верхний vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/30" />
      </>
    ),
  },
  "legend-cyber-rune": {
    base: "bg-[#02020a]",
    decor: () => (
      <>
        {/* двойная неоновая засветка: cyan слева, magenta справа */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 100% at 0% 50%, rgba(0, 220, 255, 0.45), transparent 55%), radial-gradient(80% 100% at 100% 50%, rgba(255, 40, 200, 0.5), transparent 55%)",
          }}
        />
        {/* техно-сетка с перспективой */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,180,0.18) 1px, transparent 1px)",
            backgroundSize: "22px 22px, 22px 22px",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 35%, black 100%)",
          }}
        />
        {/* двигающаяся скан-линия */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,255,255,0.95), transparent)",
            boxShadow: "0 0 12px rgba(0,255,255,0.9)",
            animation: "plaque-scan 2.8s linear infinite",
          }}
        />
        {/* glitch-блок */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-[35%] w-[2px]"
          style={{
            background: "linear-gradient(to bottom, #ff28c8, transparent, #00e5ff)",
            animation: "plaque-glitch 4s steps(1) infinite",
            mixBlendMode: "screen",
          }}
        />
        {/* читаемость */}
        <div className="pointer-events-none absolute inset-0 bg-black/35" />
      </>
    ),
  },
  "legend-holo-prism": {
    base: "bg-[#050008]",
    decor: () => (
      <>
        {/* радужный голо-фон */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(115deg, #ff3df0 0%, #ffb547 18%, #f5ff5a 36%, #45ffb0 54%, #45c8ff 72%, #b65aff 90%, #ff3df0 100%)",
            backgroundSize: "200% 100%",
            animation: "plaque-holo 6s linear infinite",
            opacity: 0.85,
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[40%]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,255,255,0.0), rgba(255,255,255,0.45), rgba(255,255,255,0.0) 25%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.0) 75%, rgba(255,255,255,0.45))",
            animation: "plaque-prism-rotate 9s linear infinite",
            filter: "blur(24px)",
            mixBlendMode: "overlay",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.55) 52%, transparent 70%)",
            backgroundSize: "220% 100%",
            animation: "plaque-gold-sweep 4.2s linear infinite",
            mixBlendMode: "screen",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-black/45" />
      </>
    ),
  },

  // ---- VIP · 3 «вау» концепта (платный ранг) ----
  "vip-platinum": {
    base: "bg-[#050505]",
    decor: () => (
      <>
        {/* глубокая бездна с лёгким холодным свечением */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 110%, rgba(180,200,230,0.35) 0%, rgba(80,90,110,0.15) 30%, transparent 60%)",
          }}
        />
        {/* гранёный бриллиант — медленно вращающийся conic */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[60%]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(255,255,255,0.0) 0deg, rgba(220,230,245,0.85) 30deg, rgba(255,255,255,0.0) 60deg, rgba(180,200,230,0.6) 120deg, rgba(255,255,255,0.0) 150deg, rgba(240,245,255,0.95) 210deg, rgba(255,255,255,0.0) 240deg, rgba(200,215,235,0.7) 300deg, rgba(255,255,255,0.0) 330deg)",
            animation: "plaque-prism-rotate 14s linear infinite",
            filter: "blur(28px)",
            mixBlendMode: "screen",
          }}
        />
        {/* чёткие огранённые блики — фасеты */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(60deg, transparent 40%, rgba(255,255,255,0.18) 49%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.18) 51%, transparent 60%), linear-gradient(-50deg, transparent 45%, rgba(220,230,245,0.25) 50%, transparent 55%)",
            mixBlendMode: "screen",
          }}
        />
        {/* платиновый sweep */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255,255,255,0.5) 48%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.5) 52%, transparent 65%, transparent 100%)",
            backgroundSize: "260% 100%",
            animation: "plaque-gold-sweep 5s linear infinite",
            mixBlendMode: "screen",
          }}
        />
        {/* вершинный vignette + чёрная подложка для текста */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/55" />
      </>
    ),
  },
};

/**
 * Декоративный фон плашки/дашборда — рендерит base + decor по PlaqueBg.
 * Используется в плашке профиля и в большой «приборке» на /club/me.
 */
export function PlaqueBackground({ bg, className = "" }: { bg: PlaqueBg; className?: string }) {
  const variant = PLAQUE_BG[bg];
  return (
    <>
      <div aria-hidden className={`absolute inset-0 ${variant.base} ${className}`} />
      {variant.decor?.()}
    </>
  );
}

export function ProfilePlaque({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { rank, plaqueBg, xp, xpMax, xpPct, isMax } = useCurrentRank();
  const variant = PLAQUE_BG[plaqueBg];
  const size = compact ? 44 : 56;
  const isPaid = !!rank.isPaid;

  return (
    <Link
      to="/club/me"
      onClick={onNavigate}
      aria-label={`Профиль ${ME.nick}, ${rank.label}, ${xp} из ${xpMax} XP`}
      className="group relative flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{ width: compact ? "360px" : "100%" }}
    >
      <div
        className="relative shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all"
        style={{
          height: `${size}px`,
          width: `${size}px`,
          backgroundColor: rank.accent,
          // ring-color
          boxShadow: `0 0 0 2px ${rank.accentSoft}`,
        }}
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
            className={`font-display font-black italic uppercase ${compact ? "text-base" : "text-lg"}`}
            style={{ color: rank.onAccent }}
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
          className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            background: `linear-gradient(to right, transparent, ${rank.accentSoft})`,
          }}
        />

        <div className="relative flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate font-display font-black italic uppercase tracking-tight text-foreground transition-colors ${
              compact ? "text-[15px]" : "text-[17px]"
            }`}
          >
            {ME.nick}
          </span>
        </div>

        <div className="relative mt-1.5 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
            <div
              className="absolute inset-y-0 left-0 overflow-hidden rounded-sm"
              style={{
                width: `${xpPct}%`,
                backgroundColor: rank.accent,
                boxShadow: `0 0 8px ${rank.accentSoft}`,
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

          {isPaid ? (
            <div className="flex items-center gap-1 whitespace-nowrap">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: rank.accent }}>
                <path d="M12 2 L15 9 L22 9 L16.5 13.5 L18.5 21 L12 16.5 L5.5 21 L7.5 13.5 L2 9 L9 9 Z" />
              </svg>
              <span
                className="font-mono text-[9px] font-extrabold uppercase tracking-[0.25em]"
                style={{ color: rank.accent }}
              >
                VIP
              </span>
            </div>
          ) : isMax ? (
            <div className="flex items-center whitespace-nowrap">
              <span
                className="font-mono text-[9px] font-extrabold uppercase tracking-[0.25em]"
                style={{ color: rank.accent }}
              >
                MAX
              </span>
            </div>
          ) : (
            <div className="flex items-baseline whitespace-nowrap font-mono text-[10px] font-bold tabular-nums text-neutral-500">
              <span className="text-foreground">{xp}</span>
              <span className="mx-0.5 opacity-30">/</span>
              <span>{xpMax}</span>
              <span className="ml-1 font-extrabold" style={{ color: rank.accent }}>
                XP
              </span>
            </div>
          )}

          <div
            className="flex h-3 shrink-0 items-center border-l-2 pl-1.5"
            style={{ borderColor: rank.accent }}
          >
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ color: rank.accent }}
            >
              {rank.short}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
