// Страница одного поста — для расшаривания и открытия по пушу.
// /club/p/$postId

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchPost } from "@/lib/queries";
import { mapPost } from "@/data/feed-store";
import { PostCard } from "@/routes/club.index";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/club/p/$postId")({
  head: () => ({
    meta: [
      { title: "Пост — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SinglePostPage,
});

function SinglePostPage() {
  const { postId } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["feed", "post", postId],
    queryFn: () => fetchPost(postId),
    staleTime: 30_000,
  });

  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <Link
        to="/club"
        className="mb-4 inline-flex items-center gap-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Лента
      </Link>

      {isLoading && (
        <div className="rounded-[24px] border border-white/[0.06] bg-card/40 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-4 aspect-[16/9] w-full rounded-2xl" />
        </div>
      )}

      {isError && (
        <div className="rounded-[20px] border border-destructive/30 bg-destructive/[0.06] p-6 text-center">
          <p className="text-[14px] text-foreground/80">Пост не найден или был удалён.</p>
        </div>
      )}

      {data && <PostCard post={mapPost(data)} />}
    </main>
  );
}
