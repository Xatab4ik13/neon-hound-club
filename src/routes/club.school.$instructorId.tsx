import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  PlumpArrowLeft,
  PlumpArrowRight,
  PlumpMap,
  PlumpCamera,
} from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import {
  getInstructorBySlug,
  TONE_BG,
  type Instructor,
  type Slot,
} from "@/data/instructors";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { ImageViewer } from "@/components/club/ImageViewer";
import { BookInstructorChatSheet } from "@/components/school/BookInstructorChatSheet";

export const Route = createFileRoute("/club/school/$instructorId")({
  head: ({ params }) => {
    const it = getInstructorBySlug(params.instructorId);
    const title = it
      ? `${it.name} · Школа HELLHOUND`
      : "Инструктор · Школа HELLHOUND";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: it ? `${it.name}, ${it.city}. ${it.tagline}.` : "Инструктор Школы HELLHOUND.",
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ClubInstructorPage,
});

const SKILL_TONES = ["primary", "yellow", "cyan", "lime", "violet", "primary"] as const;

function ClubInstructorPage() {
  const { instructorId } = Route.useParams();
  const instructor = getInstructorBySlug(instructorId);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [instructorId]);

  if (!instructor) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black uppercase  tracking-tight">
          Инструктор не найден
        </h1>
        <Link
          to="/club/school"
          className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary"
        >
          <PlumpArrowLeft className="h-4 w-4" /> К списку
        </Link>
      </main>
    );
  }

  const openChat = () => setChatOpen(true);

  return (
    <main className="mx-auto w-full max-w-5xl pb-24">
      <Hero instructor={instructor} />

      <div className="space-y-14 px-4 pt-6 md:space-y-20 md:px-6">
        <BackRow />
        <BioSection instructor={instructor} />
        {instructor.courses && instructor.courses.length > 0 && (
          <CoursesSection instructor={instructor} onCta={openChat} />
        )}
        <SkillsSection instructor={instructor} />
        {instructor.approach && instructor.approach.length > 0 && (
          <ApproachSection instructor={instructor} />
        )}
        <LocationSection instructor={instructor} />
        <ContactCta onContact={openChat} />
        <GallerySection instructor={instructor} />
        <BottomActions onContact={openChat} />
      </div>

      <BookInstructorChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        instructorSlug={instructor.slug}
        instructorName={instructor.name}
        instructorPhoto={instructor.photo}
        instructorCity={instructor.city}
      />
    </main>
  );
}

/* ---------- Hero (kept as-is per user request) ---------- */

function Hero({ instructor }: { instructor: Instructor }) {
  const expLabel = `${instructor.experience} ${instructor.experience < 5 ? "года" : "лет"} стажа`;
  return (
    <section className="relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black md:aspect-[16/9]">
        <img
          src={instructor.photo}
          alt={instructor.name}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute inset-x-4 bottom-4 md:inset-x-8 md:bottom-8">
        <div className="flex flex-wrap gap-2">
          <HeroChip>{instructor.city}</HeroChip>
          <HeroChip>{expLabel}</HeroChip>
        </div>
        <h1 className="mt-3 font-display text-4xl font-black uppercase  leading-[0.9] tracking-tight text-white md:text-7xl">
          {instructor.name}
        </h1>
        <p className="mt-2 max-w-md font-mono text-[11px] uppercase tracking-widest text-white/80 md:text-xs">
          {instructor.tagline}
        </p>
      </div>
    </section>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur-md">
      {children}
    </span>
  );
}

function BackRow() {
  return (
    <Link
      to="/club/school"
      className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
    >
      <PlumpArrowLeft className="h-4 w-4" /> Все инструкторы
    </Link>
  );
}

/* ---------- Plump specialties + Bio ---------- */

