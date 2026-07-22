import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Header } from "@/components/brand/Header";
import { Footer } from "@/components/brand/Footer";
import { PlumpArrowLeft, PlumpArrowRight, PlumpMap, PlumpCamera } from "@/components/ui/icons";
import {
  getInstructorBySlug,
  INSTRUCTORS,
  TONE_BG,
  type Instructor,
  type Slot,
} from "@/data/instructors";
import { loadYandexMaps } from "@/lib/yandex-maps";

export const Route = createFileRoute("/school/$instructorId")({
  head: ({ params }) => {
    const it = getInstructorBySlug(params.instructorId);
    const title = it
      ? `${it.name} — инструктор Школы HELLHOUND, ${it.city}`
      : "Инструктор — Школа HELLHOUND";
    const description = it
      ? `${it.name}, ${it.city}. ${it.experience} лет стажа. ${it.tagline}.`
      : "Инструктор Школы HELLHOUND.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
      ],
      links: it
        ? [{ rel: "canonical", href: `/school/${it.slug}` }]
        : [],
    };
  },
  component: InstructorPage,
});

function InstructorPage() {
  const { instructorId } = Route.useParams();
  const instructor = getInstructorBySlug(instructorId);
  const scheduleRef = useRef<HTMLDivElement | null>(null);
  const scrollToSchedule = () => {
    scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [instructorId]);

  if (!instructor) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-24 text-center">
          <h1 className="font-display text-4xl font-black uppercase tracking-tight">
            Инструктор не найден
          </h1>
          <Link
            to="/school"
            className="mt-6 inline-flex items-center gap-2 font-display text-sm font-black uppercase tracking-widest text-primary"
          >
            <PlumpArrowLeft className="h-4 w-4" /> К списку инструкторов
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:pt-32">
        <BackLink />
        <Hero instructor={instructor} onCta={scrollToSchedule} />
        {instructor.courses && instructor.courses.length > 0 && (
          <CoursesSection instructor={instructor} onCta={scrollToSchedule} />
        )}
        <SkillsSection instructor={instructor} />
        {instructor.approach && instructor.approach.length > 0 && (
          <ApproachSection instructor={instructor} />
        )}
        <LocationSection instructor={instructor} />
        <ScheduleSection instructor={instructor} scheduleRef={scheduleRef} />
        {instructor.upcomingCourses && instructor.upcomingCourses.length > 0 && (
          <UpcomingSection instructor={instructor} />
        )}
        <GallerySection instructor={instructor} />
        <OtherInstructors currentSlug={instructor.slug} />
      </main>
      <Footer />
    </div>
  );
}

/* ---------- Back link ---------- */

function BackLink() {
  return (
    <Link
      to="/school"
      className="inline-flex items-center gap-2 font-display text-xs font-black uppercase tracking-widest text-foreground/70 transition-colors hover:text-primary"
    >
      <PlumpArrowLeft className="h-4 w-4" />
      Все инструкторы
    </Link>
  );
}

/* ---------- Hero ---------- */

function Hero({ instructor, onCta }: { instructor: Instructor; onCta: () => void }) {
  const tone = TONE_BG[instructor.tone];
  const expLabel = `${instructor.experience} ${instructor.experience < 5 ? "года" : "лет"} стажа`;

  return (
    <section className="mt-6 grid gap-10 md:mt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
      {/* Портрет */}
      <div className="relative -rotate-2">
        <div
          className={`relative overflow-hidden rounded-3xl border-[3px] border-foreground ${tone} shadow-[10px_10px_0_0_hsl(var(--foreground))]`}
        >
          <div className="relative aspect-[3/4] w-full overflow-hidden">
            <img
              src={instructor.photo}
              alt={instructor.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/30" />
          </div>
        </div>

        <div className="pointer-events-none absolute -top-4 left-4 -rotate-[6deg]">
          <PlumpTag>{instructor.city}</PlumpTag>
        </div>
        <div className="pointer-events-none absolute -bottom-4 right-6 rotate-[4deg]">
          <PlumpTag variant="accent">{expLabel}</PlumpTag>
        </div>
      </div>

      {/* Инфо */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
          Инструктор Школы HELLHOUND
        </p>
        <h1 className="mt-2 font-display text-5xl font-black uppercase leading-[0.88] tracking-tight text-foreground md:text-7xl">
          {instructor.name}
        </h1>
        <p className="mt-4 font-display text-lg font-black uppercase tracking-tight text-muted-foreground md:text-xl">
          {instructor.tagline}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
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

        <div className="mt-6 space-y-3 text-base leading-relaxed text-foreground/85">
          {instructor.bio.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <SkewButton onClick={onCta}>
            Записаться <PlumpArrowRight className="ml-2 h-4 w-4" />
          </SkewButton>
        </div>
      </div>
    </section>
  );
}

function SkewButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex -skew-x-[10deg] items-center border-[3px] border-foreground bg-primary px-6 py-3 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]"
    >
      <span className="flex skew-x-[10deg] items-center font-display text-sm font-black uppercase tracking-widest text-primary-foreground md:text-base">
        {children}
      </span>
    </button>
  );
}

