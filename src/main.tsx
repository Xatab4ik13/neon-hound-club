import "./styles.css";

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

// Снимаем boot-сплеш (из index.html) после первого кадра React
if (typeof window !== "undefined") {
  requestAnimationFrame(() => {
    const boot = document.getElementById("hh-boot");
    if (!boot) return;
    boot.setAttribute("data-hide", "1");
    setTimeout(() => boot.remove(), 350);
  });
}
