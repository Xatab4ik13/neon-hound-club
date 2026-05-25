import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

export type HeroSlide = {
  id: string;
  eyebrow?: string; // small label e.g. "ЛИМИТ 50 ШТ. · −15% ПО GOLD PASS"
  title: string;
  cta: string;
  to: string; // internal route
  // visual
  gradient: string; // CSS background gradient
};

// Хардкод-моки (потом — через админку)
const SLIDES: HeroSlide[] = [
  {
    id: "merch-black-hound",
    eyebrow: "Лимит 50 шт. · −15% по Gold Pass",
    title: "BLACK HOUND\nJACKET",
    cta: "К товару",
    to: "/club/shop",
    gradient:
      "radial-gradient(120% 90% at 85% 40%, oklch(0.55 0.22 357.3) 0%, oklch(0.32 0.18 357.3) 45%, oklch(0.18 0.10 357.3) 100%)",
  },
  {
    id: "hell-pass-gold",
    eyebrow: "30 дней доступа · +билеты сразу",
    title: "HELL PASS\nGOLD",
    cta: "Открыть",
    to: "/club/hell-pass",
    gradient:
      "radial-gradient(120% 90% at 15% 30%, oklch(0.50 0.18 60) 0%, oklch(0.28 0.12 50) 50%, oklch(0.16 0.06 40) 100%)",
  },
  {
    id: "quest-week",
    eyebrow: "Дедлайн через 3 дня · +500 билетов",
    title: "КВЕСТ\nНЕДЕЛИ",
    cta: "Участвовать",
    to: "/club/quests",
    gradient:
      "radial-gradient(120% 90% at 80% 70%, oklch(0.48 0.18 240) 0%, oklch(0.26 0.12 240) 50%, oklch(0.14 0.06 240) 100%)",
  },
  {
    id: "new-video",
    eyebrow: "Новое видео на канале",
    title: "GTR vs M5\nНОЧНОЙ ЗАМЕС",
    cta: "Смотреть",
    to: "/club",
    gradient:
      "radial-gradient(120% 90% at 50% 50%, oklch(0.45 0.20 150) 0%, oklch(0.24 0.12 150) 50%, oklch(0.12 0.05 150) 100%)",
  },
];

const AUTO_MS = 5000;

export function FeedHeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const total = SLIDES.length;

  // Auto-rotate
  useEffect(() => {
    if (paused) return;
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
    // resume after a moment
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
        {/* Track */}
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {SLIDES.map((s) => (
            <HeroSlideCard key={s.id} slide={s} />
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((s, i) => {
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
    </section>
  );
}

function HeroSlideCard({ slide }: { slide: HeroSlide }) {
  return (
    <div
      className="relative aspect-[16/10] w-full shrink-0"
      style={{ background: slide.gradient }}
    >
      {/* Abstract circle pattern overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 80% 60%, rgba(255,255,255,0.9) 0, transparent 40%), repeating-radial-gradient(circle at 80% 60%, rgba(255,255,255,0.5) 0, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 18px)",
        }}
      />
      {/* Dark bottom fade for legibility */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/40 to-transparent"
      />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="pt-2">
          <h2 className="whitespace-pre-line font-display text-[28px] font-black uppercase italic leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            {slide.title}
          </h2>
          {slide.eyebrow && (
            <p className="mt-2 text-[13px] leading-snug text-white/85">
              {slide.eyebrow}
            </p>
          )}
        </div>

        <div>
          <Link
            to={slide.to}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
          >
            {slide.cta}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  );
}
