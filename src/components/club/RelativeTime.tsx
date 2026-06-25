// Живое относительное время. Один общий тикер на всё приложение —
// перерисовывает все экземпляры раз в 60 секунд.
// Использует Intl.RelativeTimeFormat для корректной русской морфологии.

import { useEffect, useState } from "react";

const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" });

// Общий тикер: один setInterval на всю страницу.
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  subs.add(cb);
  if (timer === null && typeof window !== "undefined") {
    timer = setInterval(() => subs.forEach((f) => f()), 60_000);
  }
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function format(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffSec = (t - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 45) return "только что";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(t).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

type Props = {
  iso?: string | null;
  /** Фолбэк, если iso отсутствует (например, серверный pre-format). */
  fallback?: string;
  className?: string;
};

export function RelativeTime({ iso, fallback, className }: Props) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!iso) return;
    return subscribe(() => tick((n) => n + 1));
  }, [iso]);
  const label = iso ? format(iso) : fallback ?? "";
  return (
    <time className={className} dateTime={iso ?? undefined}>
      {label}
    </time>
  );
}
