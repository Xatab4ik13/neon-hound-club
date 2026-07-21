import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useViewer } from "@/hooks/use-viewer";
import { fetchHomeRaffles, type HomeRaffleItem } from "@/lib/queries";
import { PlumpArrowRight } from "@/components/ui/icons";
import pinkR6 from "@/assets/pink-r6.jpg";
import heroBgAsset from "@/assets/hero-bg-new.jpg.asset.json";
import vanyaAsset from "@/assets/vanya-presenter.png.asset.json";
import comicBubble from "@/assets/zaletay-bubble.png.asset.json";


/**
 * Hero — HELLHOUND Racing Club.
 * Композиция: Ваня (PNG) слева показывает на плашку активного розыгрыша справа.
 * Плашка — скруглённая рамка, сверху картинка приза без обрезки,
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
        src={heroBgAsset.url}
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

      {/* DESKTOP-сцена: Ваня прижат к правому краю viewport'а, облако — на фиксированном
          расстоянии от него через clamp(). Пропорции сохраняются на любом мониторе. */}
      <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block">
        {/* Левый текст — опущен */}
        <div
          className="pointer-events-auto absolute z-20 flex flex-col px-6 md:px-12"
          style={{
            left: "2cm",
            top: "calc(16% + 4cm)",
            maxWidth: "clamp(380px, 36vw, 640px)",
          }}
        >
          <h1 className="font-display text-8xl font-black uppercase leading-[0.88] tracking-tight xl:text-[10.5rem]">
            <span className="text-primary">HELLHOUND</span>
            <br />
            <span className="text-foreground">Racing Club</span>
          </h1>
          <p className="mt-7 max-w-[38ch] text-2xl font-semibold uppercase leading-snug tracking-[0.18em] text-foreground/70 xl:text-3xl">
            Создано теми, кто едет
          </p>
          <Link
            to={isAuthed ? "/club" : "/login"}
            className="group relative mt-9 inline-flex w-fit items-center overflow-hidden bg-primary px-14 py-6 font-display text-2xl font-black uppercase italic tracking-widest text-black shadow-[0_0_40px_-12px_hsl(var(--primary)/0.55)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_55px_-8px_hsl(var(--primary)/0.75)] active:scale-[0.97]"
            style={{ clipPath: "polygon(0 15%, 100% 0, 100% 100%, 0 85%)" }}
          >
            <span
              aria-hidden
              className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"
            />
            <span className="relative z-10 inline-flex items-center justify-center gap-3">
              Вступить в клуб
              <PlumpArrowRight className="h-7 w-7" />
            </span>
          </Link>
        </div>

        {/* Ваня */}
        <div
          className="absolute right-0"
          style={{
            bottom: "clamp(calc(20px + 3cm), calc(4vh + 3cm), calc(80px + 3cm))",
            width: "clamp(440px, 34vw, 640px)",
          }}
        >
          <img
            src={vanyaAsset.url}
            alt="Ваня — HELLHOUND Racing"
            className="relative z-10 h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
            style={{
              WebkitMaskImage:
                "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
            }}
          />

          {/* Бабл из комикса над шлемом Вани */}
          {raffle ? (
            <div
              className="pointer-events-none absolute z-30"
              style={{
                top: "calc(-18% - 5cm)",
                right: "calc(12% - 2cm)",
                width: "clamp(200px, 20vw, 320px)",
              }}
            >
              <img
                src={comicBubble.url}
                alt=""
                aria-hidden
                width={1024}
                height={1024}
                className="h-auto w-full"
                loading="eager"
              />
            </div>
          ) : null}
        </div>

        {/* Плашка розыгрыша — позиционируется от правого края, чтобы держать
            фиксированное расстояние до Вани. */}
        {raffle ? (
          <div
            className="pointer-events-auto absolute z-20"
            style={{
              right: "clamp(200px, 16vw, 310px)",
              bottom: "clamp(calc(190px + 3cm), calc(25vh + 3cm), calc(340px + 3cm))",
              width: "clamp(360px, 28vw, 480px)",
            }}
          >
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

      </div>

      {/* MOBILE / TABLET — вертикальный стек */}
      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-end gap-8 lg:hidden">
        {/* Заголовок и описание — опущены вниз, чтобы логотип в шапке не перекрывал */}
        <div className="relative z-20 order-1 flex flex-col items-center px-6 pt-24 text-center sm:pt-32">
          <h1 className="font-display text-6xl font-black uppercase leading-[0.88] tracking-tight text-foreground sm:text-7xl">
            <span className="text-primary">HELLHOUND</span>
            <br />
            <span className="text-foreground">Racing Club</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[38ch] text-lg font-semibold uppercase leading-snug tracking-[0.18em] text-foreground/70 sm:text-xl">
            Создано теми, кто едет
          </p>
        </div>

        {/* Ваня + розыгрыш в одну линию, вплотную */}
        <div className="relative order-2 flex items-end justify-center px-2">
          {raffle ? (
            <div className="relative z-20 w-[52%] max-w-[280px] pb-2 -mr-4">
              <RaffleCloud
                image={image}
                href={raffleHref}
                days={days}
                hours={hours}
                minutes={minutes}
                seconds={seconds}
                compact
              />
            </div>
          ) : null}
          <div className="relative w-[52%] max-w-[280px] -ml-4">
            <img
              src={vanyaAsset.url}
              alt="Ваня — HELLHOUND Racing"
              className="relative z-10 h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 0%, black 80%, transparent 100%)",
              }}
            />
          </div>
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
  compact = false,
}: {
  image: string;
  href: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  compact?: boolean;
}) {
  return (
    <div className="relative mx-auto max-w-md">
      {/* Скруглённая рамка с картинкой приза (contain — без обрезки) */}
      <Link
        to={href}
        aria-label="Открыть розыгрыш"
        className="group relative block w-full overflow-hidden rounded-3xl border border-primary/30 bg-card/60 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.5)] backdrop-blur-sm transition-transform duration-500 hover:scale-[1.015]"
      >
        <img
          src={image}
          alt="Главный приз розыгрыша"
          className="h-auto w-full object-contain transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-primary/20"
        />
      </Link>

      {/* Таймер — прозрачный, без рамок */}
      <div
        className={`flex items-end justify-center ${
          compact ? "mt-3 gap-1.5" : "mt-6 gap-4 sm:gap-6"
        }`}
      >
        {[
          { v: days, l: "дни" },
          { v: hours, l: "часы" },
          { v: minutes, l: "мин" },
          { v: seconds, l: "сек" },
        ].map((u, i) => (
          <div
            key={u.l}
            className={`flex items-end ${compact ? "gap-1.5" : "gap-4 sm:gap-6"}`}
          >
            <div className="flex flex-col items-center">
              <span
                className={`font-display tabular-nums leading-none text-foreground ${
                  compact ? "text-lg" : "text-4xl sm:text-5xl"
                }`}
              >
                {pad(u.v)}
              </span>
              <span
                className={`font-mono uppercase tracking-[0.25em] text-muted-foreground ${
                  compact ? "mt-1 text-[7px]" : "mt-2 text-[9px]"
                }`}
              >
                {u.l}
              </span>
            </div>
            {i < 3 ? (
              <span
                aria-hidden
                className={`font-display leading-none text-primary/50 ${
                  compact ? "text-lg" : "text-4xl sm:text-5xl"
                }`}
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
