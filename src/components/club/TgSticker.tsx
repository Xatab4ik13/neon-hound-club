import { useEffect, useRef, useState } from "react";
import lottie, { type AnimationItem } from "lottie-web";
import { inflate } from "pako";

/**
 * Универсальный рендерер стикеров.
 * Поддерживает:
 *  - .tgs  (gzipped Lottie JSON, Telegram animated stickers)
 *  - .json (Lottie)
 *  - .webm / .mp4 (Telegram video stickers)
 *  - .webp / .png / .gif / .jpg (статика)
 *
 * Тип определяется по расширению в `src` ИЛИ через явный `kind`.
 */
export type StickerKind = "tgs" | "lottie" | "video" | "image";

interface Props {
  src: string;
  kind?: StickerKind;
  size?: number;          // px, по умолчанию 128
  loop?: boolean;         // по умолчанию true
  autoplay?: boolean;     // по умолчанию true
  className?: string;
  alt?: string;
}

function detectKind(src: string): StickerKind {
  const u = src.split("?")[0].toLowerCase();
  if (u.endsWith(".tgs")) return "tgs";
  if (u.endsWith(".json")) return "lottie";
  if (u.endsWith(".webm") || u.endsWith(".mp4")) return "video";
  return "image";
}

export function TgSticker({
  src,
  kind,
  size = 128,
  loop = true,
  autoplay = true,
  className,
  alt = "sticker",
}: Props) {
  const k = kind ?? detectKind(src);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (k !== "tgs" && k !== "lottie") return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        let json: unknown;
        if (k === "tgs") {
          const buf = new Uint8Array(await res.arrayBuffer());
          const decoded = inflate(buf);
          const txt = new TextDecoder("utf-8").decode(decoded);
          json = JSON.parse(txt);
        } else {
          json = await res.json();
        }
        if (cancelled || !containerRef.current) return;
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay,
          animationData: json,
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
  }, [src, k, loop, autoplay]);

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

  // tgs / lottie
  return <div ref={containerRef} style={style} className={className} aria-label={alt} />;
}

export default TgSticker;
