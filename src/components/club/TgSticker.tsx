import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web";
import { ungzip } from "pako";

/**
 * Универсальный рендерер стикеров.
 *  - .tgs  (gzipped Lottie JSON, Telegram animated)
 *  - .json (Lottie)
 *  - .webm / .mp4 (video)
 *  - .webp / .png / .gif / .jpg (статика)
 */
export type StickerKind = "tgs" | "lottie" | "video" | "image";

interface Props {
  src: string;
  kind?: StickerKind;
  size?: number | string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  alt?: string;
}

export interface TgStickerHandle {
  /** Перезапустить анимацию с нулевого кадра (Telegram-style replay on tap). */
  replay: () => void;
}

function detectKind(src: string): StickerKind {
  const u = src.split("?")[0].toLowerCase();
  if (u.endsWith(".tgs")) return "tgs";
  if (u.endsWith(".json")) return "lottie";
  if (u.endsWith(".webm") || u.endsWith(".mp4")) return "video";
  return "image";
}

// Глобальный кеш распарсенного Lottie JSON, чтобы повторное открытие пикера
// и повторный рендер одного и того же стикера были мгновенными.
const lottieCache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

async function loadLottieJson(src: string, kind: StickerKind): Promise<unknown> {
  const cached = lottieCache.get(src);
  if (cached) return cached;
  const pending = inflight.get(src);
  if (pending) return pending;

  const p = (async () => {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    let json: unknown;
    if (kind === "tgs") {
      const buf = new Uint8Array(await res.arrayBuffer());
      const decoded = ungzip(buf);
      json = JSON.parse(new TextDecoder("utf-8").decode(decoded));
    } else {
      json = await res.json();
    }
    lottieCache.set(src, json);
    inflight.delete(src);
    return json;
  })();
  inflight.set(src, p);
  return p;
}

export const TgSticker = forwardRef<TgStickerHandle, Props>(function TgSticker(
  { src, kind, size = 128, loop = true, autoplay = true, className, alt = "sticker" },
  ref,
) {
  const k = kind ?? detectKind(src);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      replay: () => {
        if (animRef.current) {
          // Lottie: на повторный тап перезапускаем с 0 и играем 1 раз
          // (если loop=false снаружи) или просто прокручиваем заново.
          animRef.current.goToAndPlay(0, true);
        } else if (videoRef.current) {
          try {
            videoRef.current.currentTime = 0;
            void videoRef.current.play();
          } catch {
            /* no-op */
          }
        }
      },
    }),
    [],
  );

  // Наблюдаем за видимостью: загружаем и анимируем только когда стикер
  // реально попал в зону видимости. Это снимает 90% лага при открытии пикера.
  useEffect(() => {
    if (k !== "tgs" && k !== "lottie") return;
    const el = containerRef.current;
    if (!el) return;
    // Если IntersectionObserver недоступен — сразу видимый.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "150px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [k]);

  useEffect(() => {
    if (k !== "tgs" && k !== "lottie") return;
    if (!visible) return;
    let cancelled = false;

    (async () => {
      try {
        const json = await loadLottieJson(src, k);
        if (cancelled || !containerRef.current) return;
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay,
          animationData: json,
          rendererSettings: {
            progressiveLoad: true,
            hideOnTransparent: true,
          },
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setError(msg);
      }
    })();

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [src, k, loop, autoplay, visible]);

  const style = { width: size, height: size };

  if (error) {
    return (
      <div
        style={style}
        className={`flex items-center justify-center rounded bg-white/5 text-[10px] text-white/40 ${className ?? ""}`}
        title={error}
      >
        ?
      </div>
    );
  }

  if (k === "video") {
    return (
      <video
        ref={videoRef}
        src={src}
        style={style}
        className={className}
        autoPlay={autoplay}
        loop={loop}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  if (k === "image") {
    return (
      <img
        src={src}
        alt={alt}
        style={style}
        className={className}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return <div ref={containerRef} style={style} className={className} aria-label={alt} />;
});

export default TgSticker;
