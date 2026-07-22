import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Youtube,
  Send,
  Instagram,
  Twitch,
  PlumpAI,
  PlumpGarage,
  PlumpStore,
  PlumpTicket,
  PlumpSchool,
  PlumpFeed,
  PlumpArrowRight,
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
          "HELLHOUND Racing Club — клуб райдеров вокруг YouTube-канала HELLHOUND. Hell AI, гараж, магазин, розыгрыши, школа и свежие новости мотоспорта.",
      },
      { property: "og:title", content: "О клубе HELLHOUND" },
      {
        property: "og:description",
        content:
          "Клуб райдеров вокруг YouTube-канала HELLHOUND. Hell AI, гараж, магазин, розыгрыши, школа, новости.",
      },
      { property: "og:url", content: "/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

/* ------------------------------------------------------------------ */
/* Scroll-reveal helper — плавное появление снизу при попадании в вьюпорт */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* Заглушка под фотографии Вани (прозрачный PNG подложится позже)      */
/* ------------------------------------------------------------------ */
function PhotoSlot({ label }: { label: string }) {
  return (
    <div className="relative aspect-[4/5] w-full">
      {/* Плашка-«подложка» в стиле Plump */}
      <div
        className="absolute inset-0 rounded-3xl border-[3px] border-foreground bg-card shadow-[8px_8px_0_0_hsl(var(--foreground))]"
        aria-hidden
      />
      {/* Диагональные полосы, чтобы место выглядело осмысленно */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden rounded-3xl opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0, hsl(var(--foreground)) 2px, transparent 2px, transparent 18px)",
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Место под фото
        </span>
        <span className="font-display text-2xl font-black uppercase italic leading-none tracking-tight text-foreground/70">
          {label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Ваня · PNG · прозрачный фон
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Секция «шахматка»: контент + фото; чередуется сторонами             */
/* ------------------------------------------------------------------ */
type Feature = {
  eyebrow: string;
  title: string;
  Icon: typeof PlumpAI;
  lead: string;
  bullets: string[];
  photoLabel: string;
  bg: "background" | "surface";
};

const FEATURES: Feature[] = [
  {
    eyebrow: "01 · AI-механик",
    title: "Hell AI",
    Icon: PlumpAI,
    lead: "Личный AI-механик, который знает именно твой мотоцикл. Не «поиск в интернете», а ответ по твоей модели, году и пробегу.",
    bullets: [
      "Заносишь байк в гараж — AI подхватывает модель и год",
      "Отвечает по регламенту ТО, свечам, маслу, цепи, тормозам",
      "Помогает разобраться со странным звуком или ошибкой на приборке",
      "Подсказывает шаг за шагом, а не общими фразами",
    ],
    photoLabel: "Ваня + телефон",
    bg: "background",
  },
  {
    eyebrow: "02 · Гараж",
    title: "Свой гараж под рукой",
    Icon: PlumpGarage,
    lead: "Все твои мотоциклы в одном месте: история обслуживания, документы, траты, пробег. Никаких блокнотов и заметок в телефоне.",
    bullets: [
      "Добавляй сколько угодно байков — от повседневного до трекового",
      "Веди журнал: ТО, замены, доработки, поездки",
      "Храни фото документов и сервисных чеков",
      "Смотри статистику расходов и пробега за сезон",
    ],
    photoLabel: "Ваня у байка",
    bg: "surface",
  },
  {
    eyebrow: "03 · Магазин",
    title: "Мерч и амуниция клуба",
    Icon: PlumpStore,
    lead: "Лимитированный мерч HELLHOUND и вещи от партнёров. Никаких сторонних площадок — всё внутри клуба, с доставкой по России.",
    bullets: [
      "Одежда, аксессуары, коллекционные вещи с ограниченным тиражом",
      "Предзаказы на дропы, о которых знают только участники",
      "Доставка СДЭК с трекингом прямо в приложении",
      "Билеты за каждую покупку — потом на них разыгрываем призы",
    ],
    photoLabel: "Ваня + мерч",
    bg: "background",
  },
  {
    eyebrow: "04 · Розыгрыши",
    title: "Розыгрыши мотоциклов и не только",
    Icon: PlumpTicket,
    lead: "Билеты за активность и покупки. Разыгрываем мотоциклы, амуницию и крупные призы от амбассадоров клуба.",
    bullets: [
      "Копи билеты за задания, покупки и участие в жизни клуба",
      "Розыгрыши мотоциклов — регулярно, а не «когда-нибудь»",
      "Призы от амбассадоров: экипировка, поездки, эксклюзив",
      "Всё прозрачно: правила, участники, результаты — на виду",
    ],
    photoLabel: "Ваня + шлем",
    bg: "surface",
  },
  {
    eyebrow: "05 · Школа",
    title: "Школа Hellhound",
    Icon: PlumpSchool,
    lead: "Учись ездить лучше, а не «как получится». Выбирай инструктора в своём городе или смотри видеокурсы, когда удобно.",
    bullets: [
      "Инструкторы в разных городах — фильтр по своему региону",
      "Видеокурсы: город, трек, контраварийка, техника торможения",
      "Понятные уроки — от базы до продвинутых упражнений",
      "Прогресс сохраняется в профиле",
    ],
    photoLabel: "Ваня на треке",
    bg: "background",
  },
  {
    eyebrow: "06 · Новости",
    title: "Свежие новости мотоспорта",
    Icon: PlumpFeed,
    lead: "Короткая и по делу лента: MotoGP, WSBK, российские серии, важные релизы производителей. Без воды и рекламных простыней.",
    bullets: [
      "Самое важное из мира мотоспорта — за минуту",
      "Материалы от команды HELLHOUND, а не переводы копипаст",
      "Разборы гонок и техники",
      "Никаких пушей ради пушей",
    ],
    photoLabel: "Ваня + камера",
    bg: "surface",
  },
];

const SOCIALS = [
  {
    id: "yt",
    label: "YouTube",
    handle: "@HELLHOUNDRacing",
    url: "https://www.youtube.com/@HELLHOUNDRacing",
    Icon: Youtube,
  },
  {
    id: "tg",
    label: "Telegram",
    handle: "@hellhound_racing",
    url: "https://t.me/hellhound_racing",
    Icon: Send,
  },
  {
    id: "ig",
    label: "Instagram",
    handle: "@hellhound.racing",
    url: "https://www.instagram.com/hellhound.racing",
    Icon: Instagram,
  },
  {
    id: "tw",
    label: "Twitch",
    handle: "hellhoundracing",
    url: "https://www.twitch.tv/hellhoundracing",
    Icon: Twitch,
  },
];

/* ------------------------------------------------------------------ */
/* Страница                                                            */
/* ------------------------------------------------------------------ */
function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main>
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
          {/* Розовое свечение */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 top-24 h-[60vh] w-[60vh] rounded-full bg-primary/15 blur-[140px]"
          />
          {/* Полоски-декор */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0, hsl(var(--foreground)) 1px, transparent 1px, transparent 22px)",
            }}
          />

          {/* Контент — прижат к левому краю по линии бургера (pl-4 md:pl-6) */}
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                О клубе
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-4 font-display text-6xl font-black uppercase italic leading-[0.9] tracking-tighter md:text-8xl xl:text-[9rem]">
                <span className="text-primary">HELLHOUND</span>
                <br />
                <span className="text-foreground">Racing Club</span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p
                className="mt-6 max-w-[42ch] font-display text-lg font-black uppercase leading-snug tracking-[0.1em] text-primary md:text-2xl"
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

            {/* Быстрые чипы-разделы */}
            <Reveal delay={280}>
              <div className="mt-10 flex flex-wrap gap-3">
                {FEATURES.map((f) => (
                  <a
                    key={f.title}
                    href={`#${f.title.replace(/\s+/g, "-").toLowerCase()}`}
                    className="group inline-flex items-center gap-2 rounded-2xl border-[3px] border-foreground bg-card px-4 py-2.5 font-display text-[13px] font-black uppercase tracking-widest text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-primary hover:text-black hover:shadow-[6px_6px_0_0_hsl(var(--foreground))]"
                  >
                    <f.Icon size={18} />
                    {f.title}
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ================= ФИЧИ В ШАХМАТКУ ================= */}
        {FEATURES.map((f, idx) => {
          const photoRight = idx % 2 === 0;
          const bgClass = f.bg === "surface" ? "bg-surface" : "bg-background";
          const anchor = f.title.replace(/\s+/g, "-").toLowerCase();
          return (
            <section
              key={f.title}
              id={anchor}
              className={`relative overflow-hidden ${bgClass} py-20 md:py-28`}
            >
              {/* Мягкое свечение с одной из сторон */}
              <div
                aria-hidden
                className={`pointer-events-none absolute top-1/2 h-[50vh] w-[50vh] -translate-y-1/2 rounded-full bg-primary/10 blur-[140px] ${
                  photoRight ? "right-0 translate-x-1/4" : "left-0 -translate-x-1/4"
                }`}
              />

              <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
                <div
                  className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    photoRight ? "" : "lg:[&>div:first-child]:order-2"
                  }`}
                >
                  {/* Текст */}
                  <Reveal from={photoRight ? "left" : "right"}>
                    <div className="max-w-xl">
                      <div className="mb-4 inline-flex items-center gap-3">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]">
                          <f.Icon size={26} />
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                          {f.eyebrow}
                        </span>
                      </div>

                      <h2 className="font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tight text-foreground md:text-6xl">
                        {f.title}
                      </h2>

                      <p className="mt-5 text-base text-muted-foreground md:text-lg">
                        {f.lead}
                      </p>

                      <ul className="mt-6 space-y-3">
                        {f.bullets.map((b, i) => (
                          <Reveal key={b} delay={80 + i * 60}>
                            <li className="flex items-start gap-3 rounded-xl border-2 border-foreground/80 bg-card p-3.5 shadow-[3px_3px_0_0_hsl(var(--foreground))]">
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

                  {/* Фото-слот */}
                  <Reveal from={photoRight ? "right" : "left"} delay={120}>
                    <div className="mx-auto w-full max-w-md lg:mx-0 lg:ml-auto">
                      <PhotoSlot label={f.photoLabel} />
                    </div>
                  </Reveal>
                </div>
              </div>
            </section>
          );
        })}

        {/* ================= ПРИНЦИПЫ КЛУБА ================= */}
        <section className="relative overflow-hidden bg-background py-20 md:py-28">
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                Как мы это делаем
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tight md:text-6xl">
                Принципы клуба
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  t: "Без пафоса",
                  d: "Никаких «сезонов», «закрытых доступов» и прочей мишуры, если за ней нет реального продукта.",
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
                  d: "Лимитированные тиражи, а не бесконечный поток одинаковых футболок. Каждая вещь — с историей.",
                },
                {
                  t: "Полезный AI",
                  d: "Hell AI отвечает по твоему мотоциклу, а не «в среднем по больнице». Никакой имитации Хелла и генерации картинок.",
                },
                {
                  t: "Приложение сначала",
                  d: "Основной опыт — в приложении. Лендинг — точка входа, а не «главная поляна» клуба.",
                },
              ].map((p, i) => (
                <Reveal key={p.t} delay={i * 60}>
                  <div className="h-full rounded-2xl border-[3px] border-foreground bg-card p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]">
                    <div className="font-display text-xl uppercase italic tracking-tight text-foreground">
                      {p.t}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= СОЦСЕТИ ================= */}
        <section className="relative overflow-hidden bg-surface py-20 md:py-28">
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">
                Где мы есть
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-display text-4xl font-black uppercase italic leading-[0.95] tracking-tight md:text-6xl">
                Соцсети клуба
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SOCIALS.map((s, i) => (
                <Reveal key={s.id} delay={i * 70}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border-[3px] border-foreground bg-card p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:bg-primary hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-background text-foreground group-hover:bg-background group-hover:text-primary">
                      <s.Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-base uppercase italic tracking-tight text-foreground group-hover:text-black">
                        {s.label}
                      </span>
                      <span className="block truncate font-mono text-[11px] uppercase tracking-widest text-muted-foreground group-hover:text-black/70">
                        {s.handle}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="ml-auto text-muted-foreground transition-transform duration-150 group-hover:translate-x-1 group-hover:text-black"
                    >
                      →
                    </span>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ================= ФИНАЛЬНЫЙ CTA ================= */}
        <section className="relative overflow-hidden bg-background py-24 md:py-32">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-[160px]"
          />
          <div className="relative w-full pl-4 pr-6 md:pl-6 md:pr-12">
            <Reveal>
              <h2 className="max-w-[16ch] font-display text-5xl font-black uppercase italic leading-[0.9] tracking-tighter md:text-7xl xl:text-8xl">
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
                  className="group inline-flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-primary px-8 py-4 font-display text-lg font-black uppercase italic tracking-widest text-black shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] active:scale-[0.98]"
                >
                  Вступить в клуб
                  <PlumpArrowRight className="h-6 w-6 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
                <Link
                  to="/shop"
                  className="group inline-flex items-center gap-3 rounded-2xl border-[3px] border-foreground bg-card px-8 py-4 font-display text-lg font-black uppercase italic tracking-widest text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-all duration-150 ease-out hover:-translate-x-1.5 hover:-translate-y-1.5 hover:text-primary hover:shadow-[8px_8px_0_0_hsl(var(--foreground))] active:scale-[0.98]"
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
