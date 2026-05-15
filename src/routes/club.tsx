import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
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

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Клуб HELLHOUND — лента" },
      { name: "description", content: "Внутренний клуб HELLHOUND Racing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubPage,
});

// ---------- Mock data ----------

const NAV: { label: string; href: string; icon: LucideIcon; final?: boolean }[] = [
  { label: "Лента", href: "/club", icon: Newspaper },
  { label: "Мой Гараж", href: "/club/garage", icon: Wrench },
  { label: "Розыгрыши", href: "/club/raffles", icon: Ticket },
  { label: "Магазин", href: "/shop", icon: ShoppingBag },
  { label: "Школа", href: "/school", icon: GraduationCap },
  { label: "Hell Pass", href: "/hell-pass", icon: Gem, final: true },
];

const ME = {
  nick: "ASPHALT_DOG",
  city: "Москва",
  bike: "Yamaha MT-09",
  rank: "RIDER",
  xp: 1240,
  xpMax: 2000,
};

type Post = {
  id: string;
  author: { name: string; handle: string; badge: string };
  time: string;
  text: string;
  image?: string;
  likes: number;
  comments: number;
  pinned?: boolean;
};

const POSTS: Post[] = [
  {
    id: "1",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "2 ч",
    pinned: true,
    text: "Розыгрыш Yamaha R1 закрывается в воскресенье. Осталось 412 билетов из 3000. Кто ещё думает — подумайте быстрее.",
    image:
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1200&q=80",
    likes: 842,
    comments: 137,
  },
  {
    id: "2",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "вчера",
    text: "Снимаем новый ролик про падения. RAW-камеры с трека уйдут только в клуб — за неделю до публики.",
    likes: 1204,
    comments: 89,
  },
  {
    id: "3",
    author: { name: "Pavel / команда", handle: "@team_pavel", badge: "TEAM" },
    time: "2 дн",
    text: "Перчатки HELLHOUND v2 поехали в производство. Первая партия — 300 пар, waitlist открываем в пятницу.",
    image:
      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1200&q=80",
    likes: 567,
    comments: 64,
  },
  {
    id: "4",
    author: { name: "Hell", handle: "@hell", badge: "OWNER" },
    time: "3 дн",
    text: "Скинул в общий чат маршрут на субботу — Дмитров, 180 км по плохому асфальту. Кто едет — отметьтесь.",
    likes: 392,
    comments: 211,
  },
];

// ---------- Page ----------

function ClubPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background rally stripes */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 22px)",
        }}
      />

      <div className="relative flex min-h-screen">
        {/* Sidebar — desktop */}
        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-black/40 backdrop-blur-md lg:flex">
          <SidebarBody pathname={pathname} />
        </aside>

        {/* Sidebar — mobile drawer */}
        <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} pathname={pathname} />

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMenu={() => setMenuOpen(true)} />

          <main className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10">
            <Composer />
            <Feed />
          </main>
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
  const total = "60.9";
  const progressPct = activeIndex <= 0 ? 0 : Math.round((activeIndex / (NAV.length - 1)) * 100);

  return (
    <>
      {/* Scanning grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(var(--primary) 0.5px, transparent 0.5px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Brand header */}
      <div className="relative z-10 flex items-start justify-between border-b border-white/[0.04] px-6 pb-5 pt-7">
        <Link
          to="/"
          onClick={onNavigate}
          className="block"
          aria-label="HELLHOUND home"
        >
          <span
            className="block font-display text-2xl font-black italic tracking-tighter text-primary"
            style={{ textShadow: "0 0 8px color-mix(in oklab, var(--primary) 30%, transparent)" }}
          >
            HELLHOUND
          </span>
          <span className="mt-1 flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            NAV UNIT V1.04
          </span>
        </Link>
        <div className="text-right font-mono text-[10px] leading-tight text-muted-foreground/70">
          <div>ST: 98%</div>
          <div>LAT: 55.75</div>
        </div>
      </div>

      {/* Route */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="relative">
          {/* Road SVG */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-[22px] top-0 w-8"
          >
            <svg
              className="h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 40 600"
              fill="none"
            >
              <path
                d="M20,0 C30,60 10,120 20,180 S30,300 20,360 S10,480 20,540 S30,620 20,600"
                stroke="hsl(0 0% 10%)"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M15,100 L25,100 M15,220 L25,220 M15,340 L25,340 M15,460 L25,460"
                stroke="hsl(0 0% 14%)"
                strokeWidth="1"
              />
              <path
                d="M20,0 C30,60 10,120 20,80"
                stroke="var(--primary)"
                strokeWidth="4"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 60%, transparent))" }}
              />
            </svg>
          </div>

          <ul className="relative z-10 space-y-0">
            {NAV.map((item, idx) => {
              const isActive = idx === activeIndex;
              const isFinal = "final" in item && item.final;
              const isLast = idx === NAV.length - 1;
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onNavigate}
                    className="group relative flex h-14 items-center"
                  >
                    {/* Waypoint marker */}
                    <div className="flex w-12 shrink-0 justify-center">
                      {isActive ? (
                        <span className="relative">
                          <span
                            aria-hidden
                            className="absolute -inset-2 animate-pulse rounded-full bg-primary/20 blur-md"
                          />
                          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-black ring-4 ring-primary/10">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          </span>
                        </span>
                      ) : isFinal ? (
                        <span
                          className="flex h-5 w-5 rotate-45 items-center justify-center border-2 border-primary bg-card"
                          style={{ boxShadow: "0 0 15px color-mix(in oklab, var(--primary) 20%, transparent)" }}
                        >
                          <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                        </span>
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full border-2 border-white/[0.12] bg-card transition-all duration-300 group-hover:border-primary group-hover:bg-primary/20" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="ml-3 min-w-0">
                      <div
                        className={`font-semibold uppercase tracking-wide transition-colors ${
                          isActive
                            ? "text-sm text-primary"
                            : isFinal
                              ? "text-sm font-black tracking-widest text-foreground"
                              : "text-sm text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {item.label}
                      </div>
                      {isActive && (
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="font-mono text-[9px] leading-none text-primary/60">
                            TRK: {item.distance}
                          </span>
                          <span className="rounded bg-primary/10 px-1 font-mono text-[8px] font-bold text-primary">
                            CURR
                          </span>
                        </div>
                      )}
                      {isFinal && !isActive && (
                        <div className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-widest text-muted-foreground/70">
                          Final Sector
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Distance spacer between stops */}
                  {!isLast && (
                    <div className="ml-12 flex h-9 items-center border-l border-dashed border-white/[0.08]">
                      <span className="pl-4 font-mono text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/70">
                        {NAV[idx + 1].distance}
                        {NAV[idx + 1].eta && (
                          <span className="ml-2 text-muted-foreground/40">
                            [E: {NAV[idx + 1].eta}]
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Telemetry footer */}
      <div className="relative z-10 border-t border-white/[0.04] bg-black/40 p-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <div className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
              Total Trip
            </div>
            <div className="font-mono text-lg font-bold leading-tight tracking-tighter text-foreground">
              {total}
              <span className="ml-1 text-xs text-muted-foreground">KM</span>
            </div>
          </div>
          <Link
            to="/"
            onClick={onNavigate}
            aria-label="На главную"
            className="group flex h-10 w-10 items-center justify-center border border-white/[0.08] bg-card transition-all hover:border-primary hover:bg-primary/10"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted-foreground transition-colors group-hover:text-primary"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              boxShadow: "0 0 8px color-mix(in oklab, var(--primary) 60%, transparent)",
            }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] font-bold uppercase">
          <span className="text-muted-foreground/60">Progress</span>
          <span className="text-primary">{progressPct}% COMPLETED</span>
        </div>
      </div>
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
  const xpPct = Math.round((ME.xp / ME.xpMax) * 100);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        {/* Mobile burger */}
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

        {/* Notifications */}
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

        {/* Profile chip */}
        <div className="flex items-center gap-3 border border-white/[0.08] py-1.5 pl-1.5 pr-3">
          {/* Avatar */}
          <div className="relative flex h-9 w-9 items-center justify-center bg-primary/15 font-display text-sm font-bold uppercase italic text-primary">
            {ME.nick.slice(0, 2)}
            <span
              aria-hidden
              className="absolute inset-0 ring-1 ring-inset ring-primary/40"
            />
          </div>

          {/* Nick + rank + XP */}
          <div className="hidden min-w-[140px] flex-col gap-1 sm:flex">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground">
                {ME.nick}
              </span>
              <span className="border border-primary/40 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                {ME.rank}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-1 w-full overflow-hidden bg-white/[0.06]">
                <div
                  className="absolute inset-y-0 left-0 bg-primary"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {ME.xp}/{ME.xpMax} XP
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------- Feed ----------

function Composer() {
  return (
    <div className="mb-6 border border-white/[0.06] bg-card/40 p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center bg-primary/15 font-display text-xs font-bold uppercase italic text-primary">
          {ME.nick.slice(0, 2)}
        </div>
        <button
          type="button"
          className="flex-1 cursor-not-allowed border border-dashed border-white/[0.08] px-4 py-2 text-left text-muted-foreground/70"
          title="Только Hell и команда могут публиковать"
        >
          Только Hell и команда публикуют посты
        </button>
      </div>
    </div>
  );
}

function Feed() {
  return (
    <div className="space-y-4">
      {POSTS.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <article className="border border-white/[0.06] bg-card/40 backdrop-blur-sm transition-colors hover:border-white/[0.12]">
      {post.pinned && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4l4 4-6 2 2 6-4 4-2-6-6 2 4-4-2-6 6 2 4-4z" />
          </svg>
          Закреплено
        </div>
      )}

      <div className="flex items-center gap-3 px-5 pt-4">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/15 font-display text-sm font-bold uppercase italic text-primary">
          {post.author.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-base font-bold uppercase italic tracking-tight text-foreground">
              {post.author.name}
            </span>
            <span className="border border-primary/40 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
              {post.author.badge}
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {post.author.handle} · {post.time}
          </span>
        </div>
        <button
          type="button"
          aria-label="Действия"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg width="18" height="4" viewBox="0 0 18 4" fill="currentColor">
            <circle cx="2" cy="2" r="2" />
            <circle cx="9" cy="2" r="2" />
            <circle cx="16" cy="2" r="2" />
          </svg>
        </button>
      </div>

      <p className="px-5 pb-4 pt-3 text-[15px] leading-relaxed text-foreground/90">
        {post.text}
      </p>

      {post.image && (
        <div className="border-y border-white/[0.06] bg-black">
          <img
            src={post.image}
            alt=""
            loading="lazy"
            className="h-auto w-full object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-1 px-3 py-2">
        <PostAction icon={<HeartIcon />} count={post.likes} label="Лайк" />
        <PostAction icon={<CommentIcon />} count={post.comments} label="Комментарий" />
        <PostAction icon={<ShareIcon />} label="Поделиться" />
      </div>
    </article>
  );
}

function PostAction({
  icon,
  count,
  label,
}: {
  icon: React.ReactNode;
  count?: number;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="group flex items-center gap-2 px-3 py-2 font-mono text-xs tabular-nums text-muted-foreground transition-colors hover:text-primary"
    >
      <span className="transition-transform group-active:scale-90">{icon}</span>
      {count !== undefined && <span>{formatCount(count)}</span>}
    </button>
  );
}

function formatCount(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

// ---------- Icons ----------

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
    </svg>
  );
}
function IconFeed(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function IconGarage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 21V9l9-6 9 6v12M6 21v-8h12v8" />
    </svg>
  );
}
function IconTicket(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M3 8a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V8zM13 6v12" strokeDasharray="2 2" />
    </svg>
  );
}
function IconBag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M5 9h14l-1 12H6L5 9zM8 9V6a4 4 0 018 0v3" />
    </svg>
  );
}
function IconMap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
    </svg>
  );
}
function IconChat(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M21 11.5a8.5 8.5 0 01-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1121 11.5z" />
    </svg>
  );
}
function IconBell(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path d="M18 16v-5a6 6 0 10-12 0v5l-2 2h16l-2-2zM10 21a2 2 0 004 0" />
    </svg>
  );
}
