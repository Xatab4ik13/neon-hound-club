import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { fetchHomeBanners, type HomeBanner } from "@/lib/queries";

// Унифицированная модель слайда: либо картинка-фон (с бека), либо градиент-fallback (мок).
type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  cta: string;
  to: string;
  isExternal: boolean;
  imageUrl?: string;
  gradient?: string;
};

const FALLBACK_SLIDES: Slide[] = [
  {
    id: "merch-black-hound",
    eyebrow: "Лимит 50 шт. · −15% по Gold Pass",
    title: "BLACK HOUND\nJACKET",
    cta: "К товару",
    to: "/club/shop",
    isExternal: false,
    gradient:
      "radial-gradient(120% 90% at 85% 40%, oklch(0.55 0.22 357.3) 0%, oklch(0.32 0.18 357.3) 45%, oklch(0.18 0.10 357.3) 100%)",
  },
  {
    id: "hell-pass-gold",
    eyebrow: "30 дней доступа · +билеты сразу",
    title: "HELL PASS\nGOLD",
    cta: "Открыть",
    to: "/club/hell-pass",
    isExternal: false,
    gradient:
      "radial-gradient(120% 90% at 15% 30%, oklch(0.50 0.18 60) 0%, oklch(0.28 0.12 50) 50%, oklch(0.16 0.06 40) 100%)",
  },
  {
    id: "quest-week",
    eyebrow: "Дедлайн через 3 дня · +500 билетов",
    title: "КВЕСТ\nНЕДЕЛИ",
    cta: "Участвовать",
    to: "/club/quests",
    isExternal: false,
    gradient:
      "radial-gradient(120% 90% at 80% 70%, oklch(0.48 0.18 240) 0%, oklch(0.26 0.12 240) 50%, oklch(0.14 0.06 240) 100%)",
  },
];

function toSlide(b: HomeBanner): Slide {
  return {
    id: b.id,
    eyebrow: b.eyebrow || undefined,
    title: b.title,
    cta: b.ctaLabel,
    to: b.ctaHref,
    isExternal: /^https?:\/\//i.test(b.ctaHref),
    imageUrl: b.imageUrl || undefined,
  };
}

const AUTO_MS = 5000;

export function FeedHeroCarousel() {
  const { data } = useQuery({
    queryKey: ["home-banners"],
    queryFn: fetchHomeBanners,
    staleTime: 60_000,
  });

  const slides: Slide[] =
    data?.banners && data.banners.length > 0
      ? data.banners.map(toSlide)
      : FALLBACK_SLIDES;

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
  const bgStyle: React.CSSProperties = slide.imageUrl
    ? {
        backgroundImage: `url(${JSON.stringify(slide.imageUrl)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: slide.gradient };

  const Cta = slide.isExternal ? (
    <a
      href={slide.to}
      target="_blank"
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
      {/* Узор поверх (только для fallback-градиентов, на фото мешает) */}
      {!slide.imageUrl && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 80% 60%, rgba(255,255,255,0.9) 0, transparent 40%), repeating-radial-gradient(circle at 80% 60%, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 18px)",
          }}
        />
      )}
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
