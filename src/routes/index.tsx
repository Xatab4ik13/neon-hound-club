import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Hero } from "@/components/brand/Hero";
import { useViewer } from "@/hooks/use-viewer";
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
          "Андеграундный мотоклуб. Лимитированный мерч, Race Pass, уровни и XP.",
      },
      { property: "og:image", content: pinkR6 },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

// Лестница рангов клуба. Источник правды — src/data/ranks.ts.
// Здесь только то, что нужно на главной (label + порог + accent для подсветки).
const RANK_LADDER: Array<{
  num: string;
  label: string;
  short: string;
  from: number;
  accent: string;
  hint: string;
}> = [
  { num: "01", label: "ROOKIE",       short: "Старт",        from: 0,      accent: "var(--primary)", hint: "сразу после регистрации" },
  { num: "02", label: "PIT CREW",     short: "Свой",          from: 500,    accent: "#b8a48a",        hint: "первая неделя активности" },
  { num: "03", label: "ROAD CAPTAIN", short: "Регуляр",       from: 2000,   accent: "#d4d0c4",        hint: "1–1.5 месяца" },
  { num: "04", label: "ALPHA HOUND",  short: "Ядро",          from: 6000,   accent: "#b48dff",        hint: "3–4 месяца" },
  { num: "05", label: "HELL LEGEND",  short: "Элита (≈5%)",    from: 15000,  accent: "#ffb648",        hint: "10–14 месяцев" },
];

// За что даём XP — короткий top-3 для главной.
// Полный справочник — src/data/xp-sources.ts.
const XP_HOW: Array<{ title: string; value: string }> = [
  { title: "Билет в розыгрыш",       value: "+5 XP" },
  { title: "Покупка мерча",          value: "+1 XP / 100 ₽" },
  { title: "Hell Pass (ежемесячно)", value: "+50…400 XP" },
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
  const { isAuthed, nick, tier, tickets } = useViewer();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {isAuthed && (
        <div className="mt-20 border-b border-primary/20 bg-primary/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-3 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
              />
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                Вы в клубе
              </span>
              <span className="text-muted-foreground">
                {nick} · {tier} · {tickets} билетов
              </span>
            </div>
            <Link
              to="/club"
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground transition-colors hover:text-primary"
            >
              В личный кабинет →
            </Link>
          </div>
        </div>
      )}

      <main>
        {/* HERO */}
        <Hero />

        {/* POPULAR PRODUCTS */}
        <section id="drop" className="bg-surface py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
                  Магазин
                </div>
                <h2 className="text-balance font-display text-4xl uppercase tracking-tight md:text-5xl">
                  Популярные товары
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                Смотреть больше
                <span className="text-[10px]">→</span>
              </Link>
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
              {/* Лестница рангов */}
              <div>
                <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
                  Клуб
                </div>
                <h2 className="mb-3 font-display text-5xl uppercase tracking-tighter">
                  Лестница рангов
                </h2>
                <p className="mb-8 max-w-[44ch] text-sm text-muted-foreground">
                  Ранг растёт за реальные действия: участие в розыгрышах, покупки
                  мерча, подписка Hell Pass. Без накруток.
                </p>
                <div className="space-y-3">
                  {RANK_LADDER.map((r, i) => {
                    const next = RANK_LADDER[i + 1];
                    const rangeLabel = next
                      ? `${r.from.toLocaleString("ru-RU")} — ${(next.from - 1).toLocaleString("ru-RU")} XP`
                      : `${r.from.toLocaleString("ru-RU")}+ XP`;
                    return (
                      <div
                        key={r.num}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm text-muted-foreground">
                            {r.num}
                          </span>
                          <div className="flex flex-col">
                            <span
                              className="font-display text-base uppercase tracking-widest"
                              style={{ color: r.accent }}
                            >
                              {r.label}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                              {r.short} · {r.hint}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {rangeLabel}
                        </span>
                      </div>
                    );
                  })}
                  {/* VIP — отдельной плашкой, не в XP-цепочке */}
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-border bg-surface/50 p-4">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-muted-foreground">
                        ★
                      </span>
                      <div className="flex flex-col">
                        <span className="font-display text-base uppercase tracking-widest text-foreground">
                          VIP
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          Платный · вне XP-лестницы
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      от 4 990 ₽
                    </span>
                  </div>
                </div>
              </div>

              {/* Как качать ранг */}
              <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-10">
                <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
                  Как качать ранг
                </div>
                <h3 className="mb-6 font-display text-3xl uppercase tracking-tight">
                  XP за реальные действия
                </h3>
                <ul className="space-y-4">
                  {XP_HOW.map((s) => (
                    <li
                      key={s.title}
                      className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                    >
                      <span className="text-sm text-foreground">{s.title}</span>
                      <span className="font-mono text-sm font-bold tabular-nums text-primary">
                        {s.value}
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 max-w-[44ch] text-pretty text-sm text-muted-foreground">
                  Плюс прохождение курсов Школы, daily-стрики и сезонные квесты.
                  Победа в розыгрыше — отдельно.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to={isAuthed ? "/club/me" : "/login"}
                    className="inline-flex items-center gap-2 border border-primary/60 bg-primary/10 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                  >
                    {isAuthed ? "Мой прогресс" : "Войти в клуб"}
                  </Link>
                  <Link
                    to="/hell-pass"
                    className="inline-flex items-center gap-2 border border-border px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                  >
                    Hell Pass
                  </Link>
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
