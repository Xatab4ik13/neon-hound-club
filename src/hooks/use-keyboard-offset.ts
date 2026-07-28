// Возвращает высоту клавиатуры в px и актуальную высоту visualViewport.
// visualHeight — правдивая высота видимой области с учётом клавиатуры и
// input-accessory bar браузера. Использовать напрямую вместо `100dvh`, когда
// нужно точно вписаться в видимую область над клавиатурой.

import { useEffect, useState } from "react";

export function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  const [visualHeight, setVisualHeight] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 0,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    function update() {
      if (!vv) return;
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setOffset(next);
      setVisualHeight(vv.height);
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

/** То же, но возвращает и высоту visual viewport. */
export function useVisualViewport() {
  const [state, setState] = useState<{ offset: number; height: number }>(() => ({
    offset: 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    function update() {
      if (!vv) return;
      const off = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({ offset: off, height: vv.height });
    }
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}
