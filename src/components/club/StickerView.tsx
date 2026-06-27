// Универсальный рендерер стикера-картинки.
// Если URL — .tgs/.json (Telegram animated / Lottie), используем TgSticker (lottie-web).
// Иначе — обычный <img> (webp/png/gif/webm-poster и т.п.).
//
// Размер задаётся через `size` (px) ИЛИ через className (w-full h-full + квадратный контейнер).
import { forwardRef } from "react";
import { TgSticker, type TgStickerHandle } from "./TgSticker";

function isAnimated(url: string): boolean {
  const u = url.split("?")[0].toLowerCase();
  return u.endsWith(".tgs") || u.endsWith(".json") || u.endsWith(".lottie");
}

export type StickerViewHandle = TgStickerHandle;

interface Props {
  url: string;
  alt?: string;
  /** Фиксированный размер в px. Если не задан — растягиваемся через className. */
  size?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  /** Превью-режим для сеток: показываем только первый кадр, без RAF/анимации. */
  preview?: boolean;
}

export const StickerView = forwardRef<StickerViewHandle, Props>(function StickerView(
  { url, alt = "стикер", size, className, loop = true, autoplay = true, preview = false },
  ref,
) {
  if (isAnimated(url)) {
    return (
      <TgSticker
        ref={ref}
        src={url}
        size={size ?? "100%"}
        loop={preview ? false : loop}
        autoplay={preview ? false : autoplay}
        className={className}
        alt={alt}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      width={size ?? 128}
      height={size ?? 128}
      loading="lazy"
      decoding="async"
      draggable={false}
      referrerPolicy="no-referrer"
      className={className ?? "h-full w-full select-none object-contain"}
      style={size ? { width: size, height: size } : undefined}
    />
  );
});

export default StickerView;
