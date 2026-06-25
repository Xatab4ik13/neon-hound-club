// SwiftUI-style реакции: длинный тап на ❤️ → всплывает бар из 5 эмодзи.
// Tap по эмодзи: триггерит лайк (если ещё не) + спавнит floating-эмодзи поверх.
// Бар появляется с pop spring, эмодзи pulsируют по очереди (stagger).
// На бек реакции не персистятся (пока) — это UX-сахар поверх обычного лайка.
//
// Перформанс: всё на transform/opacity (GPU). Размонтируется через 220ms после закрытия.

import { Heart } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { haptic } from "@/hooks/use-haptic";

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return Math.round(n / 1000) + "k";
}

export const REACTIONS = ["🔥", "💀", "🤘", "🤝", "🫡"] as const;
export type Reaction = (typeof REACTIONS)[number];

type Props = {
  liked: boolean;
  count: number;
  onToggle: (next: boolean) => void;
  onReact?: (r: Reaction) => void;
};

const BURST = Array.from({ length: 6 }, (_, i) => {
  const angle = (i * 360) / 6 - 90;
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * 22, y: Math.sin(rad) * 22, delay: i * 12 };
});

type Floater = { id: number; emoji: string };

export function LikeButton({ liked, count, onToggle, onReact }: Props) {
  const [burstKey, setBurstKey] = useState(0);
  const [barOpen, setBarOpen] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const lockRef = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Закрытие бара по тапу/скроллу вне.
  useEffect(() => {
    if (!barOpen) return;
    const close = (e: Event) => {
      const t = e.target as Node | null;
      if (t && btnRef.current?.parentElement?.contains(t)) return;
      setBarOpen(false);
    };
    const opts = { passive: true } as AddEventListenerOptions;
    document.addEventListener("touchstart", close, opts);
    document.addEventListener("mousedown", close, opts);
    window.addEventListener("scroll", close, opts);
    return () => {
      document.removeEventListener("touchstart", close);
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close);
    };
  }, [barOpen]);

  const clearLong = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLong = useCallback(() => {
    longPressed.current = false;
    clearLong();
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      haptic("success");
      setBarOpen(true);
    }, 380);
  }, []);

  const cancelLong = () => clearLong();

  const handleClick = (e: React.MouseEvent) => {
    // Если только что был long-press — клик игнорим (бар уже открыт).
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
      return;
    }
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

  const spawnFloater = (emoji: string) => {
    const id = Date.now() + Math.random();
    setFloaters((arr) => [...arr, { id, emoji }]);
    setTimeout(() => {
      setFloaters((arr) => arr.filter((f) => f.id !== id));
    }, 1200);
  };

  const handleReact = (r: Reaction) => {
    haptic("light");
    spawnFloater(r);
    if (!liked) {
      setBurstKey((k) => k + 1);
      onToggle(true);
    }
    onReact?.(r);
    setBarOpen(false);
  };

  return (
    <span className="relative inline-flex">
      {/* Reactions bar */}
      {barOpen && (
        <div
          role="menu"
          aria-label="Реакции"
          className="absolute bottom-[calc(100%+10px)] left-0 z-30 flex items-center gap-1 rounded-full border border-white/10 bg-black/85 px-2 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur"
          style={{
            transformOrigin: "left bottom",
            animation: "reactions-pop var(--motion-base) var(--ease-spring)",
          }}
        >
          {REACTIONS.map((r, i) => (
            <button
              key={r}
              type="button"
              onClick={() => handleReact(r)}
              aria-label={`Реакция ${r}`}
              className="grid h-9 w-9 place-items-center rounded-full text-[20px] leading-none transition-transform hover:scale-125 active:scale-110"
              style={{
                animation: `reactions-stagger var(--motion-slow) ${i * 35}ms var(--ease-spring) both`,
              }}
            >
              <span style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}>{r}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating emoji animation */}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="absolute left-1/2 top-0 -translate-x-1/2 text-[22px] leading-none"
            style={{
              animation: "reactions-float 1100ms var(--ease-out-soft) forwards",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
            }}
          >
            {f.emoji}
          </span>
        ))}
      </span>

      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        onPointerDown={startLong}
        onPointerUp={cancelLong}
        onPointerLeave={cancelLong}
        onPointerCancel={cancelLong}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Лайк (зажать — реакции)"
        aria-pressed={liked}
        className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[12px] font-bold tabular-nums select-none transition-colors active:scale-95 ${
          liked
            ? "bg-primary text-primary-foreground shadow-[0_4px_14px_rgba(255,45,149,0.35)]"
            : "border border-white/[0.08] bg-white/[0.04] text-foreground hover:border-primary/40 hover:text-primary"
        }`}
        style={{
          transition:
            "background-color var(--motion-base) var(--ease-in-out), color var(--motion-base) var(--ease-in-out), transform var(--motion-fast) var(--ease-out-soft)",
          touchAction: "manipulation",
          WebkitUserSelect: "none",
        }}
      >
        <span className="relative grid h-4 w-4 place-items-center">
          <Heart
            className="h-4 w-4"
            fill={liked ? "currentColor" : "none"}
            strokeWidth={2}
            style={{
              animation: burstKey ? "like-pop var(--motion-slow) var(--ease-spring)" : undefined,
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
                    animation: `like-burst 520ms ${p.delay}ms var(--ease-out-soft) forwards`,
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
          @keyframes reactions-pop {
            0%   { transform: scale(0.5) translateY(8px); opacity: 0; }
            60%  { transform: scale(1.05) translateY(0); opacity: 1; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes reactions-stagger {
            0%   { transform: scale(0) translateY(6px); opacity: 0; }
            100% { transform: scale(1) translateY(0); opacity: 1; }
          }
          @keyframes reactions-float {
            0%   { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
            15%  { transform: translate(-50%, -8px) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -64px) scale(0.9); opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            [style*="like-pop"], [style*="like-burst"],
            [style*="reactions-pop"], [style*="reactions-stagger"], [style*="reactions-float"] {
              animation: none !important;
            }
          }
        `}</style>
      </button>
    </span>
  );
}
