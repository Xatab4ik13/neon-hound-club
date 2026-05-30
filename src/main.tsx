import "./styles.css";

// framer-motion внутри делает `try { require("@emotion/is-prop-valid") } catch {}`.
// В браузерном ESM `require` не существует → бросается ReferenceError. Он
// безопасно ловится try/catch, но если в DevTools включён «Pause on caught
// exceptions», страница встаёт колом на сплэше. Подкладываем шим, чтобы
// исключение вообще не возникало.
import isPropValid from "@emotion/is-prop-valid";
(globalThis as unknown as { require?: (name: string) => unknown }).require = (
  name: string,
) => {
  if (name === "@emotion/is-prop-valid") return { default: isPropValid };
  throw new Error(`require() not supported in browser: ${name}`);
};

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { registerPushSW } from "./lib/push";

const router = getRouter();

// Регистрируем push-SW (внутри сам пропускает iframe / lovable preview).
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    void registerPushSW();
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Снимаем boot-сплеш (из index.html) только когда роутер ДЕЙСТВИТЕЛЬНО
// смонтировал первый match. Без этого получаем кадр пустого фона между
// удалением splash и первым React-рендером — особенно заметно в iOS PWA,
// где нативный launch image гасится сразу.
if (typeof window !== "undefined") {
  const hideBoot = () => {
    const boot = document.getElementById("hh-boot");
    if (!boot || boot.getAttribute("data-hide") === "1") return;
    // двойной rAF гарантирует, что React уже закоммитил DOM и браузер
    // получил кадр с реальным интерфейсом ПОД сплешом — fade выглядит плавно
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        boot.setAttribute("data-hide", "1");
        setTimeout(() => boot.remove(), 400);
      });
    });
  };

  const unsub = router.subscribe("onResolved", () => {
    hideBoot();
    unsub();
  });
  // подстраховка на случай мгновенного матча (subscribe мог опоздать)
  setTimeout(hideBoot, 1500);
}

