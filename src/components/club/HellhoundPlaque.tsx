// Уникальная плашка для Hell. Используется вместо ранговой плашки/аватара
// везде, где автор/комментатор — slug "hell". Ни у кого больше её не будет.

import type { CSSProperties } from "react";

const HELL_GRADIENT = "linear-gradient(135deg, #ff2d4a 0%, #ff8a3d 50%, #ffd166 100%)";

export function isHell(slug?: string) {
  return slug?.toLowerCase() === "hell";
}

/** Аватар-шеврон с анимированным красно-золотым свечением. */
export function HellhoundAvatar({
  size = 40,
  initials = "H",
  avatarUrl,
}: {
  size?: number;
  initials?: string;
  avatarUrl?: string;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
  };
  return (
    <div className="relative shrink-0" style={style}>
      <span
        aria-hidden
        className="absolute -inset-[2px] animate-hell-pulse rounded-[2px] opacity-80 blur-[6px]"
        style={{ background: HELL_GRADIENT }}
      />
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={{
          background: "#0a0a0a",
          boxShadow: "inset 0 0 0 1.5px #ff2d4a, 0 0 12px -2px rgba(255,45,74,0.6)",
        }}
      >
        {avatarUrl ? (
          <img loading="lazy" decoding="async" src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="font-display font-black italic uppercase"
            style={{
              fontSize: Math.round(size * 0.42),
              background: HELL_GRADIENT,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}

/** Мини-чип «HELLHOUND» — заменяет шорт-ранг рядом с ником. */
export function HellhoundChip({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const dims =
    size === "xs"
      ? "h-4 px-1.5 text-[8px]"
      : size === "md"
        ? "h-6 px-2.5 text-[10px]"
        : "h-5 px-2 text-[9px]";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center gap-1 overflow-hidden font-mono font-black uppercase tracking-[0.18em] ${dims}`}
      style={{
        background: "#0a0a0a",
        color: "#ffd166",
        boxShadow: "inset 0 0 0 1px rgba(255,45,74,0.55)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-0 animate-hell-sheen opacity-50"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,209,102,0.45) 50%, transparent 70%)",
        }}
      />
      <span aria-hidden className="relative inline-block h-1.5 w-1.5 rounded-full" style={{ background: HELL_GRADIENT }} />
      <span className="relative">HELLHOUND</span>
    </span>
  );
}

/** Полноразмерная плашка для топбара кабинета блогера. */
export function HellhoundPlaqueLarge({
  nick = "HELL",
  initials = "H",
  avatarUrl,
  onClick,
}: {
  nick?: string;
  initials?: string;
  avatarUrl?: string;
  onClick?: () => void;
}) {
  const Wrap = onClick ? "button" : "div";
  return (
    <Wrap
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="group relative flex min-w-0 items-center gap-3 px-1 transition-transform active:scale-[0.98]"
      aria-label={onClick ? "Открыть профиль" : undefined}
    >
      <HellhoundAvatar size={44} initials={initials} avatarUrl={avatarUrl} />
      <div className="min-w-0 text-left">
        <div
          className="truncate font-display text-[16px] font-black italic uppercase tracking-tight"
          style={{
            background: HELL_GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {nick}
        </div>
        <div className="mt-0.5">
          <HellhoundChip size="xs" />
        </div>
      </div>
    </Wrap>
  );
}
