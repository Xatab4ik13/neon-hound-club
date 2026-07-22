import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PlumpArrowRight,
  PlumpNumber0,
  PlumpNumber1,
  PlumpNumber2,
  PlumpNumber3,
  PlumpNumber4,
  PlumpNumber5,
  PlumpNumber6,
  PlumpNumber7,
  PlumpNumber8,
  PlumpNumber9,
} from "@/components/ui/icons";

const PRICE_DIGIT_ICONS = [
  PlumpNumber0,
  PlumpNumber1,
  PlumpNumber2,
  PlumpNumber3,
  PlumpNumber4,
  PlumpNumber5,
  PlumpNumber6,
  PlumpNumber7,
  PlumpNumber8,
  PlumpNumber9,
];

function PlumpPrice({ value, size = 13 }: { value: number; size?: number }) {
  const digits = Math.round(value).toString().split("");
  return (
    <span className="inline-flex items-center leading-none" aria-label={`${value} ₽`}>
      {digits.map((d, i) => {
        if (d === " ") return <span key={i} style={{ width: size * 0.25 }} />;
        const Icon = PRICE_DIGIT_ICONS[Number(d)];
        return <Icon key={i} size={size} />;
      })}
      <span className="ml-1 font-mono text-sm">₽</span>
    </span>
  );
}
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { Hero } from "@/components/brand/Hero";
import { AppShowcase } from "@/components/brand/AppShowcase";
import { useViewer } from "@/hooks/use-viewer";
import { fetchShopShowcase, qk } from "@/lib/queries";
import { isClubHost } from "@/lib/host";
import pinkR6 from "@/assets/pink-r6.jpg";
import vanyaBike from "@/assets/vanya-bike.webp";
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
            {/* Заголовок слева, кнопка справа на одной линии */}
            <div className="flex flex-col items-start gap-4 px-6 md:flex-row md:items-center md:justify-between md:px-8">
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
                className="group inline-flex items-center gap-2 rounded-2xl border-[3px] border-foreground bg-card px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:text-primary hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] active:scale-[0.98]"
              >
                Смотреть больше
                <PlumpArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </Link>
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

              {/* Товары справа — 3 в ряд на десктопе, опущены на 3 см ниже и сдвинуты на 2 см правее */}
              <div className="w-full px-6 lg:w-[48%] lg:-translate-x-[calc(4vw_-_2cm)] lg:-translate-y-[calc(6vw_-_3cm)] lg:pl-0 lg:pr-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:scale-[1.38] lg:origin-bottom-right">
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
                            <PlumpPrice value={p.priceRub} />
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


        {/* Плавный переход от магазина к блоку приложения */}
        <div
          aria-hidden
          className="h-24 w-full bg-gradient-to-b from-surface via-surface/60 to-background md:h-32"
        />

        {/* APP SHOWCASE */}
        <AppShowcase />

      </main>

      <Footer />
    </div>
  );
}
