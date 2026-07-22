import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  PlumpArrowLeft,
  PlumpArrowRight as ChevronRight,
  PlumpMap,
  PlumpCamera,
} from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { getInstructorBySlug, type Instructor, type Slot } from "@/data/instructors";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { ImageViewer } from "@/components/club/ImageViewer";

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

function ClubInstructorPage() {
  const { instructorId } = Route.useParams();
  const instructor = getInstructorBySlug(instructorId);
  const scheduleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [instructorId]);

  if (!instructor) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black uppercase italic tracking-tight">
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

  const scrollToSchedule = () =>
    scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <main className="mx-auto w-full max-w-3xl pb-24">
      <Hero instructor={instructor} />

      <div className="space-y-6 px-4 pt-5">
        <BackRow />
        <BioSection instructor={instructor} />
        {instructor.courses && instructor.courses.length > 0 && (
          <CoursesSection instructor={instructor} onCta={scrollToSchedule} />
        )}
        <SkillsSection instructor={instructor} />
        {instructor.approach && instructor.approach.length > 0 && (
          <ApproachSection instructor={instructor} />
        )}
        <LocationSection instructor={instructor} />
        <ScheduleSection instructor={instructor} scheduleRef={scheduleRef} />
        <GallerySection instructor={instructor} />
        <FinalCta onCta={scrollToSchedule} />
      </div>

      <StickyCta onCta={scrollToSchedule} />
    </main>
  );
}

/* ---------- Hero ---------- */

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

      <div className="absolute inset-x-4 bottom-4">
        <div className="flex flex-wrap gap-1.5">
          <Chip>{instructor.city}</Chip>
          <Chip>{expLabel}</Chip>
        </div>
        <h1 className="mt-2 font-display text-4xl font-black uppercase italic leading-[0.9] tracking-tight text-white md:text-6xl">
          {instructor.name}
        </h1>
        <p className="mt-1 max-w-md font-mono text-[11px] uppercase tracking-widest text-white/80 md:text-xs">
          {instructor.tagline}
        </p>
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
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

/* ---------- Bio + Specialties ---------- */

function BioSection({ instructor }: { instructor: Instructor }) {
  return (
    <section>
      <div className="flex flex-wrap gap-1.5">
        {instructor.specialties.map((s) => (
          <span
            key={s}
            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-primary"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-foreground/85">
        {instructor.bio.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </section>
  );
}

/* ---------- Section heading ---------- */

function SectionHeading({ title, kicker }: { title: string; kicker?: string }) {
  return (
    <div className="mb-3 px-1">
      {kicker && (
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-primary">{kicker}</p>
      )}
      <h2 className="mt-1 font-display text-xl font-black uppercase italic tracking-tight text-foreground md:text-2xl">
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
  return (
    <section>
      <SectionHeading kicker="Форматы" title="Стоимость обучения" />
      <div className="space-y-3">
        {(instructor.courses ?? []).map((c) => (
          <article
            key={c.title}
            className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60"
          >
            <div className="px-4 py-4">
              <div className="inline-flex rounded-full bg-white/[0.05] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {c.duration}
              </div>
              <h3 className="mt-2 font-display text-lg font-black uppercase italic tracking-tight text-foreground">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/75">{c.description}</p>
              {c.includes && c.includes.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm text-foreground/70">
                  {c.includes.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] bg-black/30 px-4 py-3">
              <div className="flex items-baseline gap-1.5">
                {c.priceFrom && (
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    от
                  </span>
                )}
                <PlumpNum value={c.price} size={18} format suffix="₽" />
              </div>
              <button
                type="button"
                onClick={onCta}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
              >
                Выбрать <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Skills ---------- */

function SkillsSection({ instructor }: { instructor: Instructor }) {
  return (
    <section>
      <SectionHeading kicker="Программа" title="Чему научишься" />
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        {instructor.skills.map((s, i) => (
          <div
            key={s.title}
            className={`flex gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
          >
            <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-black uppercase tracking-tight text-foreground">
                {s.title}
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/70">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Approach ---------- */

function ApproachSection({ instructor }: { instructor: Instructor }) {
  return (
    <section>
      <SectionHeading kicker="Подход" title="Как проходят тренировки" />
      <div className="space-y-2">
        {(instructor.approach ?? []).map((text, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3"
          >
            <div className="mt-0.5 font-mono text-[11px] font-bold text-primary">
              {String(i + 1).padStart(2, "0")}
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/80">{text}</p>
          </div>
        ))}
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
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60">
        <div className="relative">
          <div ref={mapRef} className="aspect-[16/10] w-full bg-black" />
          {!mapReady && !mapFailed && (
            <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Загружаем карту…
            </div>
          )}
          {mapFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <PlumpMap className="h-8 w-8 text-primary" />
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Открой на Яндекс.Картах
              </p>
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <div className="flex items-start gap-2">
            <PlumpMap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="text-sm font-medium leading-snug text-foreground">
                {instructor.location.address}
              </div>
              {instructor.location.note && (
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {instructor.location.note}
                </p>
              )}
            </div>
          </div>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-widest text-primary"
          >
            Построить маршрут <ChevronRight className="h-3.5 w-3.5" />
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
    <section ref={scheduleRef} className="scroll-mt-4">
      <SectionHeading kicker="Ближайшая неделя" title="Свободные слоты" />
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {instructor.schedule.map((day) => (
          <div
            key={day.date}
            className="w-[160px] shrink-0 snap-start rounded-2xl border border-white/[0.06] bg-card/60 p-3"
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-base font-black uppercase italic leading-none tracking-tight text-foreground">
                {day.weekday}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {day.date}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
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
      <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
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
      <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground line-through">
        {slot.time}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
        picked
          ? "bg-primary text-primary-foreground"
          : "border border-primary/30 bg-primary/10 text-primary"
      }`}
    >
      {slot.time}
    </button>
  );
}

/* ---------- Gallery ---------- */

function GallerySection({ instructor }: { instructor: Instructor }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (instructor.gallery.length === 0) {
    return (
      <section>
        <SectionHeading kicker="Кадры" title="Галерея" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
          <PlumpCamera className="h-8 w-8 text-muted-foreground" />
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Скоро добавим кадры
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeading kicker="Кадры" title="Галерея" />
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
        {instructor.gallery.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="relative aspect-square overflow-hidden rounded-xl bg-black active:scale-[0.98]"
          >
            <img
              src={src}
              alt={`${instructor.name} — кадр ${i + 1}`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        ))}
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

/* ---------- Final CTA + Sticky CTA ---------- */

function FinalCta({ onCta }: { onCta: () => void }) {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card/60 to-black p-5 text-center">
      <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-foreground">
        Готов записаться?
      </h2>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Выбери свободный слот выше
      </p>
      <button
        type="button"
        onClick={onCta}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground active:scale-95"
      >
        К расписанию <ChevronRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function StickyCta({ onCta }: { onCta: () => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4 md:hidden"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 12px)" }}
    >
      <button
        type="button"
        onClick={onCta}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary))] active:scale-95"
      >
        Записаться <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
