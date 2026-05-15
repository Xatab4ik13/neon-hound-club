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
  const xpPct = Math.round((ME.xp / ME.xpMax) * 100);

  return (
    <>
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12]">
        <div className="absolute -right-16 -top-10 h-64 w-64 rounded-full bg-primary/60 blur-[100px]" />
        <div className="absolute -bottom-10 -left-16 h-64 w-64 rounded-full bg-primary/30 blur-[100px]" />
      </div>

      {/* Brand header */}
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

      {/* Slabs */}
      <nav className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
        <ul className="flex flex-col gap-3">
          {NAV.map((item, idx) => {
            const isActive = idx === activeIndex;
            const isFinal = item.final;
            const Icon = item.icon;

            // Special: Hell Pass — gradient slab with right pink edge
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

      {/* User card */}
      <div className="relative z-10 p-5">
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-md">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center bg-primary font-display text-base font-black uppercase italic text-black">
              {ME.nick.slice(0, 2)}
            </div>
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-black bg-emerald-500"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-mono text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
              {ME.nick}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-xl font-black leading-none text-foreground">
                {ME.xp}
              </span>
              <span className="font-mono text-[10px] font-black text-primary">XP</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full bg-primary" style={{ width: `${xpPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom accent */}
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
