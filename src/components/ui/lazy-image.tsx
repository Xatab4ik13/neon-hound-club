// Изображение с blur-up + плавным fade-in. Решает «моргание»
// карточек товаров на скролле: вместо скачка картинки — мягкое появление
// на цветном плейсхолдере.
//
// Использование:
//   <LazyImage src={url} alt="..." className="h-full w-full object-cover" />

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> & {
  /** Класс для обёртки (нужен, если родитель не задаёт размер). */
  wrapperClassName?: string;
  /** Цвет «подложки» под пустую картинку. По умолчанию — surface клуба. */
  placeholderClassName?: string;
  eager?: boolean;
};

export function LazyImage({
  src,
  alt = "",
  className,
  wrapperClassName,
  placeholderClassName,
  eager = false,
  onLoad,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn("relative h-full w-full overflow-hidden", wrapperClassName)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-white/[0.04] to-white/[0.01]",
          !loaded && "skeleton-shimmer",
          loaded && "opacity-0 transition-opacity duration-300",
          placeholderClassName,
        )}
      />
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
}
