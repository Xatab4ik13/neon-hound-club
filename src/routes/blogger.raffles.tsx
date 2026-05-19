import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/blogger/raffles")({
  component: BloggerRafflesPage,
});

function BloggerRafflesPage() {
  return (
    <main className="relative flex-1 px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
          Розыгрыши
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Здесь будут розыгрыши блогера. Содержимое уточним позже.
        </p>

        <div className="mt-8 flex h-64 items-center justify-center border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-muted-foreground">
          Пусто
        </div>
      </div>
    </main>
  );
}
