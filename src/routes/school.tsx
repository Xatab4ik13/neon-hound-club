import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Школа Hellhound — курсы для райдеров" },
      {
        name: "description",
        content:
          "Курсы Школы Hellhound: Город, Трек, Падение. Скоро открытие.",
      },
      { property: "og:title", content: "Школа Hellhound" },
      {
        property: "og:description",
        content: "Курсы для райдеров от команды HELLHOUND Racing.",
      },
    ],
  }),
  component: SchoolPage,
});

function SchoolPage() {
  return (
    <main className="relative min-h-screen bg-background pt-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 20px)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 py-24 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Скоро
        </p>
        <h1 className="mt-4 font-display text-5xl font-bold uppercase italic tracking-tight text-foreground md:text-7xl">
          Школа Hellhound
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Три курса от команды канала: Город, Трек, Падение. Открываем в
          следующем сезоне — следи за новостями.
        </p>
      </div>
    </main>
  );
}
