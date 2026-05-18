import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";

export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Школа HELLHOUND — скоро" },
      {
        name: "description",
        content: "Школа HELLHOUND. Скоро открытие.",
      },
      { property: "og:title", content: "Школа HELLHOUND" },
      { property: "og:description", content: "Скоро открытие." },
      { property: "og:url", content: "/school" },
    ],
    links: [{ rel: "canonical", href: "/school" }],
  }),
  component: SchoolPage,
});

function SchoolPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
            Скоро
          </p>
          <h1 className="font-display text-5xl font-black uppercase italic tracking-tight text-foreground md:text-7xl">
            Школа HELLHOUND
          </h1>
          <p className="mt-6 font-mono text-sm uppercase tracking-widest text-muted-foreground">
            скоро открытие
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
