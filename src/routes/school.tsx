import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/school")({
  head: () => ({
    meta: [
      { title: "Школа HELLHOUND — курсы для райдеров" },
      {
        name: "description",
        content:
          "Школа HELLHOUND: курсы по городу, треку и контраварийной подготовке. Открытие скоро.",
      },
      { property: "og:title", content: "Школа HELLHOUND" },
      {
        property: "og:description",
        content:
          "Курсы по городу, треку и контраварийной подготовке. Открытие скоро.",
      },
      { property: "og:url", content: "/school" },
    ],
    links: [{ rel: "canonical", href: "/school" }],
  }),
  component: SchoolPage,
});

const COURSES = [
  {
    code: "01",
    title: "Город",
    line: "Базовые навыки и безопасность в городском потоке.",
    points: ["Посадка, торможение, траектория", "Зоны риска", "Реакция на провокации"],
  },
  {
    code: "02",
    title: "Трек",
    line: "Скорость и контроль на закрытой площадке.",
    points: ["Корнеринг и точки апекса", "Работа с весом и газом", "Замер времени круга"],
  },
  {
    code: "03",
    title: "Падение",
    line: "Контраварийная: как избежать и что делать, если уже падаешь.",
    points: ["Экстренное торможение", "Уход от препятствия", "Группировка и страховка"],
  },
];

function SchoolPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="relative pt-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, var(--primary) 0, var(--primary) 1px, transparent 0, transparent 20px)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 pb-24 md:px-8">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
              Скоро
            </p>
            <h1 className="mt-4 font-display text-5xl font-black uppercase italic tracking-tight md:text-7xl">
              Школа HELLHOUND
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm text-muted-foreground md:text-base">
              Три курса. Без понтов — навыки, которые реально нужны на дороге и
              на треке. Готовим инструкторов и площадку. Анонс — в новостях
              клуба.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {COURSES.map((c) => (
              <article
                key={c.code}
                className="border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <div className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  /{c.code}
                </div>
                <h2 className="mt-2 font-display text-2xl font-black uppercase italic tracking-tight">
                  {c.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{c.line}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-primary">·</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-14 rounded-lg border border-border bg-card p-8 text-center">
            <h2 className="font-display text-2xl uppercase tracking-tight">
              Хочешь узнать первым?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Открытие, набор групп и расписание — в новостях клуба и в личном
              кабинете для участников Hell Pass.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/news">Новости клуба</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/hell-pass">Hell Pass</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
