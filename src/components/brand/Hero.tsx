import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useViewer } from "@/hooks/use-viewer";
import { fetchHomeRaffles, type HomeRaffleItem } from "@/lib/queries";
import pinkR6 from "@/assets/pink-r6.jpg";
import heroBg from "@/assets/hero-bg.jpg";
import vanyaAsset from "@/assets/vanya-presenter.png.asset.json";

/**
 * Hero — HELLHOUND Racing Club.
 * Композиция: Ваня (PNG) слева показывает на плашку активного розыгрыша справа.
 * Плашка — «облако» (несимметричный blob), сверху лейбл, посередине картинка приза,
 * снизу таймер без рамок и отдельная кнопка "Участвовать".
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

  const image = raffle?.imageUrl || pinkR6;
  const raffleHref = raffle
    ? isAuthed
      ? `/club/raffles/${raffle.id}`
      : "/login"
    : isAuthed
      ? "/club/raffles"
      : "/login";

  return (
    <section className="relative -mt-20 flex min-h-[100svh] items-center overflow-hidden px-6 pb-20 pt-32 md:px-12 md:pb-28 md:pt-36">
      {/* BG image */}
      <img
        src={heroBg}
        alt=""
        aria-hidden
        width={1920}
        height={1088}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-background/60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30"
      />

      {/* VANYA — прижат к правому краю viewport'а */}
      <div className="pointer-events-none absolute bottom-14 right-0 z-10 hidden items-end lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-0 h-1/2 rounded-full bg-primary/25 blur-3xl"
        />
        <img
          src={vanyaAsset.url}
          alt="Ваня — HELLHOUND Racing"
          className="relative z-10 h-auto w-[560px] object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] xl:w-[680px] 2xl:w-[760px]"
        />
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-end gap-8 lg:grid-cols-12 lg:items-center lg:gap-4">
        {/* RAFFLE "CLOUD" — на десктопе перекрывает Ваню (по центру его жеста) */}
        {raffle ? (
          <div className="relative z-20 order-2 lg:order-1 lg:col-span-7 lg:col-start-4 xl:col-span-6 xl:col-start-5 lg:translate-x-10 xl:translate-x-16 2xl:translate-x-20">
            <RaffleCloud
              image={image}
              href={raffleHref}
              days={days}
              hours={hours}
              minutes={minutes}
              seconds={seconds}
            />
          </div>
        ) : null}

        {/* VANYA на мобилке — inline */}
        <div className="relative order-1 flex justify-center lg:hidden">
          <img
            src={vanyaAsset.url}
            alt="Ваня — HELLHOUND Racing"
            className="relative z-10 h-auto w-[380px] max-w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] sm:w-[460px]"
          />
        </div>
      </div>


    </section>
  );
}

function RaffleCloud({
  image,
  href,
  days,
  hours,
  minutes,
  seconds,
}: {
  image: string;
  href: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}) {
  // асимметричные радиусы = «облако»
  const cloudRadius =
    "62% 38% 55% 45% / 45% 55% 45% 55%";

  return (
    <div className="relative mx-auto max-w-md">
      {/* Лейбл сверху — в цвет пунктов меню */}
      <div className="mb-4 text-center font-display text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground sm:text-base">
        Активный розыгрыш
      </div>

      {/* Облако с картинкой приза (cover — заполняет всё облако) */}
      <Link
        to={href}
        aria-label="Открыть розыгрыш"
        className="group relative block aspect-[5/4] w-full overflow-hidden border border-primary/30 bg-card/60 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)] backdrop-blur-sm transition-transform duration-500 hover:scale-[1.015]"
        style={{ borderRadius: cloudRadius }}
      >
        <img
          src={image}
          alt="Главный приз розыгрыша"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
        {/* лёгкое магента-свечение по краю */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-primary/20"
          style={{ borderRadius: cloudRadius }}
        />
      </Link>



      {/* Таймер — прозрачный, без рамок */}
      <div className="mt-6 flex items-end justify-center gap-4 sm:gap-6">
        {[
          { v: days, l: "дни" },
          { v: hours, l: "часы" },
          { v: minutes, l: "мин" },
          { v: seconds, l: "сек" },
        ].map((u, i) => (
          <div key={u.l} className="flex items-end gap-4 sm:gap-6">
            <div className="flex flex-col items-center">
              <span className="font-display text-4xl tabular-nums leading-none text-foreground sm:text-5xl">
                {pad(u.v)}
              </span>
              <span className="mt-2 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                {u.l}
              </span>
            </div>
            {i < 3 ? (
              <span
                aria-hidden
                className="font-display text-4xl leading-none text-primary/50 sm:text-5xl"
              >
                :
              </span>
            ) : null}
          </div>
        ))}
      </div>

    </div>
  );
}
