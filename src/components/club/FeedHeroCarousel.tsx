import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlumpArrowRight as ArrowRight } from "@/components/ui/icons";
import { fetchHomeBanners, type HomeBanner } from "@/lib/queries";
import { bannerBackgroundStyle } from "@/lib/banner-presets";


// Унифицированная модель слайда: картинка-фон с бека.
type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  cta: string;
  to: string;
  isExternal: boolean;
  imageUrl?: string;
};

function toSlide(b: HomeBanner): Slide {
  let to = b.ctaHref;
  let isExternal = /^https?:\/\//i.test(to);
  // Если ссылка ведёт на тот же origin — превращаем в внутренний путь,
  // чтобы переход шёл через роутер (без выхода из PWA).
  if (isExternal && typeof window !== "undefined") {
    try {
      const u = new URL(to);
      if (u.origin === window.location.origin) {
        to = u.pathname + u.search + u.hash;
        isExternal = false;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    id: b.id,
    eyebrow: b.eyebrow || undefined,
    title: b.title,
    cta: b.ctaLabel,
    to,
    isExternal,
    imageUrl: b.imageUrl || undefined,
  };
}

const AUTO_MS = 5000;

// Фирменные акценты без розового — по очереди на баннеры.
const CTA_COLORS = ["#B6FF3C", "#FFD93D", "#3DDBD9", "#FF7A3D"];

export function FeedHeroCarousel() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-banners"],
    queryFn: fetchHomeBanners,
    staleTime: 60_000,
  });

  const slides: Slide[] = data?.banners ? data.banners.map(toSlide) : [];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const total = slides.length;

  // Если слайдов стало меньше после рефетча — не выйти за пределы.
  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const t = window.setTimeout(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, total]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) {
      setIndex((i) => (dx < 0 ? (i + 1) % total : (i - 1 + total) % total));
    }
    window.setTimeout(() => setPaused(false), 1500);
  };

  // Пока баннеров нет — секция не рендерится (никаких моков).
  if (total === 0) {
    if (isLoading) {
      return (
        <section className="mb-5" aria-label="Промо">
          <div className="aspect-[16/10] w-full animate-pulse rounded-[24px] bg-white/[0.04]" />
        </section>
      );
    }
    return null;
  }

  return (
    <section className="mb-5" aria-label="Промо">
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.4)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => (
            <HeroSlideCard key={s.id} slide={s} />
          ))}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {slides.map((s, i) => {
            const active = i === index;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Слайд ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  active ? "w-6 bg-primary" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function HeroSlideCard({ slide }: { slide: Slide }) {
  const bgStyle: React.CSSProperties = bannerBackgroundStyle(slide.imageUrl);


  const Cta = slide.isExternal ? (
    <a
      href={slide.to}
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
    >
      {slide.cta}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
    </a>
  ) : (
    <Link
      to={slide.to}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
    >
      {slide.cta}
      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
    </Link>
  );

  return (
    <div className="relative aspect-[16/10] w-full shrink-0 bg-zinc-900" style={bgStyle}>
      {/* Затемнение снизу для читабельности текста */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/65 via-black/30 to-transparent"
      />


      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="pt-2">
          <h2 className="whitespace-pre-line font-display text-[28px] font-black uppercase italic leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {slide.title}
          </h2>
          {slide.eyebrow && (
            <p className="mt-2 text-[13px] leading-snug text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              {slide.eyebrow}
            </p>
          )}
        </div>

        <div>{Cta}</div>
      </div>
    </div>
  );
}