function PlumpTag({
  children,
  variant = "light",
}: {
  children: React.ReactNode;
  variant?: "light" | "dark" | "accent";
}) {
  const styles =
    variant === "dark"
      ? "bg-foreground text-background"
      : variant === "accent"
        ? "bg-primary text-primary-foreground"
        : "bg-card text-foreground";
  return (
    <span
      className={`inline-block rounded-full border-[3px] border-foreground px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] md:text-xs ${styles}`}
    >
      {children}
    </span>
  );
}

/* ---------- Section heading ---------- */

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="font-mono text-[11px] uppercase tracking-widest text-primary">{kicker}</p>
      <h2 className="mt-2 font-display text-3xl font-black uppercase leading-[0.9] tracking-tight text-foreground md:text-5xl">
        {title}
      </h2>
    </div>
  );
}

/* ---------- Skills ---------- */

const SKILL_TONES = ["primary", "yellow", "cyan", "lime", "violet", "primary"] as const;

function SkillsSection({ instructor }: { instructor: Instructor }) {
  return (
    <section className="mt-20 md:mt-28">
      <SectionHeading kicker="Что дам" title="Чему научу" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {instructor.skills.map((s, i) => {
          const tone = SKILL_TONES[i % SKILL_TONES.length];
          const rotate = i % 2 === 0 ? "-rotate-1" : "rotate-1";
          return (
            <article
              key={s.title}
              className={`${rotate} rounded-2xl border-[3px] border-foreground ${TONE_BG[tone]} p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform duration-150 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]`}
            >
              <div className="mb-3 inline-flex items-center justify-center rounded-full border-[3px] border-foreground bg-card px-3 py-1 font-display text-xs font-black uppercase tracking-widest text-foreground">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight text-black">
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

/* ---------- Location + Map ---------- */

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
    <section className="mt-20 md:mt-28">
      <SectionHeading kicker="Место" title="Где занимаемся" />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-3xl border-[3px] border-foreground bg-card shadow-[8px_8px_0_0_hsl(var(--foreground))]">
          <div ref={mapRef} className="aspect-[4/3] w-full md:aspect-auto md:h-full md:min-h-[340px]" />
          {!mapReady && !mapFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-card font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Загружаем карту…
            </div>
          )}
          {mapFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card p-6 text-center">
              <PlumpMap className="h-10 w-10 text-primary" />
              <p className="font-display text-lg font-black uppercase tracking-tight text-foreground">
                Открой на Яндекс.Картах
              </p>
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

        <div className="flex flex-col justify-between gap-6 rounded-3xl border-[3px] border-foreground bg-primary p-6 shadow-[8px_8px_0_0_hsl(var(--foreground))]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-foreground bg-card px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
              <PlumpMap className="h-4 w-4" /> {instructor.city}
            </div>
            <p className="mt-4 font-display text-xl font-black uppercase leading-tight tracking-tight text-primary-foreground md:text-2xl">
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
            className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-foreground px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-background shadow-[4px_4px_0_0_hsl(var(--background))] transition-transform duration-150 hover:-translate-y-0.5"
          >
            Построить маршрут <PlumpArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Schedule ---------- */

function ScheduleSection({
  instructor,
  scheduleRef,
}: {
  instructor: Instructor;
  scheduleRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <section ref={scheduleRef} className="mt-20 scroll-mt-24 md:mt-28">
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

      <div className="mt-6 rounded-2xl border-[3px] border-dashed border-foreground/40 bg-card/40 p-4 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {picked
          ? "Слот выбран. Скоро сможешь записаться прямо здесь — сейчас пиши в поддержку клуба."
          : "Выбери слот. Настоящая запись появится совсем скоро."}
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
      className={`inline-flex items-center rounded-full border-[3px] border-foreground px-3 py-1 font-display text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform duration-100 hover:-translate-y-0.5 ${
        picked ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-primary/10"
      }`}
    >
      {slot.time}
    </button>
  );
}

/* ---------- Gallery ---------- */

type OriginRect = { x: number; y: number; w: number; h: number; rotate: string };

function GallerySection({ instructor }: { instructor: Instructor }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [origin, setOrigin] = useState<OriginRect | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (instructor.gallery.length === 0) {
    return (
      <section className="mt-20 md:mt-28">
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-[3px] border-dashed border-foreground/40 bg-card/40 p-12 text-center">
          <PlumpCamera className="h-10 w-10 text-primary" />
          <p className="font-display text-xl font-black uppercase tracking-tight text-foreground">
            Скоро добавим кадры
          </p>
        </div>
      </section>
    );
  }

  const rotates = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
  const rotateDeg = ["-2deg", "1deg", "-1deg", "2deg"];

  const openAt = (i: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setOrigin({
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      rotate: rotateDeg[i % rotateDeg.length],
    });
    setOpenIndex(i);
  };

  return (
    <section className="mt-20 md:mt-28">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {instructor.gallery.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={(e) => openAt(i, e.currentTarget)}
              className={`shrink-0 snap-start ${rotates[i % rotates.length]} basis-[80%] transition-transform duration-200 hover:-translate-y-1 active:scale-[0.98] sm:basis-[45%] md:basis-[32%] lg:basis-[26%]`}
            >
              <div
                className={`overflow-hidden rounded-2xl border-[3px] border-foreground ${TONE_BG[instructor.tone]} shadow-[6px_6px_0_0_hsl(var(--foreground))]`}
              >
                <div className="aspect-[4/3] w-full">
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

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label="Назад"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform duration-100 hover:-translate-y-0.5"
          >
            <PlumpArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label="Вперёд"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform duration-100 hover:-translate-y-0.5"
          >
            <PlumpArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <GalleryLightbox
        instructor={instructor}
        index={openIndex}
        origin={origin}
        onClose={() => setOpenIndex(null)}
        onPrev={() =>
          setOpenIndex((i) =>
            i === null ? i : (i - 1 + instructor.gallery.length) % instructor.gallery.length,
          )
        }
        onNext={() =>
          setOpenIndex((i) => (i === null ? i : (i + 1) % instructor.gallery.length))
        }
      />
    </section>
  );
}

function GalleryLightbox({
  instructor,
  index,
  origin,
  onClose,
  onPrev,
  onNext,
}: {
  instructor: Instructor;
  index: number | null;
  origin: OriginRect | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const open = index !== null && origin !== null;
  const [phase, setPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const frameRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const [target, setTarget] = useState<{ w: number; h: number; x: number; y: number } | null>(
    null,
  );

  // Compute final destination rect before paint to avoid first-frame jumps.
  useLayoutEffect(() => {
    if (!open) return;
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = vw < 768 ? 18 : 56;
      const maxW = Math.min(vw - padding * 2, 1040);
      const maxH = vh - padding * 2;
      let w = maxW;
      let h = (w * 3) / 4;
      if (h > maxH) {
        h = maxH;
        w = (h * 4) / 3;
      }
      setTarget({ w, h, x: (vw - w) / 2, y: (vh - h) / 2 });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  // Drive phase only when the lightbox actually opens. Changing images must not re-run the flyout.
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      setPhase("closed");
      return;
    }
    if (wasOpenRef.current) {
      setPhase("open");
      return;
    }
    wasOpenRef.current = true;
    setPhase("opening");
    // two rAFs to ensure initial styles are painted before transitioning
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => setPhase("open"));
      (r1 as any)._r2 = r2;
    });
    return () => {
      cancelAnimationFrame(r1);
      if ((r1 as any)._r2) cancelAnimationFrame((r1 as any)._r2);
    };
  }, [open]);

  // Body scroll lock + keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") beginClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onPrev, onNext]);

  const beginClose = () => {
    if (phase === "closing") return;
    setPhase("closing");
  };

  const onFrameTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== "transform") return;
    if (phase === "closing") onClose();
  };

  if (!open || !target || index === null || !origin) return null;

  // FLIP: compute initial transform from target to origin
  const scaleX = origin.w / target.w;
  const scaleY = origin.h / target.h;
  const dx = origin.x - target.x;
  const dy = origin.y - target.y;

  const collapsed = phase === "opening" || phase === "closing";
  const src = instructor.gallery[index];

  const frameStyle: React.CSSProperties = {
    position: "fixed",
    left: target.x,
    top: target.y,
    width: target.w,
    height: target.h,
    transformOrigin: "top left",
    transform: collapsed
      ? `translate3d(${dx}px, ${dy}px, 0) scale(${scaleX}, ${scaleY}) rotate(${origin.rotate})`
      : `translate3d(0, 0, 0) scale(1, 1) rotate(0deg)`,
    transition:
      "transform 420ms cubic-bezier(0.2, 0.86, 0.18, 1)",
    willChange: "transform",
    backfaceVisibility: "hidden",
    contain: "layout paint style",
    isolation: "isolate",
  };

  const backdropOpacity = phase === "open" ? 0.92 : phase === "closing" ? 0 : 0;
  const chromeVisible = phase === "open";

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={beginClose}
      className="fixed inset-0 z-[100]"
    >
      <div
        className="absolute inset-0 bg-background"
        style={{
          opacity: backdropOpacity,
          transition: "opacity 220ms linear",
          willChange: "opacity",
        }}
      />

      <div
        ref={frameRef}
        onClick={(e) => e.stopPropagation()}
        onTransitionEnd={onFrameTransitionEnd}
        style={frameStyle}
      >
        <div
          className={`h-full w-full overflow-hidden rounded-2xl border-[3px] border-foreground ${TONE_BG[instructor.tone]}`}
        >
          <img
            src={src}
            alt={`${instructor.name} — кадр ${index + 1}`}
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl shadow-[10px_10px_0_0_hsl(var(--foreground))] md:shadow-[14px_14px_0_0_hsl(var(--foreground))]"
          style={{
            opacity: chromeVisible ? 1 : 0,
            transition: "opacity 120ms linear 180ms",
            willChange: "opacity",
          }}
        />

        <button
          type="button"
          onClick={beginClose}
          aria-label="Закрыть"
          className="absolute -right-3 -top-3 inline-flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] md:-right-5 md:-top-5"
          style={{
            opacity: chromeVisible ? 1 : 0,
            pointerEvents: chromeVisible ? "auto" : "none",
            transition: "opacity 120ms linear 160ms",
          }}
        >
          <span className="font-display text-xl font-black leading-none">×</span>
        </button>
      </div>

      {instructor.gallery.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Предыдущее"
            className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-foreground bg-card shadow-[4px_4px_0_0_hsl(var(--foreground))] md:left-6"
            style={{
              opacity: chromeVisible ? 1 : 0,
              pointerEvents: chromeVisible ? "auto" : "none",
              transition: "opacity 120ms linear 160ms",
            }}
          >
            <PlumpArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Следующее"
            className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-foreground bg-primary text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] md:right-6"
            style={{
              opacity: chromeVisible ? 1 : 0,
              pointerEvents: chromeVisible ? "auto" : "none",
              transition: "opacity 120ms linear 160ms",
            }}
          >
            <PlumpArrowRight className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Other instructors ---------- */

function OtherInstructors({ currentSlug }: { currentSlug: string }) {
  const others = INSTRUCTORS.filter((it) => it.slug !== currentSlug).slice(0, 4);
  return (
    <section className="mt-20 md:mt-28">
      <SectionHeading kicker="Другие" title="Ещё инструкторы" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((it, i) => (
          <Link
            key={it.id}
            to="/school/$instructorId"
            params={{ instructorId: it.slug }}
            className={`group block ${i % 2 === 0 ? "-rotate-1" : "rotate-1"}`}
          >
            <div
              className={`relative overflow-hidden rounded-2xl border-[3px] border-foreground ${TONE_BG[it.tone]} shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform duration-150 group-hover:-translate-y-1 group-hover:shadow-[8px_8px_0_0_hsl(var(--foreground))]`}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <img src={it.photo} alt={it.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="border-t-[3px] border-foreground bg-card px-3 py-2">
                <div className="font-display text-lg font-black uppercase leading-none tracking-tight text-foreground">
                  {it.name}
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {it.city}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
