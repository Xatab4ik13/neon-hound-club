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
      className={className}
      // SVG-инлайн, чтобы currentColor работал и можно было красить через text-*
      dangerouslySetInnerHTML={{ __html: SRC[name] }}
    />
  );
}
