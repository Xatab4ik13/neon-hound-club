// iOS-style fly-to-cart animation.
// Использует Web Animations API (GPU compositor), не дёргает React.
// Возвращает true если анимация запущена, false — если target/изображение недоступны
// (вызывающий код может показать toast как fallback).

export interface FlyToCartOpts {
  fromRect: DOMRect;
  imageUrl: string;
  /** селектор якоря корзины. По умолчанию [data-cart-anchor]. */
  anchorSelector?: string;
}

export function flyToCart({
  fromRect,
  imageUrl,
  anchorSelector = "[data-cart-anchor]",
}: FlyToCartOpts): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  // Respect reduced motion — даём только bump на badge через событие.
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const target = document.querySelector<HTMLElement>(anchorSelector);
  if (!target || !imageUrl) {
    // Всё равно даём badge bump, чтобы счётчик «дёрнулся».
    window.dispatchEvent(new CustomEvent("hh:cart:landed"));
    return false;
  }

  const toRect = target.getBoundingClientRect();
  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;

  const dx = toX - fromX;
  const dy = toY - fromY;

  if (reduce) {
    window.dispatchEvent(new CustomEvent("hh:cart:landed"));
    return true;
  }

  const SIZE = 44;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:fixed",
    `left:${fromX - SIZE / 2}px`,
    `top:${fromY - SIZE / 2}px`,
    `width:${SIZE}px`,
    `height:${SIZE}px`,
    "border-radius:50%",
    `background-image:url("${imageUrl.replace(/"/g, '\\"')}")`,
    "background-size:cover",
    "background-position:center",
    "box-shadow:0 8px 24px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.08)",
    "pointer-events:none",
    "z-index:9999",
    "will-change:transform,opacity",
    "transform:translate3d(0,0,0) scale(1)",
    "opacity:0",
  ].join(";");

  document.body.appendChild(el);

  // Дуга: промежуточный keyframe смещён вверх, чтобы получилась «горка».
  const arcLift = Math.min(140, Math.max(60, Math.abs(dy) * 0.4 + 60));

  const anim = el.animate(
    [
      { transform: "translate3d(0,0,0) scale(1)", opacity: 0, offset: 0 },
      { transform: "translate3d(0,0,0) scale(1)", opacity: 1, offset: 0.08 },
      {
        transform: `translate3d(${dx * 0.5}px, ${dy * 0.5 - arcLift}px, 0) scale(0.85)`,
        opacity: 1,
        offset: 0.55,
      },
      {
        transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.25)`,
        opacity: 0.6,
        offset: 1,
      },
    ],
    {
      duration: 620,
      easing: "cubic-bezier(.22,.61,.36,1)",
      fill: "forwards",
    },
  );

  anim.onfinish = () => {
    el.remove();
    window.dispatchEvent(new CustomEvent("hh:cart:landed"));
  };
  anim.oncancel = () => el.remove();

  return true;
}
