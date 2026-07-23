// Страница одной новости. Источник — реальный /api/v1/news/:id.
// /club/n/$newsId

import { createFileRoute, Link } from "@tanstack/react-router";
import { PlumpArrowLeft as ArrowLeft } from "@/components/ui/icons";
import { NewsPostCard } from "@/components/club/NewsPostCard";
import { useNewsPostById } from "@/lib/news-api";

export const Route = createFileRoute("/club/n/$newsId")({
  head: () => ({
    meta: [
      { title: "Новость — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SingleNewsPage,
});

function SingleNewsPage() {
  const { newsId } = Route.useParams();
  const { data: post, isLoading, isError } = useNewsPostById(newsId);

  return (
    <main className="mx-auto w-full max-w-[640px] px-3 py-5 md:px-4 md:py-10">
      <Link
        to="/club"
        className="mb-4 inline-flex items-center gap-2 px-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Лента
      </Link>

      {isLoading ? (
        <div className="rounded-[20px] border border-white/[0.06] bg-white/[0.02] p-6 text-center text-[13px] text-muted-foreground">
          Загружаем…
        </div>
      ) : post ? (
        <NewsPostCard post={post} standalone />
      ) : (
        <div className="rounded-[20px] border border-destructive/30 bg-destructive/[0.06] p-6 text-center">
          <p className="text-[14px] text-foreground/80">
            {isError ? "Не удалось загрузить новость." : "Новость не найдена или была удалена."}
          </p>
        </div>
      )}
    </main>
  );
}
