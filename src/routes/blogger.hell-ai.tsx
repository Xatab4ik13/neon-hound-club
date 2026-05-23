// Hell AI для блогера — переиспользуем компонент из /club, но грузим лениво,
// чтобы блогерский чанк не утягивал ~50KB Hell AI.
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const HellAiPage = lazy(() =>
  import("./club.hell-ai").then((m) => ({ default: m.HellAiPage })),
);

export const Route = createFileRoute("/blogger/hell-ai")({
  head: () => ({
    meta: [
      { title: "Hell AI — кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          …
        </div>
      }
    >
      <HellAiPage />
    </Suspense>
  ),
});
