import { useEffect, useState } from "react";
import pinkR6 from "@/assets/pink-r6.jpg";

/**
 * Hero — HELLHOUND Racing Club.
 * Левая колонка: заголовок-выгода + список причин вступить + CTA с пилюлей «Бесплатно».
 * Правая колонка: карточка активного розыгрыша (главный магнит).
 */

const RAFFLE_END = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString();

const BENEFITS = [
  {
    n: "01",
    title: "Розыгрыши мотоциклов",
    sub: "Project Pink R6 уже в розыгрыше. Дальше — больше.",
    tag: "сейчас",
  },
  {
    n: "02",
    title: "Мерч раньше остальных",
    sub: "Лимитки уходят за часы. Клуб видит первым.",
    tag: "сейчас",
  },
  {
    n: "03",
    title: "Видео до выхода на YouTube",
    sub: "Director's cut, RAW-камеры, бэкстейдж.",
    tag: "скоро",
  },
  {
    n: "04",
    title: "Чат райдеров СНГ",
    sub: "По городам и мото. Без TG и Discord.",
    tag: "скоро",
  },
  {
    n: "05",
    title: "Гараж и карта райдеров",
    sub: "Своя мото, свой уровень, свои люди рядом.",
    tag: "скоро",
  },
  {
    n: "06",
    title: "Школа Hellhound со скидкой",
    sub: "Город / Трек / Падение. Только для клуба.",
    tag: "скоро",
  },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function useCountdown(targetIso: string) {
  const target = new Date(targetIso).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

export function Hero() {
  const { days, hours, minutes, seconds } = useCountdown(RAFFLE_END);
  const countdown = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-24">
      {/* Ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 25% 30%, oklch(0.62 0.22 5 / 0.10), transparent 70%), radial-gradient(40% 40% at 85% 75%, oklch(0.62 0.22 5 / 0.06), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.95 0 0 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.95 0 0 / 0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-start gap-14 lg:grid-cols-[1.15fr_440px]">
          {/* LEFT: HEADLINE + BENEFITS + CTA */}
          <div className="space-y-10">
            {/* Headline — benefit-first */}
            <h1 className="font-display text-[clamp(3rem,7.5vw,7.5rem)] font-bold uppercase leading-[0.88] tracking-[-0.03em]">
              <span className="block">Мотоциклы.</span>
              <span className="block">
                Мерч. <span className="text-primary">Свои.</span>
              </span>
              <span className="block text-foreground/60">
                Всё это — клуб <span className="text-foreground">HELLHOUND</span>.
              </span>
            </h1>

            {/* Benefits list — editorial, hover reveals subtitle */}
            <ul className="divide-y divide-border border-y border-border">
              {BENEFITS.map((b) => (
                <li
                  key={b.n}
                  className="group grid grid-cols-[3rem_1fr_auto] items-center gap-6 py-4 transition-colors hover:bg-primary/[0.04]"
                >
                  <span className="font-mono text-xs text-muted-foreground/70 transition-colors group-hover:text-primary">
                    {b.n}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl uppercase tracking-tight md:text-2xl">
                      {b.title}
                    </div>
                    <div className="mt-0.5 max-h-0 overflow-hidden text-sm text-muted-foreground opacity-0 transition-all duration-300 group-hover:max-h-12 group-hover:opacity-100">
                      {b.sub}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${
                      b.tag === "сейчас" ? "text-primary" : "text-muted-foreground/60"
                    }`}
                  >
                    {b.tag}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA + free pill */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                className="group relative inline-flex items-center gap-3 overflow-hidden bg-primary px-7 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground ring-1 ring-primary transition-all hover:shadow-[0_0_32px_-4px_oklch(0.62_0.22_5/0.7)] active:scale-[0.98]"
              >
                <span>Войти в клуб</span>
                <span aria-hidden className="font-mono transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <div className="inline-flex items-center gap-2 border border-border bg-background/60 px-4 py-3 backdrop-blur-sm">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground">
                  Вход бесплатный · 0 ₽
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: GIVEAWAY CARD */}
          <aside
            id="race-pass"
            className="relative rounded-xl border border-border/80 bg-surface/80 p-5 ring-1 ring-black/40 backdrop-blur-sm lg:sticky lg:top-28"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-px -left-px size-4 border-l border-t border-primary"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-px -right-px size-4 border-b border-r border-primary"
            />

            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Активный розыгрыш
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                LIVE
              </span>
            </div>

            <div className="relative mb-5 overflow-hidden rounded-lg border border-border">
              <img
                src={pinkR6}
                alt="Project Pink R6 — главный приз розыгрыша"
                width={1280}
                height={768}
                className="aspect-[16/10] w-full object-cover"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, oklch(0 0 0 / 0.5) 2px, oklch(0 0 0 / 0.5) 3px)",
                }}
              />
              <div className="absolute bottom-2 left-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/80">
                YZF-R6 / 599cc / MOD.PINK
              </div>
            </div>

            <div className="mb-5">
              <div className="font-display text-2xl uppercase leading-none tracking-tight">
                Project Pink R6
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Главный приз / 1 победитель
              </div>
            </div>

            <div className="mb-5 border-t border-border pt-4">
              <div className="mb-2 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>До конца</span>
                <span>D : H : M : S</span>
              </div>
              <div
                className="font-mono text-[2.25rem] leading-none tracking-tight text-foreground tabular-nums"
                aria-live="polite"
              >
                {countdown}
              </div>
            </div>

            <button
              type="button"
              className="group flex w-full items-center justify-between border border-border bg-foreground px-5 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-background transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary"
            >
              <span>Участвовать</span>
              <span aria-hidden className="font-mono transition-transform group-hover:translate-x-1">
                →
              </span>
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
