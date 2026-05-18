import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { NEWS } from "@/data/news";

export const Route = createFileRoute("/news/$slug")({
  loader: ({ params }) => {
    const item = NEWS.find((n) => n.slug === params.slug);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ params, loaderData }) => {
    const item = loaderData?.item;
    if (!item) return { meta: [{ title: "Новость — HELLHOUND" }] };
    const title = `${item.title} — HELLHOUND`;
    return {
      meta: [
        { title },
        { name: "description", content: item.excerpt },
        { property: "og:title", content: item.title },
        { property: "og:description", content: item.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/news/${params.slug}` },
        ...(item.cover
          ? [
              { property: "og:image", content: item.cover },
              { property: "twitter:image", content: item.cover },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: `/news/${params.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: item.title,
            datePublished: item.date,
            description: item.excerpt,
            ...(item.cover ? { image: item.cover } : {}),
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-32 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          404
        </div>
        <h1 className="mt-3 font-display text-4xl uppercase tracking-tighter">
          Новость не найдена
        </h1>
        <Link
          to="/news"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
        >
          ← Ко всем новостям
        </Link>
      </main>
      <Footer />
    </div>
  ),
  component: NewsArticlePage,
});

const FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function NewsArticlePage() {
  const { item } = Route.useLoaderData() as { item: (typeof import("@/data/news").NEWS)[number] };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-8">
        <Link
          to="/news"
          className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          ← Новости
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <span className="text-primary">{item.tag}</span>
          <span aria-hidden>·</span>
          <time dateTime={item.date}>{FMT.format(new Date(item.date))}</time>
        </div>

        <h1 className="mt-3 font-display text-4xl font-black uppercase italic leading-[1.05] tracking-tighter md:text-5xl">
          {item.title}
        </h1>

        <p className="mt-5 text-lg text-muted-foreground">{item.excerpt}</p>

        {item.cover && (
          <img
            src={item.cover}
            alt={item.title}
            className="mt-8 w-full rounded-md border border-border object-cover"
          />
        )}

        <article className="mt-10 space-y-5 text-base leading-relaxed text-foreground/90">
          {item.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      </main>
      <Footer />
    </div>
  );
}
