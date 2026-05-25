// Возвращает высоту клавиатуры в px на iOS PWA/Safari, используя visualViewport.
// На десктопе и Android-Chrome (где клавиатура resize-ит layout) вернёт 0.

import { useEffect, useState } from "react";

export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      if (!vv) return;
      // Разница между layout viewport и visual viewport ≈ высота клавиатуры
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(next);
    }

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
