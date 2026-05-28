// iOS-style date picker через 3 wheel-барабана (день/месяц/год).
// На мобиле заменяет <input type="date">.

import { useMemo, useState, useEffect } from "react";
import { IOSWheelPicker } from "./IOSWheelPicker";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** ISO YYYY-MM-DD или пусто. */
  value: string;
  onChange: (iso: string) => void;
  title?: string;
};

const MONTHS = [
  "Января",
  "Февраля",
  "Марта",
  "Апреля",
  "Мая",
  "Июня",
  "Июля",
  "Августа",
  "Сентября",
  "Октября",
  "Ноября",
  "Декабря",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function parse(iso: string): { d: number; m: number; y: number } {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return { d, m, y };
  }
  const t = new Date();
  return { d: t.getDate(), m: t.getMonth() + 1, y: t.getFullYear() };
}

export function IOSDateSheet({ open, onOpenChange, value, onChange, title = "Дата" }: Props) {
  const init = useMemo(() => parse(value), [value, open]);
  const [d, setD] = useState(init.d);
  const [m, setM] = useState(init.m);
  const [y, setY] = useState(init.y);

  useEffect(() => {
    if (open) {
      setD(init.d);
      setM(init.m);
      setY(init.y);
    }
  }, [open, init.d, init.m, init.y]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const list: string[] = [];
    for (let yy = now; yy >= 1970; yy--) list.push(String(yy));
    return list;
  }, []);

  const days = useMemo(() => {
    const last = new Date(y, m, 0).getDate();
    return Array.from({ length: last }, (_, i) => pad(i + 1));
  }, [m, y]);

  // Эмитим при каждом изменении (готово просто закрывает).
  useEffect(() => {
    if (!open) return;
    const last = new Date(y, m, 0).getDate();
    const safeD = Math.min(d, last);
    onChange(`${y}-${pad(m)}-${pad(safeD)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y]);

  return (
    <IOSWheelPicker
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      columns={[
        {
          options: days,
          value: pad(Math.min(d, days.length)),
          onChange: (v) => setD(Number(v)),
          width: "w-16",
        },
        {
          options: MONTHS,
          value: MONTHS[m - 1],
          onChange: (v) => setM(MONTHS.indexOf(v) + 1),
          width: "w-32",
        },
        {
          options: years,
          value: String(y),
          onChange: (v) => setY(Number(v)),
          width: "w-20",
        },
      ]}
    />
  );
}
