// iOS-style time picker (часы:минуты, шаг 5 минут).

import { useEffect, useMemo, useState } from "react";
import { IOSWheelPicker } from "./IOSWheelPicker";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** "HH:MM" или пусто. */
  value: string;
  onChange: (v: string) => void;
  title?: string;
  /** Шаг минут, по умолчанию 5. */
  minuteStep?: number;
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function IOSTimeSheet({
  open,
  onOpenChange,
  value,
  onChange,
  title = "Время",
  minuteStep = 5,
}: Props) {
  const init = useMemo(() => {
    if (/^\d{2}:\d{2}$/.test(value)) {
      const [h, m] = value.split(":").map(Number);
      return { h, m };
    }
    const d = new Date();
    return { h: d.getHours(), m: 0 };
  }, [value, open]);

  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);

  useEffect(() => {
    if (open) {
      setH(init.h);
      setM(Math.round(init.m / minuteStep) * minuteStep);
    }
  }, [open, init.h, init.m, minuteStep]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minutes = useMemo(
    () =>
      Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => pad(i * minuteStep)),
    [minuteStep],
  );

  useEffect(() => {
    if (!open) return;
    onChange(`${pad(h)}:${pad(m)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [h, m]);

  return (
    <IOSWheelPicker
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      columns={[
        {
          options: hours,
          value: pad(h),
          onChange: (v) => setH(Number(v)),
          width: "w-16",
        },
        {
          options: minutes,
          value: pad(Math.round(m / minuteStep) * minuteStep),
          onChange: (v) => setM(Number(v)),
          width: "w-16",
        },
      ]}
    />
  );
}
