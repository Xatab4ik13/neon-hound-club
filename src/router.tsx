import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SplashScreen } from "@/components/brand/SplashScreen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // Бывший 400/500 ловил splash на каждом переходе между вкладками клуба.
    // Поднимаем порог: splash показываем только на «холодных» долгих загрузках.
    defaultPendingMs: 1200,
    defaultPendingMinMs: 400,
    defaultPendingComponent: SplashScreen,
  });

  return router;
};
