import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { NEWS } from "@/data/news";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Новости — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "Новости клуба HELLHOUND: мерч, Hell Pass, розыгрыши, школа и анонсы.",
      },
      { property: "og:title", content: "Новости HELLHOUND" },
      {
        property: "og:description",
        content: "Анонсы клуба, мерча, Hell Pass, розыгрышей и школы.",
      },
      { property: "og:url", content: "/news" },
    ],
    links: [{ rel: "canonical", href: "/news" }],
  }),
  component: NewsListPage,
});

const FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function NewsListPage() {
  const sorted = [...NEWS].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-32 md:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
          Новости клуба
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase italic tracking-tighter md:text-6xl">
          Новости
        </h1>

        <ul className="mt-12 space-y-4">
          {sorted.map((n) => (
            <li key={n.slug}>
              <Link
                to="/news/$slug"
                params={{ slug: n.slug }}
                className="group grid gap-6 border border-border bg-card p-4 transition-colors hover:border-primary/60 md:grid-cols-[280px_1fr] md:p-6"
              >
                {n.cover ? (
                  <div className="overflow-hidden border border-border bg-muted">
                    <img
                      src={n.cover}
                      alt={n.title}
                      loading="lazy"
                      className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] border border-border bg-muted md:h-full" />
                )}
                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                    <span className="text-primary">{n.tag}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={n.date}>{FMT.format(new Date(n.date))}</time>
                  </div>
                  <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight transition-colors group-hover:text-primary md:text-3xl">
                    {n.title}
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {n.excerpt}
                  </p>
                  <span className="mt-auto pt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-foreground transition-colors group-hover:text-primary">
                    Читать <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
