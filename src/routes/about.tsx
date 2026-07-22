import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  PlumpAI,
  PlumpGarage,
  PlumpStore,
  PlumpTicket,
  PlumpSchool,
} from "@/components/ui/icons";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О клубе — HELLHOUND Racing Club" },
      {
        name: "description",
        content:
          "HELLHOUND Racing Club — клуб райдеров вокруг YouTube-канала HELLHOUND. Гараж с Hell AI, магазин, розыгрыши и новости, школа.",
      },
      { property: "og:title", content: "О клубе HELLHOUND" },
      {
        property: "og:description",
        content:
          "Клуб райдеров вокруг YouTube-канала HELLHOUND. Гараж с Hell AI, магазин, розыгрыши и новости, школа.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

/* Scroll-reveal helper */
function Reveal({
  children,
  delay = 0,
  from = "up",
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  from?: "up" | "left" | "right";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const hidden =
    from === "left"
      ? "opacity-0 -translate-x-10"
      : from === "right"
        ? "opacity-0 translate-x-10"
        : "opacity-0 translate-y-10";

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${
        visible ? "opacity-100 translate-x-0 translate-y-0" : hidden
      } ${className}`}
    >
      {children}
    </div>
  );
}

type Feature = {
  title: string;
  Icon: typeof PlumpAI;
  lead: string;
  bullets: string[];
  bg: "background" | "surface";
};

const FEATURES: Feature[] = [
  {
    title: "Свой гараж с Hell AI",
    Icon: PlumpGarage,
    lead: "Все твои мотоциклы в одном месте: история обслуживания, документы, траты, пробег. И прямо внутри гаража — Hell AI, персональный AI-механик, который знает именно твой байк.",
    bullets: [
      "Добавляй сколько угодно мотоциклов — от повседневного до трекового",
      "Веди журнал: ТО, замены, доработки, поездки, расходы",
      "Хранишь фото документов и сервисных чеков",
      "Hell AI отвечает по твоей модели, году и пробегу — а не «в среднем»",
      "Разбирается со странным звуком, ошибкой на приборке, регламентом ТО",
    ],
    bg: "background",
  },
  {
    title: "Мерч и амуниция клуба",
    Icon: PlumpStore,
    lead: "Лимитированный мерч HELLHOUND и вещи от партнёров. Всё внутри клуба, с доставкой по России.",
    bullets: [
      "Одежда, аксессуары и коллекционные вещи ограниченным тиражом",
      "Предзаказы на новинки, о которых знают участники клуба",
      "Доставка СДЭК с трекингом прямо в приложении",
      "Билеты за каждую покупку — потом на них разыгрываем призы",
    ],
    bg: "surface",
  },
  {
    title: "Розыгрыши и новости мотоспорта",
    Icon: PlumpTicket,
    lead: "Билеты за активность и покупки, регулярные розыгрыши мотоциклов и призов от амбассадоров — и короткая лента новостей мотоспорта, чтобы быть в курсе без воды.",
    bullets: [
      "Копи билеты за задания, покупки и участие в жизни клуба",
      "Розыгрыши мотоциклов и амуниции — регулярно, а не «когда-нибудь»",
      "Призы от амбассадоров: экипировка, поездки, эксклюзив",
      "Свежие новости: MotoGP, WSBK, российские серии, релизы производителей",
      "Всё прозрачно: правила, участники и результаты — на виду",
    ],
    bg: "background",
  },
  {
    title: "Школа Hellhound",
    Icon: PlumpSchool,
    lead: "Учись ездить лучше, а не «как получится». Выбирай инструктора в своём городе или смотри видеокурсы, когда удобно.",
    bullets: [
      "Инструкторы в разных городах — фильтр по своему региону",
      "Видеокурсы: город, трек, контраварийка, техника торможения",
      "Уроки от базы до продвинутых упражнений",
      "Прогресс сохраняется в профиле",
    ],
    bg: "surface",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 top-24 h-[60vh] w-[60vh] rounded-full bg-primary/15 blur-[140px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0, hsl(var(--foreground)) 1px, transparent 1px, transparent 22px)",
            }}
          />

          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <h1 className="font-display text-6xl font-black uppercase leading-[0.88] tracking-tight md:text-8xl xl:text-[9rem]">
                <span className="text-primary">HELLHOUND</span>
                <br />
                <span className="text-foreground">Racing Club</span>
              </h1>
            </Reveal>

            <Reveal delay={140}>
              <p
                className="mt-7 max-w-[42ch] font-display text-lg font-black uppercase leading-snug tracking-[0.1em] text-primary md:text-2xl"
                style={{
                  WebkitTextStroke: "1.5px hsl(var(--foreground))",
                  textShadow: "3px 3px 0 hsl(var(--foreground))",
                }}
              >
                Клуб райдеров вокруг YouTube-канала HELLHOUND
              </p>
            </Reveal>

            <Reveal delay={220}>
              <p className="mt-6 max-w-2xl text-base text-muted-foreground md:text-lg">
                Без пафоса и закрытых дверей. Место, где собирается своя
                аудитория канала — обсуждать мото, ездить вместе, забирать
                мерч и пользоваться полезными штуками, которых нет снаружи.
                Всё, что нужно райдеру, — в одном приложении.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ФИЧИ В ШАХМАТКУ (без картинок и номеров) */}
        {FEATURES.map((f, idx) => {
          const alignRight = idx % 2 === 0;
          const bgClass = f.bg === "surface" ? "bg-surface" : "bg-background";
          return (
            <section
              key={f.title}
              className={`relative overflow-hidden ${bgClass} py-20 md:py-28`}
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute top-1/2 h-[50vh] w-[50vh] -translate-y-1/2 rounded-full bg-primary/10 blur-[140px] ${
                  alignRight ? "right-0 translate-x-1/4" : "left-0 -translate-x-1/4"
                }`}
              />

              <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
                <Reveal from={alignRight ? "left" : "right"}>
                  <div
                    className={`max-w-3xl ${alignRight ? "" : "ml-auto"}`}
                  >
                    <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                      <f.Icon size={30} />
                    </div>

                    <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground md:text-6xl">
                      {f.title}
                    </h2>

                    <p className="mt-5 text-base text-muted-foreground md:text-lg">
                      {f.lead}
                    </p>

                    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                      {f.bullets.map((b, i) => (
                        <Reveal key={b} delay={80 + i * 60}>
                          <li className="flex h-full items-start gap-3 rounded-xl border-2 border-foreground/80 bg-card p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                            <span
                              aria-hidden
                              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-sm bg-primary ring-2 ring-foreground"
                            />
                            <span className="text-sm leading-relaxed text-foreground md:text-[15px]">
                              {b}
                            </span>
                          </li>
                        </Reveal>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            </section>
          );
        })}

        {/* ПРИНЦИПЫ КЛУБА */}
        <section className="relative overflow-hidden bg-background py-20 md:py-28">
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <h2 className="font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl">
                Принципы клуба
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  t: "Без пафоса",
                  d: "Никаких «сезонов» и «закрытых доступов», если за ними нет реального продукта.",
                },
                {
                  t: "Райдер, а не турист",
                  d: "Клуб для тех, кто реально ездит. Всё, что делаем, — из практики, а не из презентаций.",
                },
                {
                  t: "Честные правила",
                  d: "Условия розыгрышей, доставки и оплаты — прямо в приложении, а не мелким шрифтом внизу.",
                },
                {
                  t: "Свой мерч",
                  d: "Лимитированные тиражи, а не бесконечный поток одинаковых футболок.",
                },
                {
                  t: "Полезный AI",
                  d: "Hell AI отвечает по твоему мотоциклу. Никакой имитации Хелла и генерации картинок.",
                },
                {
                  t: "Приложение сначала",
                  d: "Основной опыт — в приложении. Лендинг — точка входа, а не «главная поляна» клуба.",
                },
              ].map((p, i) => (
                <Reveal key={p.t} delay={i * 60}>
                  <div className="h-full rounded-2xl border-[3px] border-foreground bg-card p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                    <div className="font-display text-xl uppercase tracking-tight text-foreground">
                      {p.t}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ФИНАЛЬНЫЙ CTA */}
        <section className="relative overflow-hidden bg-surface py-24 md:py-32">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[160px]"
          />
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <h2 className="max-w-[16ch] font-display text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl xl:text-8xl">
                Готов? <span className="text-primary">Залетай в клуб.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
                Регистрация занимает минуту. Дальше — гараж, билеты, мерч,
                школа и Hell AI на связи.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-primary px-8 py-4 font-display text-lg font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] active:scale-[0.98]"
                >
                  Вступить в клуб
                  <PlumpArrowRight className="h-6 w-6 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/shop"
                  className="group inline-flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-card px-8 py-4 font-display text-lg font-black uppercase tracking-widest text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:text-primary hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] active:scale-[0.98]"
                >
                  Смотреть магазин
                  <PlumpArrowRight className="h-6 w-6 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
