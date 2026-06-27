import { useEffect, useState } from "react";

function diffParts(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return { days, hours, minutes, seconds, isOver: ms === 0 };
}

const pad = (n: number) => n.toString().padStart(2, "0");

type Props = {
  /** ISO-таймстемп закрытия. */
  deadlineAt: string;
  /** Прятать секунды (для компактных мест). */
  compact?: boolean;
  /** Визуальный вариант. tactical = крупно, ведущий разряд розовый и пульсирует. */
  variant?: "default" | "tactical";
};

export function Countdown({ deadlineAt, compact = false, variant = "default" }: Props) {
  const target = new Date(deadlineAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds, isOver } = diffParts(target, now);
  // <24ч → warning: цифры окрашиваются в primary, чтобы таймер визуально
  // выделялся среди прочих метаданных розыгрыша.
  const urgent = !isOver && days === 0;

  if (isOver) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        итоги подведены
      </span>
    );
  }

  if (variant === "tactical") {
    const units: { value: string; label: string }[] = [];
    if (days > 0) units.push({ value: pad(days), label: "д" });
    units.push({ value: pad(hours), label: "ч" });
    units.push({ value: pad(minutes), label: "м" });
    if (days === 0) units.push({ value: pad(seconds), label: "с" });

    return (
      <div className="flex items-baseline gap-2 font-mono tabular-nums">
        {units.map((u, i) => (
          <span key={u.label} className="inline-flex items-baseline">
            <span
              className={
                "text-2xl font-bold leading-none " +
                (i === 0 ? "text-primary animate-pulse" : "text-foreground")
              }
            >
              {u.value}
            </span>
            <span className="ml-1 text-[10px] font-bold uppercase text-muted-foreground">
              {u.label}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
      {days > 0 && <Unit value={String(days)} label="д" urgent={false} />}
      <Unit value={pad(hours)} label="ч" urgent={urgent} />
      <Unit value={pad(minutes)} label="м" urgent={urgent} />
      {!compact && <Unit value={pad(seconds)} label="с" urgent={urgent} />}
    </div>
  );
}

function Unit({ value, label, urgent = false }: { value: string; label: string; urgent?: boolean }) {
  return (
    <span className="inline-flex items-baseline">
      <span
        className={
          "font-display text-base font-black italic " +
          (urgent ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </span>
      <span className="ml-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
