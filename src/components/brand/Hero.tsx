import { useEffect, useState } from "react";
import pinkR6 from "@/assets/pink-r6.jpg";

/**
 * Hero — HELLHOUND Racing Club.
 * HUD-style underground racing landing block.
 * Composition: copy left, live giveaway card right, telemetry markers in the corners.
 */

// Target end date for the active giveaway countdown (mock until real data).
const RAFFLE_END = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString();

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
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  return { days, hours, minutes, seconds };
}

function CornerMark({
  position,
  label,
  value,
}: {
  position: "tl" | "tr" | "bl" | "br";
  label: string;
  value: string;
}) {
  const pos = {
    tl: "left-6 top-24 items-start",
    tr: "right-6 top-24 items-end",
    bl: "left-6 bottom-6 items-start",
    br: "right-6 bottom-6 items-end",
  }[position];

  const bracket = {
    tl: "border-l border-t",
    tr: "border-r border-t",
    bl: "border-l border-b",
    br: "border-r border-b",
  }[position];

  return (
    <div
      className={`pointer-events-none absolute z-10 hidden flex-col gap-1 lg:flex ${pos}`}
      aria-hidden
    >
      <div className={`size-3 border-primary/60 ${bracket}`} />
      <div className="font-mono text-[10px] uppercase leading-none tracking-[0.2em] text-muted-foreground/70">
        {label}
      </div>
      <div className="font-mono text-[10px] leading-none tracking-tight text-foreground/80">
        {value}
      </div>
    </div>
  );
}

export function Hero() {
  const { days, hours, minutes, seconds } = useCountdown(RAFFLE_END);
  const countdown = `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-24">
      {/* Ambient backdrop — radial pink glow + subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 30% 35%, oklch(0.62 0.22 5 / 0.08), transparent 70%), radial-gradient(40% 40% at 80% 70%, oklch(0.62 0.22 5 / 0.05), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.95 0 0 / 0.3) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.95 0 0 / 0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      {/* HUD corner markers */}
      <CornerMark position="tl" label="NODE" value="HH-01" />
      <CornerMark position="tr" label="STATUS" value="● LIVE" />
      <CornerMark position="bl" label="LAT" value="55.7558 N" />
      <CornerMark position="br" label="PING" value="14MS / OK" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-end gap-12 lg:grid-cols-[1.1fr_440px]">
          {/* COPY */}
          <div className="space-y-8">
            <h1 className="font-display text-[clamp(3.5rem,9vw,9.5rem)] font-bold uppercase leading-[0.85] tracking-[-0.03em]">
              <span className="block animate-[fade-in_0.8s_ease-out]">Hellhound</span>
              <span className="block animate-[fade-in_1s_ease-out]">
                <span className="text-primary">Racing</span>{" "}
                <span className="text-foreground">Club</span>
              </span>
            </h1>

            <div className="flex items-center gap-3">
              <span className="inline-block h-1 w-1 rounded-full bg-primary" />
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Официальный клуб подписчиков HELLHOUND Racing
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <button
                type="button"
                className="group relative inline-flex items-center gap-3 overflow-hidden bg-primary px-7 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground ring-1 ring-primary transition-all hover:shadow-[0_0_32px_-4px_oklch(0.62_0.22_5/0.7)] active:scale-[0.98]"
              >
                <span>Вступить в клуб</span>
                <span aria-hidden className="font-mono transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <a
                href="#race-pass"
                className="inline-flex items-center gap-3 border border-border bg-background/40 px-7 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <span className="size-1.5 rounded-full bg-primary/70" />
                Race Pass
              </a>
            </div>
          </div>

          {/* GIVEAWAY CARD */}
          <aside
            id="race-pass"
            className="relative rounded-xl border border-border/80 bg-surface/80 p-5 ring-1 ring-black/40 backdrop-blur-sm"
          >
            {/* Card HUD bracket */}
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
              {/* scan-line overlay */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 2px, oklch(0 0 0 / 0.5) 2px, oklch(0 0 0 / 0.5) 3px)",
                }}
              />
              {/* corner readout on image */}
              <div className="absolute bottom-2 left-2 font-mono text-[9px] uppercase tracking-[0.2em] text-foreground/80">
                YZF-R6 / 599cc / MOD.PINK
              </div>
              <div className="absolute top-2 right-2 font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
                PRIZE_01
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
