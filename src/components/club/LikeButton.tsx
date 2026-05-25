// Кнопка лайка с pop-анимацией + burst-частицами.
// Перформанс: только transform/opacity (GPU), без re-layout.
// Частицы рендерим только во время вспышки (300ms) и сразу размонтируем —
// в idle в DOM лишних нод нет.

import { Heart } from "lucide-react";
import { useRef, useState } from "react";
import { haptic } from "@/hooks/use-haptic";
import { formatCount } from "@/lib/utils";

type Props = {
  liked: boolean;
  count: number;
  onToggle: (next: boolean) => void;
};

// 6 частиц по окружности
const BURST = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * 360) / 6 - 90;
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * 22, y: Math.sin(rad) * 22, delay: i * 12 };
});

export function LikeButton({ liked, count, onToggle }: Props) {
  const [burstKey, setBurstKey] = useState(0);
  const lockRef = useRef(false);

  const handleClick = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setTimeout(() => (lockRef.current = false), 200);

    const next = !liked;
    if (next) {
      setBurstKey((k) => k + 1);
      haptic("light");
    }
    onToggle(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Лайк"
      aria-pressed={liked}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[12px] font-bold tabular-nums transition-colors active:scale-95 ${
        liked
          ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(255,45,149,0.35)]"
          : "border border-white/[0.08] bg-white/[0.04] text-foreground hover:border-primary/40 hover:text-primary"
      }`}
      style={{ transition: "background-color 180ms ease, color 180ms ease, transform 120ms ease" }}
    >
      <span className="relative grid h-4 w-4 place-items-center">
        <Heart
          className="h-4 w-4"
          fill={liked ? "currentColor" : "none"}
          strokeWidth={2}
          style={{
            animation: burstKey ? "like-pop 360ms cubic-bezier(0.34, 1.56, 0.64, 1)" : undefined,
            transformOrigin: "center",
          }}
          key={burstKey}
        />
        {burstKey > 0 && (
          <span
            key={`burst-${burstKey}`}
            aria-hidden
            className="pointer-events-none absolute inset-0"
          >
            {BURST.map((p, i) => (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-primary"
                style={{
                  // @ts-expect-error custom CSS vars
                  "--tx": `${p.x}px`,
                  "--ty": `${p.y}px`,
                  animation: `like-burst 520ms ${p.delay}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  opacity: 0,
                }}
              />
            ))}
          </span>
        )}
      </span>
      <span>{formatCount(count)}</span>

      <style>{`
        @keyframes like-pop {
          0%   { transform: scale(1); }
          30%  { transform: scale(0.78); }
          60%  { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        @keyframes like-burst {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="like-pop"], [style*="like-burst"] { animation: none !important; }
        }
      `}</style>
    </button>
  );
}
