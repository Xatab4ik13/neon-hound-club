// Streamline Milano illustrations. SVG-исходники с fill="currentColor" —
// цвет управляется через className (text-*). Размер — через width/height классы.
import emptyOrderSrc from "@/assets/illustrations/empty-order.svg?raw";
import motorcycleSrc from "@/assets/illustrations/motorcycle.svg?raw";
import pageNotFoundSrc from "@/assets/illustrations/page-not-found.svg?raw";

const SRC = {
  "empty-order": emptyOrderSrc,
  motorcycle: motorcycleSrc,
  "page-not-found": pageNotFoundSrc,
} as const;

export type IllustrationName = keyof typeof SRC;

export function Illustration({
  name,
  className = "h-40 w-40 text-foreground/70",
}: {
  name: IllustrationName;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      // [&>svg] переопределяет жёстко зашитые в исходнике width/height="400"
      // и preserveAspectRatio, чтобы картинка занимала контейнер по классам
      // (h-* w-*) и не вылезала за пределы, налезая на текст.
      className={`grid place-items-center overflow-hidden [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full ${className}`}
      // SVG-инлайн, чтобы currentColor работал и можно было красить через text-*
      dangerouslySetInnerHTML={{ __html: SRC[name] }}
    />
  );
}

