import { createFileRoute, Link } from "@tanstack/react-router";
import { PlumpArrowRight } from "@/components/ui/icons";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Hero } from "@/components/brand/Hero";
import { useViewer } from "@/hooks/use-viewer";
import { fetchShopShowcase, qk } from "@/lib/queries";
import { RANKS, XP_THRESHOLDS, type RankId } from "@/data/ranks";
import { XP_SOURCES } from "@/data/xp-sources";
import { isClubHost } from "@/lib/host";
import pinkR6 from "@/assets/pink-r6.jpg";
import vanyaBike from "@/assets/vanya-bike.png";
import vybiraySpeech from "@/assets/vybiray-luchshee.png.asset.json";



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

// Подписи рангов для главной (продуктовая редактура поверх RANKS из бэка).
const RANK_TAGLINE: Record<RankId, { tag: string; hint: string }> = {
  "rookie":       { tag: "Старт",          hint: "сразу после регистрации" },
  "pit-crew":     { tag: "Свой",           hint: "первая неделя активности" },
  "road-captain": { tag: "Регуляр",        hint: "1–1.5 месяца" },
  "alpha-hound":  { tag: "Ядро",           hint: "3–4 месяца" },
  "hell-legend":  { tag: "Элита (≈5%)",    hint: "10–14 месяцев" },
};

// Лестница рангов — собираем из источника правды (src/data/ranks.ts).
const RANK_LADDER = RANKS.map((r, i) => {
  const from = XP_THRESHOLDS[i];
  const next = XP_THRESHOLDS[i + 1];
  return {
    num: String(i + 1).padStart(2, "0"),
    label: r.label,
    accent: r.accent,
    from,
    rangeLabel: next
      ? `${from.toLocaleString("ru-RU")} — ${(next - 1).toLocaleString("ru-RU")} XP`
      : `${from.toLocaleString("ru-RU")}+ XP`,
    tag: RANK_TAGLINE[r.id].tag,
    hint: RANK_TAGLINE[r.id].hint,
  };
});

// Топ-3 источника XP для главной — берём из общего справочника по id.
const XP_HOW_IDS = ["postcard-buy", "merch-buy", "pass-platinum"] as const;
const XP_HOW = XP_HOW_IDS.map((id) => {
  const src = XP_SOURCES.find((s) => s.id === id)!;
  // Для главной упрощаем: Hell Pass показываем диапазоном.
  if (id === "pass-platinum") return { title: "Hell Pass (ежемесячно)", value: "+50…400 XP" };
  if (id === "postcard-buy")  return { title: "Билет в розыгрыш", value: "+5 XP" };
  return { title: src.title, value: src.xp };
});

function Index() {
  const { isAuthed } = useViewer();

  // На club.hhr.pro корня лендинга нет — мгновенно уводим в /club.
  useEffect(() => {
    if (typeof window !== "undefined" && isClubHost()) {
      window.location.replace("/club");
    }
  }, []);

  const { data: showcase } = useQuery({
    queryKey: qk.shopShowcase,
    queryFn: fetchShopShowcase,
  });
  const showcaseItems = (showcase?.items ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />


      <main>
        {/* HERO */}
        <Hero />

        {/* Плавный переход от Hero к магазину */}
        <div
          aria-hidden
          className="h-24 w-full bg-gradient-to-b from-background via-background/60 to-surface md:h-32"
        />

        {/* POPULAR PRODUCTS */}
        {showcaseItems.length > 0 && (
          <section id="drop" className="relative bg-surface pb-24 pt-8 md:pt-12">
            {/* Заголовок слева, на одной линии с бургером */}
            <div className="px-6 md:px-8">
              <div className="mb-3 font-mono text-xs uppercase tracking-widest text-primary">
                Магазин
              </div>
              <h2 className="text-balance font-display text-4xl uppercase tracking-tight md:text-5xl">
                Популярные товары
              </h2>
            </div>

            <div className="flex flex-col items-end lg:flex-row lg:items-end">
              {/* Ваня слева — крупный, прижат к левой границе сайта */}
              <div className="relative hidden shrink-0 lg:block lg:w-[52%]">
                <img
                  src={vanyaBike}
                  alt="Ваня — HELLHOUND Racing"
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="h-auto w-full translate-x-[-9vw] translate-y-[7.2vw] object-contain"
                />
                <img
                  src={vybiraySpeech.url}
                  alt="Выбирай лучшее!"
                  loading="lazy"
                  className="pointer-events-none absolute left-0 top-[10%] w-[22%] translate-x-[1.8vw] translate-y-[1.8vw] -rotate-[6deg] object-contain"
                />
              </div>

              {/* Товары справа — 3 в ряд на десктопе, опущены на 1 см ниже */}
              <div className="w-full px-6 lg:w-[48%] lg:-translate-x-[4vw] lg:-translate-y-[calc(6vw_-_1cm)] lg:pl-0 lg:pr-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:scale-[1.2] lg:origin-bottom-right">
                  {showcaseItems.map((p) => {
                    const sold = p.stock !== null && p.stock <= 0;
                    const statusLabel = sold
                      ? "Распродано"
                      : p.kind === "preorder"
                        ? "Предзаказ"
                        : p.stock !== null && p.stock <= 24
                          ? `Осталось ${p.stock}`
                          : "В наличии";
                    const statusColor = sold || p.kind !== "preorder" && (p.stock === null || p.stock > 24)
                      ? "text-muted-foreground"
                      : "text-primary";
                    return (
                      <Link
                        key={p.id}
                        to="/shop/$productSlug"
                        params={{ productSlug: p.slug }}
                        className="group rounded-xl border border-border bg-card p-3 ring-1 ring-black/5 transition-colors hover:border-primary/40"
                      >
                        <div className="mb-3 overflow-hidden rounded-lg border border-border">
                          <img
                            src={p.images[0] ?? pinkR6}
                            alt={p.title}
                            width={768}
                            height={1024}
                            loading="lazy"
                            className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="px-1 pb-1">
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm font-medium uppercase">
                            <span>{p.title}</span>
                            <span className="font-mono">{p.priceRub.toLocaleString("ru-RU")} ₽</span>
                          </div>
                          <div className={`text-[10px] uppercase tracking-widest ${statusColor}`}>
                            {statusLabel}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

          </section>
        )}


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
                  {RANK_LADDER.map((r) => (
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
                            {r.tag} · {r.hint}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {r.rangeLabel}
                      </span>
                    </div>
                  ))}
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
