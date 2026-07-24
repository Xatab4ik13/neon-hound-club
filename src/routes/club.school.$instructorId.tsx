// Страница инструктора внутри клуба.
// Данные — реальный API `/api/v1/school/instructors/:slug`, богатый контент
// (skills, courses, approach, location, gallery) лежит в `profile` JSONB.
// Секция «Свободные слоты» убрана — на этапе шага 1 нет таблицы слотов.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PlumpArrowLeft,
  PlumpArrowRight,
  PlumpMap,
  PlumpCamera,
} from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { TONE_BG } from "@/data/instructors";
import { loadYandexMaps } from "@/lib/yandex-maps";
import { ImageViewer } from "@/components/club/ImageViewer";
import { useViewer } from "@/hooks/use-viewer";
import {
  fetchInstructor,
  openChatWith,
  schoolQk,
  type InstructorApi,
} from "@/lib/api-school";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/club/school/$instructorId")({
  head: () => ({
    meta: [
      { title: "Инструктор · Школа HELLHOUND" },
      { name: "description", content: "Инструктор Школы HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubInstructorPage,
});

const SKILL_TONES = ["primary", "yellow", "cyan", "lime", "violet", "primary"] as const;

function ClubInstructorPage() {
  const { instructorId } = Route.useParams();
  const navigate = useNavigate();
  const viewer = useViewer();
  const qc = useQueryClient();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [instructorId]);

  const q = useQuery({
    queryKey: schoolQk.instructor(instructorId),
    queryFn: () => fetchInstructor(instructorId),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false;
      return count < 2;
    },
  });

  const openChat = useMutation({
    mutationFn: async (slug: string) => openChatWith(slug),
    onSuccess: async ({ id }) => {
      await qc.invalidateQueries({ queryKey: schoolQk.myChats });
      navigate({ to: "/club/my-instructors/$chatId", params: { chatId: id } });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        navigate({ to: "/login" });
        return;
      }
      toast.error(err instanceof Error ? err.message : "Не удалось открыть чат");
    },
  });

  const handleContact = () => {
    if (!viewer.user) {
      navigate({ to: "/login" });
      return;
    }
    if (!q.data) return;
    openChat.mutate(q.data.slug);
  };

  if (q.isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Загружаем инструктора…
      </main>
    );
  }

  const instructor = q.data;
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

  const profile = instructor.profile ?? {};
  const specialties = profile.specialties ?? [];
  const bioParagraphs = profile.bioParagraphs ?? (instructor.bio ? [instructor.bio] : []);
  const skills = profile.skills ?? [];
  const courses = profile.courses ?? [];
  const approach = profile.approach ?? [];
  const gallery = profile.gallery ?? [];
  const location = profile.location;

  return (
    <main className="mx-auto w-full max-w-5xl pb-24">
      <Hero instructor={instructor} />

      <div className="space-y-14 px-4 pt-6 md:space-y-20 md:px-6">
        <BackRow />
        {(specialties.length > 0 || bioParagraphs.length > 0) && (
          <BioSection specialties={specialties} paragraphs={bioParagraphs} />
        )}
        {courses.length > 0 && (
          <CoursesSection courses={courses} onCta={handleContact} />
        )}
        {skills.length > 0 && <SkillsSection skills={skills} tone={instructor.tone} />}
        {approach.length > 0 && <ApproachSection items={approach} />}
        {location && <LocationSection city={instructor.city} location={location} />}
        <ContactCta onContact={handleContact} pending={openChat.isPending} />
        {gallery.length > 0 && (
          <GallerySection gallery={gallery} tone={instructor.tone} name={instructor.displayName} />
        )}
        <BottomActions onContact={handleContact} pending={openChat.isPending} />
      </div>
    </main>
  );
}

/* ---------- Hero ---------- */