function BioSection({ instructor }: { instructor: Instructor }) {
  return (
    <section>
      <div className="flex flex-wrap gap-2">
        {instructor.specialties.map((s, i) => (
          <span
            key={s}
            className={`inline-block rounded-full border-[3px] border-foreground px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
              i % 2 === 0 ? "bg-card text-foreground" : "bg-foreground text-background"
            }`}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-foreground/85 md:text-base">
        {instructor.bio.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </section>
  );
}

/* ---------- Section heading (plump landing style) ---------- */

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <p className="font-mono text-[11px] uppercase tracking-widest text-primary">{kicker}</p>
      <h2 className="mt-2 font-display text-3xl font-black uppercase leading-[0.9] tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
    </div>
  );
}

/* ---------- Courses ---------- */

function CoursesSection({
  instructor,
  onCta,
}: {
  instructor: Instructor;
  onCta: () => void;
}) {
  const courses = instructor.courses ?? [];
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
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
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section>
      <SectionHeading kicker="Форматы" title="Стоимость обучения" />
      <div ref={gridRef} className="grid gap-6 [perspective:1200px] md:grid-cols-2">
        {courses.map((course, i) => {
          const rotate = i % 2 === 0 ? "-rotate-1" : "rotate-1";
          const bg = i % 2 === 0 ? "bg-primary" : "bg-card";
          const fg = i % 2 === 0 ? "text-primary-foreground" : "text-foreground";
          const sub = i % 2 === 0 ? "text-primary-foreground/85" : "text-foreground/80";
          const chipBg = i % 2 === 0 ? "bg-card text-foreground" : "bg-foreground text-background";
          const side = i % 2 === 0 ? "course-card--left" : "course-card--right";
          return (
            <article
              key={course.title}
              className={`course-card ${side} ${rotate} flex flex-col rounded-3xl border-[3px] border-foreground ${bg} p-5 shadow-[8px_8px_0_0_hsl(var(--foreground))] md:p-6 ${
                visible ? "course-card--in" : "course-card--pre"
              }`}
              style={{
                animationDelay: visible ? `${i * 140}ms` : "0ms",
                willChange: "transform, opacity",
              }}
            >
              <div
                className={`course-chip mb-4 inline-flex w-fit items-center rounded-full border-[3px] border-foreground px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] ${chipBg} ${
                  visible ? "course-chip--in" : "course-chip--pre"
                }`}
                style={{
                  animationDelay: visible ? `${i * 140 + 380}ms` : "0ms",
                  willChange: "transform, opacity",
                }}
              >
                {course.duration}
              </div>
              <h3 className={`font-display text-xl font-black uppercase leading-tight tracking-tight md:text-2xl ${fg}`}>
                {course.title}
              </h3>
              <p className={`mt-3 text-sm leading-relaxed ${sub}`}>{course.description}</p>

              {course.includes && course.includes.length > 0 && (
                <ul className={`mt-4 space-y-1.5 text-sm ${sub}`}>
                  {course.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span
                        className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${i % 2 === 0 ? "bg-primary-foreground" : "bg-primary"}`}
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-t-[3px] border-foreground/20 pt-4">
                <div className={`flex items-baseline gap-2 ${fg}`}>
                  {course.priceFrom && (
                    <span className="font-mono text-[11px] uppercase tracking-widest opacity-80">
                      от
                    </span>
                  )}
                  <PlumpNum value={course.price} size={24} format suffix="₽" />
                </div>
                <button
                  type="button"
                  onClick={onCta}
                  className={`inline-flex items-center gap-1.5 rounded-full border-[3px] border-foreground px-4 py-2 font-display text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_hsl(var(--foreground))] ${
                    i % 2 === 0 ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
                  }`}
                >
                  Записаться <PlumpArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Skills (plump grid like landing) ---------- */

function SkillsSection({ instructor }: { instructor: Instructor }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
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
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section>
      <SectionHeading kicker="Что дам" title="Чему научу" />
      <div ref={gridRef} className="grid gap-5 [perspective:1000px] sm:grid-cols-2 lg:grid-cols-3">
        {instructor.skills.map((s, i) => {
          const tone = SKILL_TONES[i % SKILL_TONES.length];
          const rotate = i % 2 === 0 ? "-rotate-1" : "rotate-1";
          return (
            <article
              key={s.title}
              className={`skill-card ${rotate} rounded-2xl border-[3px] border-foreground ${TONE_BG[tone]} p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] ${
                visible ? "skill-card--in" : "skill-card--pre"
              }`}
              style={{
                animationDelay: visible ? `${i * 90}ms` : "0ms",
                willChange: "transform, opacity",
              }}
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-full border-[3px] border-foreground bg-card px-3 py-1 font-display text-xs font-black uppercase tracking-widest text-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display text-lg font-black uppercase leading-tight tracking-tight text-black md:text-xl">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-black/80">{s.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Approach (plump dark block like landing) ---------- */

function ApproachSection({ instructor }: { instructor: Instructor }) {
  const items = instructor.approach ?? [];
  return (
    <section>
      <SectionHeading kicker="Подход" title="Как проходят тренировки" />
      <div className="rounded-3xl border-[3px] border-foreground bg-foreground p-5 shadow-[8px_8px_0_0_hsl(var(--primary))] md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          {items.map((text, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border-[3px] border-background/20 bg-background/5 p-4 md:p-5"
            >
              <div className="shrink-0">
                <PlumpNum value={i + 1} size={24} className="text-primary" />
              </div>
              <p className="text-sm leading-relaxed text-background md:text-base">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Location ---------- */

function LocationSection({ instructor }: { instructor: Instructor }) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    let map: any;
    loadYandexMaps()
      .then((ymaps) => {
        if (!mounted || !mapRef.current) return;
        map = new ymaps.Map(mapRef.current, {
          center: [instructor.location.lat, instructor.location.lng],
          zoom: 14,
          controls: ["zoomControl"],
        });
        const placemark = new ymaps.Placemark(
          [instructor.location.lat, instructor.location.lng],
          { balloonContent: instructor.location.address },
          { preset: "islands#redDotIcon" },
        );
        map.geoObjects.add(placemark);
        map.behaviors.disable("scrollZoom");
        setMapReady(true);
      })
      .catch(() => {
        if (mounted) setMapFailed(true);
      });
    return () => {
      mounted = false;
      if (map) map.destroy();
    };
  }, [instructor.location.lat, instructor.location.lng, instructor.location.address]);

  const externalMapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(instructor.location.address)}`;

  return (
    <section>
      <SectionHeading kicker="Место" title="Где занимаемся" />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border-[3px] border-foreground bg-card shadow-[8px_8px_0_0_hsl(var(--foreground))]">
          <div ref={mapRef} className="aspect-[4/3] w-full md:aspect-auto md:h-full md:min-h-[320px]" />
          {!mapReady && !mapFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-card font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Загружаем карту…
            </div>
          )}
          {mapFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card p-6 text-center">
              <PlumpMap className="h-10 w-10 text-primary" />
              <a
                href={externalMapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-full border-[3px] border-foreground bg-primary px-4 py-2 font-display text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]"
              >
                Открыть карту <PlumpArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5 rounded-3xl border-[3px] border-foreground bg-primary p-5 shadow-[8px_8px_0_0_hsl(var(--foreground))] md:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-foreground bg-card px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <PlumpMap className="h-4 w-4" /> {instructor.city}
            </div>
            <p className="mt-4 font-display text-lg font-black uppercase leading-tight tracking-tight text-primary-foreground md:text-xl">
              {instructor.location.address}
            </p>
            {instructor.location.note && (
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/90">
                {instructor.location.note}
              </p>
            )}
          </div>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-foreground px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-background shadow-[4px_4px_0_0_hsl(var(--background))]"
          >
            Построить маршрут <PlumpArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Schedule (wider, plump) ---------- */

function ScheduleSection({
  instructor,
  scheduleRef,
}: {
  instructor: Instructor;
  scheduleRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <section ref={scheduleRef} className="scroll-mt-4">
      <SectionHeading kicker="Ближайшая неделя" title="Свободные слоты" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {instructor.schedule.map((day, i) => (
          <div
            key={day.date}
            className={`rounded-2xl border-[3px] border-foreground ${i % 2 === 0 ? "bg-card" : "bg-primary/10"} p-4 shadow-[6px_6px_0_0_hsl(var(--foreground))]`}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-display text-2xl font-black uppercase leading-none tracking-tight text-foreground">
                {day.weekday}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {day.date}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((slot) => (
                <SlotBtn
                  key={`${day.date}-${slot.time}`}
                  slot={slot}
                  picked={picked === `${day.date}-${slot.time}`}
                  onPick={() => setPicked(`${day.date}-${slot.time}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border-[3px] border-dashed border-foreground/40 bg-card/40 p-4 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {picked
          ? "Слот выбран. Скоро запись прямо здесь — пока пиши в помощь клуба."
          : "Выбери слот. Настоящая запись появится скоро."}
      </div>
    </section>
  );
}

function SlotBtn({
  slot,
  picked,
  onPick,
}: {
  slot: Slot;
  picked: boolean;
  onPick: () => void;
}) {
  if (slot.status === "booked") {
    return (
      <span className="inline-flex items-center rounded-full border-[3px] border-foreground/30 bg-muted px-3 py-1 font-display text-xs font-black uppercase tracking-widest text-muted-foreground line-through">
        {slot.time}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      className={`inline-flex items-center rounded-full border-[3px] border-foreground px-3 py-1 font-display text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
        picked ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
      }`}
    >
      {slot.time}
    </button>
  );
}

/* ---------- Gallery (swipeable, one-per-screen) ---------- */

function GallerySection({ instructor }: { instructor: Instructor }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (instructor.gallery.length === 0) {
    return (
      <section>
        <SectionHeading kicker="Кадры" title="Галерея" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border-[3px] border-dashed border-foreground/40 bg-card/40 p-10 text-center">
          <PlumpCamera className="h-8 w-8 text-muted-foreground" />
          <p className="font-display text-lg font-black uppercase tracking-tight text-foreground">
            Скоро добавим кадры
          </p>
        </div>
      </section>
    );
  }

  const rotates = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

  return (
    <section>
      <SectionHeading kicker="Кадры" title="Галерея" />
      <div className="relative -mx-4 md:-mx-6">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-2 md:px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {instructor.gallery.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={() => setOpenIdx(i)}
              className={`w-[calc(100vw-2rem)] shrink-0 snap-center md:w-[calc(100%-3rem)] ${rotates[i % rotates.length]}`}
              style={{ maxWidth: "100%" }}
            >
              <div
                className={`overflow-hidden rounded-2xl border-[3px] border-foreground ${TONE_BG[instructor.tone]} shadow-[8px_8px_0_0_hsl(var(--foreground))]`}
              >
                <div className="aspect-[4/5] w-full">
                  <img
                    src={src}
                    alt={`${instructor.name} — кадр ${i + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between px-1">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Свайпай влево/вправо
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Назад"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))]"
          >
            <PlumpArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Вперёд"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]"
          >
            <PlumpArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      {openIdx !== null && (
        <ImageViewer
          src={instructor.gallery[openIdx]}
          open
          onClose={() => setOpenIdx(null)}
        />
      )}
    </section>
  );
}

/* ---------- Bottom actions (replaces FinalCta + StickyCta) ---------- */

function BottomActions({ onSchedule }: { onSchedule: () => void }) {
  return (
    <div className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:justify-center">
      <button
        type="button"
        onClick={onSchedule}
        className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-card px-6 py-3 font-display text-sm font-black uppercase tracking-widest text-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]"
      >
        К расписанию <PlumpArrowRight className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onSchedule}
        className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-primary px-6 py-3 font-display text-sm font-black uppercase tracking-widest text-primary-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]"
      >
        Записаться <PlumpArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
