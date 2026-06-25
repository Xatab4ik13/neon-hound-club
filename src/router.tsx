import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Boot-splash из index.html уже показан до загрузки React-бандла и
    // снимается в main.tsx после первого resolve. На дальнейших переходах
    // splash не нужен — это давало двойное мерцание в PWA.
  });

  return router;
};
