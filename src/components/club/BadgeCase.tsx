// Витрина значков в профиле. Источник данных — бекенд (/api/v1/badges/me).
// Если у юзера нет значков — показываем пустые слоты с подсказкой.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { BadgeIcon } from "./BadgeIcon";
import { fetchMyBadges, type MyBadge, type BadgeRarity } from "@/lib/queries";

const RARITY: Record<BadgeRarity, { label: string; color: string; soft: string }> = {
  common: { label: "common", color: "#9aa0a6", soft: "rgba(154,160,166,0.35)" },
  rare: { label: "rare", color: "#3aa0ff", soft: "rgba(58,160,255,0.4)" },
  epic: { label: "epic", color: "#b48dff", soft: "rgba(180,141,255,0.45)" },
  legendary: { label: "legendary", color: "#ffb648", soft: "rgba(255,182,72,0.5)" },
  mythic: { label: "mythic", color: "#ff3344", soft: "rgba(255,51,68,0.55)" },
};

export function BadgeCase() {
  const [selected, setSelected] = useState<MyBadge | null>(null);
  const q = useQuery({
    queryKey: ["badges", "me"],
    queryFn: fetchMyBadges,
    staleTime: 60_000,
    retry: false,
  });
  const all = q.data?.items ?? [];
  const pinned = all.filter((b) => b.pinned).slice(0, 4);
  const ownedCount = all.length;

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
          <div className="mt-0.5 text-[9px] opacity-60">собрано</div>
        </div>
      </div>

      {/* Витрина: 4 pinned (или пустые слоты) */}
      <div className="grid grid-cols-2 gap-2 border border-white/[0.06] bg-[#0b0b0b] p-3 sm:grid-cols-4 md:gap-3 md:p-4">
        {Array.from({ length: 4 }).map((_, i) => {
          const b = pinned[i];
          if (!b) return <EmptyPinned key={i} />;
          return <PinnedSlot key={b.badgeId} badge={b} onClick={() => setSelected(b)} />;
        })}
      </div>

      {ownedCount === 0 && (
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          Значков пока нет — появятся за активность и эвенты
        </p>
      )}

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

function PinnedSlot({ badge, onClick }: { badge: MyBadge; onClick: () => void }) {
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
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 h-full w-1/3 -translate-x-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[260%]" />
      </div>
      <div className="relative">
        <BadgeIcon id={badge.code} color={r.color} soft={r.soft} size={56} animated premium={premium} />
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

// ── Modal ─────────────────────────────────────────────────────────────────

function BadgeDetail({ badge, onClose }: { badge: MyBadge; onClose: () => void }) {
  const r = RARITY[badge.rarity];
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
          <div className="flex h-28 w-28 items-center justify-center">
            <BadgeIcon
              id={badge.code}
              color={r.color}
              soft={r.soft}
              size={104}
              animated
              premium={badge.rarity === "legendary" || badge.rarity === "mythic"}
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
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{badge.description}</p>
          {badge.mintedOf && (
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              выдано: <span className="font-bold tabular-nums text-foreground">{badge.mintedOf}</span>
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
