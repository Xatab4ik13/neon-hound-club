import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Hero } from "@/components/brand/Hero";
import pinkR6 from "@/assets/pink-r6.jpg";
import founderHoodie from "@/assets/founder-hoodie.jpg";
import pitGloves from "@/assets/pit-gloves.jpg";
import garageKey from "@/assets/garage-key.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HELLHOUND Racing Club — мерч, Race Pass, гараж" },
      {
        name: "description",
        content:
          "Андеграундный мотоклуб HELLHOUND. Лимитированный мерч, Race Pass, уровни и XP.",
      },
      { property: "og:title", content: "HELLHOUND Racing Club" },
      {
        property: "og:description",
        content:
          "Андеграундный мотоклуб. Лимитированные дропы, Race Pass, уровни и XP.",
      },
      { property: "og:image", content: pinkR6 },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TIERS = [
  { num: "01", name: "Новичок", xp: "0 — 500 XP", state: "locked" as const },
  { num: "02", name: "Райдер", xp: "Текущий уровень", state: "active" as const },
  { num: "03", name: "Пит-крю", xp: "1500 XP", state: "future" as const },
  { num: "04", name: "Элита", xp: "5000 XP", state: "future" as const },
];

const PRODUCTS = [
  {
    name: "Худи Founder v1",
    price: "12 990 ₽",
    status: "Распродано",
    statusColor: "text-muted-foreground",
    image: founderHoodie,
  },
  {
    name: "Перчатки Пит-крю",
    price: "8 490 ₽",
    status: "Осталось 24",
    statusColor: "text-primary",
    image: pitGloves,
  },
  {
    name: "Ключ от гаража",
    price: "2 490 ₽",
    status: "В наличии",
    statusColor: "text-muted-foreground",
    image: garageKey,
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        {/* HERO */}
        <Hero />

        {/* DROP */}
        <section id="drop" className="bg-surface py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
                  Лимитированный мерч
                </div>
                <h2 className="text-balance font-display text-4xl uppercase tracking-tight md:text-5xl">
                  Серия основателей
                </h2>
                <p className="mt-3 max-w-[48ch] text-pretty text-muted-foreground">
                  Лимитированный релиз для основателей клуба. Плотная вышивка,
                  тяжёлый хлопок, без перевыпусков.
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-xl text-primary">ТОЛЬКО 666 ШТ.</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Без перевыпуска
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {PRODUCTS.map((p) => (
                <article
                  key={p.name}
                  className="group rounded-xl border border-border bg-card p-2 ring-1 ring-black/5 transition-colors hover:border-primary/40"
                >
                  <div className="mb-4 overflow-hidden rounded-lg border border-border">
                    <img
                      src={p.image}
                      alt={p.name}
                      width={768}
                      height={1024}
                      loading="lazy"
                      className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="px-2 pb-2">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium uppercase">
                      <span>{p.name}</span>
                      <span className="font-mono">{p.price}</span>
                    </div>
                    <div
                      className={`text-[10px] uppercase tracking-widest ${p.statusColor}`}
                    >
                      {p.status}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CLUB / HIERARCHY */}
        <section id="club" className="px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-16 lg:grid-cols-2">
              <div>
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
                  Клуб
                </div>
                <h2 className="mb-8 font-display text-5xl uppercase tracking-tighter">
                  Иерархия
                </h2>
                <div className="space-y-4">
                  {TIERS.map((tier) => {
                    const isActive = tier.state === "active";
                    return (
                      <div
                        key={tier.num}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                          isActive
                            ? "border-primary/40 bg-primary/5"
                            : tier.state === "locked"
                              ? "border-border bg-surface"
                              : "border-border bg-surface/50 opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={`font-mono text-sm ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {tier.num}
                          </span>
                          <span className="font-medium uppercase tracking-widest">
                            {tier.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {tier.xp}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-12">
                <div className="mb-8">
                  <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                    Прогресс участника
                  </div>
                  <div className="font-display text-4xl uppercase">
                    Статус: Райдер
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-background">
                    <div className="h-full w-[56%] bg-primary" />
                  </div>
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-foreground">840 XP</span>
                    <span className="text-muted-foreground">
                      1500 XP до след. уровня
                    </span>
                  </div>
                  <p className="max-w-[40ch] text-pretty text-sm text-muted-foreground">
                    Покупай мерч, участвуй в Race Pass и розыгрышах, чтобы
                    прокачать статус и открыть ранний доступ к новому мерчу.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
