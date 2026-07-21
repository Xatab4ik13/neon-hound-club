// Полоса со счётчиками реакций под постом.
// Появляется только если есть хотя бы одна реакция.
// Тап по чипу: ставит твою реакцию (если другая) или снимает (если та же).
// Чип со «своей» реакцией подсвечен primary.
//
// Анимация появления нового чипа — spring scale-in. Счётчик меняется плавно.

import { useReactions, reactionsStore } from "@/data/reactions-store";
import { REACTIONS, type Reaction } from "./LikeButton";
import { haptic } from "@/hooks/use-haptic";

type Props = { postId: string };

export function ReactionsBar({ postId }: Props) {
  const { mine, counts } = useReactions(postId);

  // Порядок чипов: фиксированный по REACTIONS (стабильно).
  const visible = REACTIONS.filter((r) => (counts[r] ?? 0) > 0);
  if (visible.length === 0) return null;

  const onTap = (r: Reaction) => {
    haptic("light");
    reactionsStore.toggle(postId, r);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 md:px-5">
      {visible.map((r) => {
        const isMine = mine === r;
        return (
          <button
            key={r}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTap(r);
            }}
            aria-label={`Реакция ${r}, ${counts[r]}`}
            aria-pressed={isMine}
            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 font-mono text-[11px] font-bold tabular-nums transition-all active:scale-90 ${
              isMine
                ? "border-primary/60 bg-primary/15 text-primary shadow-[0_2px_8px_rgba(240,0,192,0.25)]"
                : "border-white/[0.08] bg-white/[0.04] text-foreground/85 hover:border-white/15"
            }`}
            style={{
              animation: "reaction-chip-in var(--motion-base) var(--ease-spring)",
              transition:
                "background-color var(--motion-base) var(--ease-in-out), border-color var(--motion-base) var(--ease-in-out), color var(--motion-base) var(--ease-in-out), transform var(--motion-fast) var(--ease-out-soft)",
            }}
          >
            <span className="text-[13px] leading-none">{r}</span>
            <span>{counts[r]}</span>
          </button>
        );
      })}

      <style>{`
        @keyframes reaction-chip-in {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="reaction-chip-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
