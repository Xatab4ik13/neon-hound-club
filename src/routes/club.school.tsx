import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/club/school")({
  head: () => ({
    meta: [
      { title: "Школа Hellhound — курсы для райдеров" },
      {
        name: "description",
        content: "Школа Hellhound. Скоро открытие.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubSchoolPage,
});

function ClubSchoolPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="text-center">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Скоро
        </p>
        <h1 className="font-display text-5xl font-black uppercase italic tracking-tight text-foreground md:text-7xl">
          Школа Hellhound
        </h1>
        <p className="mt-6 font-mono text-sm uppercase tracking-widest text-muted-foreground">
          скоро открытие
        </p>
      </div>
    </main>
  );
}
