// Полоса реакций на конкретный комментарий. Появляется только если есть хоть одна.
// Тап по чипу — toggle. Стиль чипа — компактнее чем у поста.

import { commentReactionsStore, useCommentReactions } from "@/data/comment-reactions-store";
import { REACTIONS, type Reaction } from "./LikeButton";
import { haptic } from "@/hooks/use-haptic";

type Props = { commentId: string };

export function CommentReactionsBar({ commentId }: Props) {
  const { mine, counts } = useCommentReactions(commentId);
  const visible = REACTIONS.filter((r) => (counts[r] ?? 0) > 0);
  if (visible.length === 0) return null;

  const onTap = (r: Reaction) => {
    haptic("light");
    commentReactionsStore.toggle(commentId, r);
  };

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
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
            className={`inline-flex h-6 items-center gap-1 rounded-full border px-1.5 font-mono text-[10px] font-bold tabular-nums transition-all active:scale-90 ${
              isMine
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-white/[0.08] bg-white/[0.04] text-foreground/80 hover:border-white/15"
            }`}
            style={{
              animation: "comment-reaction-in 200ms cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            <span className="text-[11px] leading-none">{r}</span>
            <span>{counts[r]}</span>
          </button>
        );
      })}
      <style>{`
        @keyframes comment-reaction-in {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="comment-reaction-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
