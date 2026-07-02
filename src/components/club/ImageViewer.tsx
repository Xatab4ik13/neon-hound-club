// Фуллскрин-просмотр картинки поста.
// — Пинч двумя пальцами: зум 1×…5×, центр между пальцами.
// — Drag одним пальцем когда не зумлено → swipe-down to close (с резинкой).
// — Drag когда зумлено → пан внутри картинки.
// — Double-tap: toggle zoom (1× ↔ 2.5× в точке тапа). Если зум сейчас 1×
//   и колбэк onDoubleTap есть — вызываем его (used for like) и НЕ зумим,
//   чтобы поведение лайка в ленте не сломалось.
// — Esc / тап вне картинки / кнопка ✕ → закрытие.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlumpClose as X } from "@/components/ui/icons";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  src: string;
  open: boolean;
  onClose: () => void;
  onDoubleTap?: () => void;
  /** Имя для View Transitions API — shared-element с источника. */
  transitionName?: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_MS = 280;
const CLOSE_SWIPE_DY = 120;

type Pt = { x: number; y: number };

export function ImageViewer({ src, open, onClose, onDoubleTap, transitionName }: Props) {
  useThemeColor(open ? "#000000" : null);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [swipeDy, setSwipeDy] = useState(0); // только когда scale === 1

  const pointers = useRef(new Map<number, Pt>()).current;
  const gestureRef = useRef<{
    mode: "none" | "pan" | "pinch" | "swipe";
    startScale: number;
    startTx: number;
    startTy: number;
    startDist: number;
    startMid: Pt;
    startPt: Pt;
  }>({
    mode: "none",
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startDist: 0,
    startMid: { x: 0, y: 0 },
    startPt: { x: 0, y: 0 },
  });
  const lastTap = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // Сброс трансформа при открытии/закрытии и блокировка body.
  useEffect(() => {
    if (!open) return;
    setScale(1);
    setTx(0);
    setTy(0);
    setSwipeDy(0);
    pointers.clear();
    gestureRef.current.mode = "none";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, pointers]);

  const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        gestureRef.current = {
          mode: "pinch",
          startScale: scale,
          startTx: tx,
          startTy: ty,
          startDist: dist || 1,
          startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          startPt: { x: 0, y: 0 },
        };
        setDragging(true);
      } else if (pointers.size === 1) {
        gestureRef.current = {
          mode: scale > 1 ? "pan" : "swipe",
          startScale: scale,
          startTx: tx,
          startTy: ty,
          startDist: 0,
          startMid: { x: 0, y: 0 },
          startPt: { x: e.clientX, y: e.clientY },
        };
        setDragging(true);
      }
    },
    [pointers, scale, tx, ty],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gestureRef.current;

      if (g.mode === "pinch" && pointers.size >= 2) {
        const [a, b] = Array.from(pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const k = dist / g.startDist;
        const next = clamp(g.startScale * k, MIN_SCALE, MAX_SCALE);
        // Сохраняем точку под пальцами: смещаем translate так, чтобы midpoint
        // относительно центра экрана сместился пропорционально росту scale.
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = g.startMid.x - cx;
        const dy = g.startMid.y - cy;
        const ratio = next / g.startScale;
        setScale(next);
        setTx(g.startTx + dx - dx * ratio);
        setTy(g.startTy + dy - dy * ratio);
        return;
      }

      if (g.mode === "pan" && scale > 1) {
        setTx(g.startTx + (e.clientX - g.startPt.x));
        setTy(g.startTy + (e.clientY - g.startPt.y));
        return;
      }

      if (g.mode === "swipe" && scale === 1) {
        const d = e.clientY - g.startPt.y;
        setSwipeDy(d > 0 ? d : d / 3);
      }
    },
    [pointers, scale],
  );

  const endPointer = useCallback(
    (e: React.PointerEvent) => {
      pointers.delete(e.pointerId);
      const g = gestureRef.current;

      if (g.mode === "swipe") {
        if (Math.abs(swipeDy) > CLOSE_SWIPE_DY) {
          onClose();
        } else {
          setSwipeDy(0);
        }
      }

      if (g.mode === "pinch" && pointers.size < 2) {
        // если ушли ниже минимума — снапим к 1× и центру
        if (scale <= 1.05) {
          setScale(1);
          setTx(0);
          setTy(0);
        }
      }

      if (pointers.size === 0) {
        gestureRef.current.mode = "none";
        setDragging(false);

        // double-tap detect: только если это был короткий тап без жеста
        const wasSwipe = g.mode === "swipe" && Math.abs(swipeDy) > 6;
        const wasPan = g.mode === "pan";
        const wasPinch = g.mode === "pinch";
        if (!wasSwipe && !wasPan && !wasPinch) {
          const now = Date.now();
          if (now - lastTap.current < DOUBLE_TAP_MS) {
            lastTap.current = 0;
            handleDoubleTap(e.clientX, e.clientY);
          } else {
            lastTap.current = now;
            // Одиночный тап по картинке при 1× — закрываем через задержку,
            // если за это время не пришёл второй тап (double-tap для зума).
            if (scale === 1 && !onDoubleTap) {
              const stamp = lastTap.current;
              window.setTimeout(() => {
                if (lastTap.current === stamp) onClose();
              }, DOUBLE_TAP_MS + 20);
            }
          }
        }
      } else if (pointers.size === 1) {

        // Один палец остался после пинча → продолжаем как pan/swipe.
        const [only] = Array.from(pointers.values());
        gestureRef.current = {
          mode: scale > 1 ? "pan" : "swipe",
          startScale: scale,
          startTx: tx,
          startTy: ty,
          startDist: 0,
          startMid: { x: 0, y: 0 },
          startPt: { x: only.x, y: only.y },
        };
      }
    },
    [pointers, onClose, scale, swipeDy, tx, ty],
  );

  const handleDoubleTap = (cx: number, cy: number) => {
    if (scale > 1) {
      setScale(1);
      setTx(0);
      setTy(0);
      return;
    }
    // 1× → если есть onDoubleTap (например, like) — вызываем его и не зумим.
    if (onDoubleTap) {
      onDoubleTap();
      return;
    }
    const next = 2.5;
    const ww = window.innerWidth / 2;
    const wh = window.innerHeight / 2;
    setScale(next);
    setTx((ww - cx) * (next - 1));
    setTy((wh - cy) * (next - 1));
  };

  if (!open || typeof document === "undefined") return null;

  const fade = Math.max(0, 1 - Math.abs(swipeDy) / 400);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{
        background: `rgba(0,0,0,${0.94 * fade})`,
        transition: dragging ? undefined : "background 220ms",
        // Radix Dialog/Sheet ставит pointer-events:none на body — портал наследует
        // это и клики (крестик, тап-вне-картинки) перестают работать в PWA.
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && scale === 1) onClose();
      }}
    >

      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur"
      >
        <X size={20} />
      </button>
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className="max-h-full max-w-full touch-none select-none object-contain"
        style={{
          transform: `translate3d(${tx}px, ${ty + swipeDy}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragging
            ? undefined
            : "transform var(--motion-base) var(--ease-out-soft)",
          willChange: "transform",
          viewTransitionName: open ? transitionName : undefined,
        }}
      />
    </div>,
    document.body,
  );
}
