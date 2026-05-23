// Динамический theme-color для PWA. Когда модалка/шит открыт — статус-бар
// должен совпадать с фоном шита (#0d0d0d), иначе на iOS видно «мерцание»
// при свайпе. После закрытия — возвращаем дефолт из index.html.
//
// Использование:
//   useThemeColor(open ? "#0d0d0d" : null)
// null — вернуть к исходному значению.

import { useEffect } from "react";

const DEFAULT = "#050505";

function getMeta(): HTMLMetaElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('meta[name="theme-color"]');
}

export function useThemeColor(color: string | null) {
  useEffect(() => {
    const meta = getMeta();
    if (!meta) return;
    const prev = meta.getAttribute("content") ?? DEFAULT;
    if (color) {
      meta.setAttribute("content", color);
      return () => {
        meta.setAttribute("content", prev);
      };
    }
    return;
  }, [color]);
}
