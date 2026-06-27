// Универсальный рендерер стикера-картинки.
// Если URL — .tgs/.json (Telegram animated / Lottie), используем TgSticker (lottie-web).
// Иначе — обычный <img> (webp/png/gif/webm-poster и т.п.).
//
// Размер задаётся через `size` (px) ИЛИ через className (w-full h-full + квадратный контейнер).
import { TgSticker } from "./TgSticker";

function isAnimated(url: string): boolean {
  const u = url.split("?")[0].toLowerCase();
  return u.endsWith(".tgs") || u.endsWith(".json") || u.endsWith(".lottie");
}

interface Props {
  url: string;
  alt?: string;
  /** Фиксированный размер в px. Если не задан — растягиваемся через className. */
  size?: number;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
}

export function StickerView({ url, alt = "стикер", size, className, loop = true, autoplay = true }: Props) {
  if (isAnimated(url)) {
    // Если size не задан — растягиваемся в родителя (для грид-ячейки).
    if (size == null) {
      return (
        <div className={className ?? "h-full w-full"} aria-label={alt}>
          <TgSticker src={url} size={9999} loop={loop} autoplay={autoplay} alt={alt} className="!h-full !w-full" />
        </div>
      );
    }
    return (
      <TgSticker src={url} size={size} loop={loop} autoplay={autoplay} className={className} alt={alt} />
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
}

export default StickerView;