function Hero({ instructor }: { instructor: InstructorApi }) {
  const exp = instructor.experience;
  const expLabel = exp > 0 ? `${exp} ${exp < 5 ? "года" : "лет"} стажа` : null;
  return (
    <section className="relative">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black md:aspect-[16/9]">
        {instructor.avatarUrl && (
          <img
            src={instructor.avatarUrl}
            alt={instructor.displayName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      <div className="absolute inset-x-4 bottom-4 md:inset-x-8 md:bottom-8">
        <div className="flex flex-wrap gap-2">
          {instructor.city && <HeroChip>{instructor.city}</HeroChip>}
          {expLabel && <HeroChip>{expLabel}</HeroChip>}
        </div>
        <h1 className="mt-3 font-display text-4xl font-black uppercase  leading-[0.9] tracking-tight text-white md:text-7xl">
          {instructor.displayName}
        </h1>
        {instructor.tagline && (
          <p className="mt-2 max-w-md font-mono text-[11px] uppercase tracking-widest text-white/80 md:text-xs">
            {instructor.tagline}
          </p>
        )}
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

/* ---------- Bio ---------- */

function BioSection({
  specialties,
  paragraphs,
}: {
  specialties: string[];
  paragraphs: string[];
}) {
  return (
    <section>
      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {specialties.map((s, i) => (
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
      )}
      {paragraphs.length > 0 && (
        <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-foreground/85 md:text-base">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </section>
  );
}

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
  courses,
  onCta,
}: {
  courses: NonNullable<InstructorApi["profile"]["courses"]>;
  onCta: () => void;
}) {
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
              {course.duration && (
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
              )}
              <h3 className={`font-display text-xl font-black uppercase leading-tight tracking-tight md:text-2xl ${fg}`}>
                {course.title}
              </h3>
              {course.description && (
                <p className={`mt-3 text-sm leading-relaxed ${sub}`}>{course.description}</p>
              )}

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

/* ---------- Skills ---------- */

function SkillsSection({
  skills,
  tone,
}: {
  skills: NonNullable<InstructorApi["profile"]["skills"]>;
  tone: InstructorApi["tone"];
}) {
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
      <SectionHeading kicker="Что дам" title="Чему научу" />
      <div ref={gridRef} className="grid gap-5 [perspective:1000px] sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s, i) => {
          const cardTone = SKILL_TONES[i % SKILL_TONES.length];
          void tone;
          const rotate = i % 2 === 0 ? "-rotate-1" : "rotate-1";
          return (
            <article
              key={s.title + i}
              className={`skill-card ${rotate} rounded-2xl border-[3px] border-foreground ${TONE_BG[cardTone]} p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] ${
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

/* ---------- Approach ---------- */

function ApproachSection({ items }: { items: string[] }) {
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

function LocationSection({
  city,
  location,
}: {
  city: string;
  location: NonNullable<InstructorApi["profile"]["location"]>;
}) {
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
          center: [location.lat, location.lng],
          zoom: 14,
          controls: ["zoomControl"],
        });
        const placemark = new ymaps.Placemark(
          [location.lat, location.lng],
          { balloonContent: location.address },
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
  }, [location.lat, location.lng, location.address]);

  const externalMapUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(location.address)}`;

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
            {city && (
              <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-foreground bg-card px-3 py-1 font-display text-[11px] font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]">
                <PlumpMap className="h-4 w-4" /> {city}
              </div>
            )}
            <p className="mt-4 font-display text-lg font-black uppercase leading-tight tracking-tight text-primary-foreground md:text-xl">
              {location.address}
            </p>
            {location.note && (
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/90">
                {location.note}
              </p>
            )}
          </div>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-primary px-5 py-3 font-display text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]"
          >
            Построить маршрут <PlumpArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- Gallery ---------- */

function GallerySection({
  gallery,
  tone,
  name,
}: {
  gallery: string[];
  tone: InstructorApi["tone"];
  name: string;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (gallery.length === 0) {
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
          {gallery.map((src, i) => (
            <button
              type="button"
              key={src}
              onClick={() => setOpenIdx(i)}
              className={`w-[calc(100vw-2rem)] shrink-0 snap-center md:w-[calc(100%-3rem)] ${rotates[i % rotates.length]}`}
              style={{ maxWidth: "100%" }}
            >
              <div
                className={`overflow-hidden rounded-2xl border-[3px] border-foreground ${TONE_BG[tone]} shadow-[8px_8px_0_0_hsl(var(--foreground))]`}
              >
                <div className="aspect-[4/5] w-full">
                  <img
                    src={src}
                    alt={`${name} — кадр ${i + 1}`}
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
          src={gallery[openIdx]}
          open
          onClose={() => setOpenIdx(null)}
        />
      )}
    </section>
  );
}

/* ---------- CTA ---------- */

function ContactCta({ onContact, pending }: { onContact: () => void; pending: boolean }) {
  return (
    <section className="scroll-mt-4">
      <button
        type="button"
        onClick={onContact}
        disabled={pending}
        className="group flex w-full items-center justify-center gap-3 rounded-3xl border-[3px] border-foreground bg-[#B6FF3C] px-6 py-6 font-display text-2xl font-black uppercase tracking-tight text-black shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-transform duration-150 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0_0_hsl(var(--foreground))] disabled:opacity-60 md:text-3xl"
      >
        {pending ? "Открываем чат…" : "Связаться"} <PlumpArrowRight className="h-6 w-6" />
      </button>
      <p className="mt-3 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Договорись по времени в чате
      </p>
    </section>
  );
}

function BottomActions({ onContact, pending }: { onContact: () => void; pending: boolean }) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onContact}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-foreground bg-[#B6FF3C] px-8 py-3 font-display text-sm font-black uppercase tracking-widest text-black shadow-[6px_6px_0_0_hsl(var(--foreground))] disabled:opacity-60"
      >
        {pending ? "Открываем…" : "Связаться"} <PlumpArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
