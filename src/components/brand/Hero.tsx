import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useViewer } from "@/hooks/use-viewer";
import { fetchHomeRaffles, type HomeRaffleItem } from "@/lib/queries";
import pinkR6 from "@/assets/pink-r6.jpg";
import heroBg from "@/assets/hero-bg.jpg";

/**
 * Hero — HELLHOUND Racing Club.
 * Слева: имя клуба + слоган + CTA.
 * Справа: плашка активного конкурса (мотоцикл + таймер) — данные из бекенда.
 */

function useCountdown(target: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds };
}

const pad = (n: number) => n.toString().padStart(2, "0");

export function Hero() {
  const { isAuthed } = useViewer();

  const { data } = useQuery({
    queryKey: ["raffles", "home"],
    queryFn: fetchHomeRaffles,
    staleTime: 60_000,
  });

  const raffle: HomeRaffleItem | undefined = data?.items?.[0];
  const endsAt = raffle ? new Date(raffle.endsAt) : null;
  const { days, hours, minutes, seconds } = useCountdown(endsAt);

  const prizeLabel =
    raffle?.prizes?.[0]?.name ?? raffle?.prize ?? raffle?.title ?? "";
  const image = raffle?.imageUrl || pinkR6;
  const raffleHref = raffle
    ? isAuthed
      ? `/club/raffles/${raffle.id}`
      : "/login"
    : isAuthed
      ? "/club/raffles"
      : "/login";

  return (
    <section className="relative overflow-hidden px-6 py-20 md:px-12 md:py-28">
      {/* BG image */}
      <img
        src={heroBg}
        alt=""
        aria-hidden
        width={1920}
        height={1088}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
      />
      {/* Vignette / затемнение слева для читаемости текста */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40"
      />


      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
        {/* LEFT — BRAND + SLOGAN + CTA */}
        <div className="min-w-0 lg:col-span-8">
          <h1 className="font-display uppercase leading-[0.85] tracking-tighter">
            <span className="block text-foreground [font-size:clamp(3rem,12vw,11rem)]">
              HELL<span className="text-primary">HOUND</span>
            </span>
            <span className="mt-3 block font-display text-2xl uppercase tracking-[0.25em] text-muted-foreground sm:text-3xl lg:text-4xl">
              Racing Club
            </span>
          </h1>

          <p className="mt-8 max-w-[36ch] text-pretty text-lg text-muted-foreground md:text-xl">
            Магазин. Школа. Гараж. Призы. AI-механик. Для тех, кто живёт
            мото-комьюнити.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              to={isAuthed ? "/club" : "/login"}
              className="group relative inline-block overflow-hidden bg-primary px-10 py-5 text-center font-display text-xl italic font-bold uppercase tracking-widest text-black transition-all duration-300 active:scale-[0.97]"
              style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
            >
              <span
                aria-hidden
                className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
              />
              <span className="relative z-10 inline-flex items-center gap-3">
                {isAuthed ? "В клуб" : "Войти в клуб"}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
            <div className="flex flex-col">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                Регистрация
              </span>
              <span className="font-display text-xl uppercase text-foreground">
                Бесплатно
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT — RAFFLE CARD */}
        {raffle ? (
          <aside className="lg:col-span-4">
            <Link
              to={raffleHref}
              className="group relative block overflow-hidden border border-border bg-card transition-colors hover:border-primary/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Акция / идёт
                </div>
              </div>

              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                <img
                  src={image}
                  alt={prizeLabel ? `${prizeLabel} — главный приз акции` : "Главный приз акции"}
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Главный приз
                  </div>
                  <div className="font-display text-2xl uppercase tracking-tight text-foreground md:text-3xl">
                    {prizeLabel}
                  </div>
                </div>
              </div>

              {/* Countdown */}
              <div className="px-5 py-5">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  До конца акции

                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { v: days, l: "дни" },
                    { v: hours, l: "часы" },
                    { v: minutes, l: "мин" },
                    { v: seconds, l: "сек" },
                  ].map((u) => (
                    <div
                      key={u.l}
                      className="flex flex-col items-center border border-border bg-background py-3"
                    >
                      <span className="font-display text-3xl tabular-nums leading-none text-foreground">
                        {pad(u.v)}
                      </span>
                      <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                        {u.l}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-end border-t border-border pt-4">
                  <span className="text-sm font-medium uppercase tracking-[0.15em] text-primary transition-transform group-hover:translate-x-1">
                    Участвовать →
                  </span>
                </div>
              </div>
            </Link>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
