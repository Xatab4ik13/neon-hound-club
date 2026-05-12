import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import logo1 from "@/assets/logo-mark-1.png";
import logo2 from "@/assets/logo-mark-2.png";
import logo3 from "@/assets/logo-mark-3.png";
import logo4 from "@/assets/logo-mark-4.png";

export const Route = createFileRoute("/logos")({
  head: () => ({
    meta: [{ title: "HELLHOUND — Варианты логотипа" }],
  }),
  component: LogosPage,
});

const VARIANTS = [
  {
    n: "01",
    name: "Hellhound Mark",
    desc: "Геометричная маска-морда. Сильный иконический знак, читается даже в favicon. Универсальный — работает на мерче, печатях, аватарках.",
    img: logo1,
    bg: "bg-background",
  },
  {
    n: "02",
    name: "Racing Club Crest",
    desc: "Круглый шеврон в духе мотоклубов. Тяжелее, более «банда», хорошо живёт на спине худи и нашивках. Хуже масштабируется в маленьких размерах.",
    img: logo2,
    bg: "bg-background",
  },
  {
    n: "03",
    name: "Wordmark + Mark",
    desc: "Горизонтальный леттеринг с интегрированной мордой вместо O и когтями. Главный логотип для шапки сайта, документов, мерча.",
    img: logo3,
    bg: "bg-background",
    wide: true,
  },
  {
    n: "04",
    name: "H Monogram",
    desc: "Монограмма H из двух псов. Самый абстрактный и андеграундный знак. Идеально под app-иконку, нашивки, тиснение.",
    img: logo4,
    bg: "bg-background",
  },
];

function LogosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-6 pt-32 pb-24">
        <div className="mb-16">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
            Brand / Identity
          </div>
          <h1 className="font-display text-5xl uppercase tracking-tighter md:text-7xl">
            Варианты <span className="text-primary">логотипа</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Четыре направления на основе концепта персонажа. Палитра — Hound
            Pink #E91E63 на чёрной базе.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {VARIANTS.map((v) => (
            <article
              key={v.n}
              className="group rounded-xl border border-border bg-surface p-6 ring-1 ring-black/5 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  Variant {v.n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  PNG · Pink/Black
                </span>
              </div>
              <div
                className={`mb-6 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border ${v.bg}`}
              >
                <img
                  src={v.img}
                  alt={v.name}
                  loading="lazy"
                  className={`object-contain ${v.wide ? "w-[85%]" : "w-[65%]"}`}
                />
              </div>
              <div className="mb-2 font-display text-2xl uppercase tracking-tight">
                {v.name}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {v.desc}
              </p>

              {/* On-light preview */}
              <div className="mt-4 flex aspect-[3/1] items-center justify-center overflow-hidden rounded-lg border border-border bg-foreground">
                <img
                  src={v.img}
                  alt={`${v.name} on light`}
                  loading="lazy"
                  className={`object-contain ${v.wide ? "w-[60%]" : "w-[35%]"}`}
                />
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
