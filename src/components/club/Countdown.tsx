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
};

export function Countdown({ deadlineAt, compact = false }: Props) {
  const target = new Date(deadlineAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { days, hours, minutes, seconds, isOver } = diffParts(target, now);

  if (isOver) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        итоги подведены
      </span>
    );
  }

  return (
    <div className="flex items-baseline gap-1.5 font-mono tabular-nums">
      {days > 0 && (
        <Unit value={String(days)} label="д" />
      )}
      <Unit value={pad(hours)} label="ч" />
      <Unit value={pad(minutes)} label="м" />
      {!compact && <Unit value={pad(seconds)} label="с" />}
    </div>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline">
      <span className="font-display text-base font-black italic text-foreground">
        {value}
      </span>
      <span className="ml-0.5 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
    </span>
  );
}
