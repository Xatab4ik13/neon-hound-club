import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";

import { ViewerProvider } from "@/hooks/use-viewer";
import { CartProvider } from "@/hooks/use-cart";
import { PaymentErrorWatcher } from "@/components/brand/PaymentErrorWatcher";
import { useEffect } from "react";
import { captureRefFromUrl } from "@/data/referral";
import { isClubHost } from "@/lib/host";
import { Illustration } from "@/components/club/Illustration";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <Illustration name="page-not-found" className="h-56 w-56 text-foreground/80" />
        <h1 className="mt-2 text-5xl font-bold text-foreground">404</h1>
        <h2 className="mt-3 text-xl font-semibold text-foreground">Страница не найдена</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Такой страницы не существует или она была перемещена.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  const handleRetry = async () => {
    try {
      // Сбрасываем кэш запросов, чтобы повторно дёрнуть данные
      const { queryClient } = router.options.context as { queryClient?: QueryClient };
      if (queryClient) {
        await queryClient.invalidateQueries();
      }
      await router.invalidate();
      reset();
    } catch {
      // Если что-то пошло не так — жёстко перезагружаем текущий URL
      if (typeof window !== "undefined") window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Страница не загрузилась
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Что-то пошло не так. Попробуйте обновить или вернуться на главную.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Повторить
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#050505" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    captureRefFromUrl();
  }, []);

  // На club.hhr.pro подменяем manifest и title на клубные.
  // Делаем это рантайм-эффектом, потому что head() выполняется в т.ч. на сервере
  // и не знает hostname конкретного запроса.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isClubHost()) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = "/club-manifest.webmanifest";
    document.title = "HELLHOUND Club";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ViewerProvider>
        <CartProvider>
          <PaymentErrorWatcher />
          <Outlet />
        </CartProvider>
      </ViewerProvider>
    </QueryClientProvider>
  );
}
