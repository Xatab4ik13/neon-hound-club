// Витрина значков в профиле. Сверху — закреплённые 4 слота (как pinned
// items в CS-инвентаре). Ниже — полная коллекция: owned яркие, locked
// затемнены силуэтом.

import { useState } from "react";
import {
  BADGES,
  PINNED_BADGE_IDS,
  RARITY,
  type Badge,
  type BadgeCategory,
} from "@/data/badges";
import { BadgeIcon } from "./BadgeIcon";
import { Lock } from "lucide-react";

const CATEGORY_LABEL: Record<BadgeCategory, string> = {
  pass: "Hell Pass · сезонные",
  founder: "Founder",
  achievement: "Достижения",
  event: "Эвенты",
  club: "Клуб",
};

const CATEGORY_ORDER: BadgeCategory[] = [
  "founder",
  "pass",
  "achievement",
  "event",
  "club",
];

export function BadgeCase() {
  const [selected, setSelected] = useState<Badge | null>(null);
  const ownedCount = BADGES.filter((b) => b.owned).length;
  const pinned = PINNED_BADGE_IDS.map((id) => BADGES.find((b) => b.id === id)).filter(
    (b): b is Badge => !!b && b.owned,
  );

  return (
    <section aria-label="Витрина значков" className="mb-10">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div
            className="inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-primary"
            style={{
              border: "1px solid color-mix(in oklab, var(--primary) 40%, transparent)",
            }}
          >
            ID: BADGES / INVENTORY
          </div>
          <h2 className="mt-2 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Значки
          </h2>
        </div>
        <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="font-bold tabular-nums text-foreground">{ownedCount}</span>
          <span className="opacity-40"> / </span>
          <span className="tabular-nums">{BADGES.length}</span>
          <div className="mt-0.5 text-[9px] opacity-60">собрано</div>
        </div>
      </div>

      {/* Витрина: 4 pinned */}
      <div className="grid grid-cols-4 gap-2 border border-white/[0.06] bg-[#0b0b0b] p-3 md:gap-3 md:p-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const b = pinned[i];
          if (!b) return <EmptyPinned key={i} />;
          return (
            <PinnedSlot
              key={b.id}
              badge={b}
              onClick={() => setSelected(b)}
            />
          );
        })}
      </div>

      {/* Полная коллекция по категориям */}
      <div className="mt-6 space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = BADGES.filter((b) => b.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {CATEGORY_LABEL[cat]}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/70">
                  {items.filter((b) => b.owned).length}/{items.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {items.map((b) => (
                  <BadgeTile key={b.id} badge={b} onClick={() => setSelected(b)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Деталь выбранного значка */}
      {selected && <BadgeDetail badge={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

// ── Tiles ─────────────────────────────────────────────────────────────────

function EmptyPinned() {
  return (
    <div className="flex aspect-square flex-col items-center justify-center border border-dashed border-white/10 bg-black/30 text-center">
      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
        Слот свободен
      </div>
    </div>
  );
}

function PinnedSlot({ badge, onClick }: { badge: Badge; onClick: () => void }) {
  const r = RARITY[badge.rarity];
  const premium = badge.rarity === "legendary" || badge.rarity === "mythic";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden border bg-black/40 p-2 text-center transition-all hover:scale-[1.02]"
      style={{
        borderColor: r.soft,
        boxShadow: `0 0 24px -8px ${r.soft}`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(120% 80% at 50% 110%, ${r.color}40 0%, transparent 60%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent, transparent 6px, #fff 6px, #fff 7px)",
        }}
      />
      {/* Sweep блик на hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute top-0 h-full w-1/3 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[260%]"
        />
      </div>
      <div className="relative">
        <BadgeIcon id={badge.id} color={r.color} soft={r.soft} size={56} animated premium={premium} />
      </div>
      <div className="relative mt-2 font-display text-[10px] font-black uppercase italic tracking-wider text-foreground md:text-[11px]">
        {badge.name}
      </div>
      <div
        className="relative mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.25em]"
        style={{ color: r.color }}
      >
        {r.label}
      </div>
    </button>
  );
}

function BadgeTile({ badge, onClick }: { badge: Badge; onClick: () => void }) {
  const r = RARITY[badge.rarity];
  const locked = !badge.owned;
  const premium = badge.rarity === "legendary" || badge.rarity === "mythic";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden border bg-[#0b0b0b] p-2 text-center transition-all hover:-translate-y-0.5 hover:scale-[1.04]"
      style={{
        borderColor: locked ? "rgba(255,255,255,0.05)" : r.soft,
      }}
      aria-label={badge.name}
    >
      {/* rarity glow только если owned */}
      {!locked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30 transition-opacity group-hover:opacity-60"
          style={{
            background: `radial-gradient(120% 80% at 50% 110%, ${r.color}55 0%, transparent 65%)`,
          }}
        />
      )}
      {/* Sweep на hover */}
      {!locked && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-0 h-full w-1/3 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[260%]" />
        </div>
      )}
      <div
        className="relative transition-transform"
        style={{
          filter: locked ? "grayscale(1) brightness(0.32) opacity(0.85)" : "none",
        }}
      >
        <BadgeIcon
          id={badge.id}
          color={locked ? "#3a3a3a" : r.color}
          soft={r.soft}
          size={40}
          animated={!locked}
          premium={!locked && premium}
        />
      </div>
      <div
        className="relative mt-1.5 line-clamp-1 font-mono text-[9px] uppercase tracking-wider"
        style={{ color: locked ? "rgba(167,167,167,0.4)" : "rgba(255,255,255,0.78)" }}
      >
        {badge.name}
      </div>
      {locked && (
        <div className="absolute right-1 top-1 rounded-sm bg-black/70 p-0.5">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}
      {badge.issue && !locked && (
        <div
          className="absolute left-1 top-1 px-1 font-mono text-[8px] font-bold tracking-wider"
          style={{ color: r.color, background: "rgba(0,0,0,0.55)" }}
        >
          {badge.issue}
        </div>
      )}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────

function BadgeDetail({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const r = RARITY[badge.rarity];
  const locked = !badge.owned;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative w-full max-w-md overflow-hidden border bg-[#0b0b0b] p-6"
        style={{ borderColor: r.soft, boxShadow: `0 0 60px -10px ${r.soft}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: `radial-gradient(60% 60% at 50% 0%, ${r.color}33 0%, transparent 70%)`,
          }}
        />
        <div className="relative flex flex-col items-center text-center">
          <div
            className="flex h-28 w-28 items-center justify-center"
            style={{
              filter: locked ? "grayscale(1) brightness(0.4)" : "none",
            }}
          >
            <BadgeIcon
              id={badge.id}
              color={locked ? "#444" : r.color}
              soft={r.soft}
              size={104}
              animated={!locked}
              premium={!locked && (badge.rarity === "legendary" || badge.rarity === "mythic")}
            />
          </div>
          <div
            className="mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
            style={{ color: r.color }}
          >
            {r.label}
            {badge.issue && <span className="ml-2 text-muted-foreground">· {badge.issue}</span>}
          </div>
          <h3 className="mt-2 font-display text-2xl font-black uppercase italic tracking-tighter text-foreground">
            {badge.name}
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {badge.description}
          </p>
          {badge.mintedOf && (
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              выдано: <span className="font-bold tabular-nums text-foreground">{badge.mintedOf}</span>
            </div>
          )}
          {locked && (
            <div className="mt-4 flex items-center gap-2 border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              ещё не получен
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full border border-white/10 bg-black/40 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}
