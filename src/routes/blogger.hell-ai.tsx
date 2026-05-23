// Hell AI для блогера — переиспользуем компонент из /club, но грузим лениво,
// чтобы блогерский чанк не утягивал ~50KB Hell AI.
import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const HellAiPage = lazy(() =>
  import("./club.hell-ai").then((m) => ({ default: m.HellAiPage })),
);

function HellAiSkeleton() {
  return (
    <div className="flex min-h-[60vh] flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <Skeleton className="ml-auto h-16 w-[75%] rounded-[20px] rounded-br-md" />
        <Skeleton className="mr-auto h-24 w-[82%] rounded-[20px] rounded-bl-md" />
        <Skeleton className="ml-auto h-12 w-[60%] rounded-[20px] rounded-br-md" />
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Skeleton className="h-12 flex-1 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/blogger/hell-ai")({
  head: () => ({
    meta: [
      { title: "Hell AI — кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Suspense fallback={<HellAiSkeleton />}>
      <HellAiPage />
    </Suspense>
  ),
});
