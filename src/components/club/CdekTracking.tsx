// Раскрывающийся блок «Трек СДЭК» в карточке заказа.

import { useState } from "react";
import { Check, ChevronDown, ExternalLink, PlumpMap as MapPin, PlumpPackage as Package, PlumpTruck as Truck } from "@/components/ui/icons";
import {
  cdekProgressPct,
  CDEK_STATUS_LABEL,
  mockTrackForOrder,
} from "@/data/cdek-tracking";

type Props = {
  orderId: string;
};

export function CdekTracking({ orderId }: Props) {
  const track = mockTrackForOrder(orderId);
  const [open, setOpen] = useState(false);

  if (!track) return null;

  const pct = cdekProgressPct(track.status);
  const delivered = track.status === "delivered";

  return (
    <div className="border-t border-white/[0.04] bg-black/20">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
      >
        <Truck className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
            <span className="text-muted-foreground">СДЭК</span>
            <span className="text-foreground">{track.trackNumber}</span>
            <span className={delivered ? "text-green-400" : "text-primary"}>
              · {CDEK_STATUS_LABEL[track.status]}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: delivered ? "rgb(74, 222, 128)" : "var(--primary)",
              }}
            />
          </div>
        </div>
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          {track.eta}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/[0.04] px-4 py-4">
          {/* Маршрут */}
          <div className="mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Package className="h-3 w-3" />
              {track.from}
            </span>
            <div className="relative h-px bg-white/10">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${pct}%`,
                  backgroundColor: delivered ? "rgb(74, 222, 128)" : "var(--primary)",
                  height: "2px",
                  top: "-0.5px",
                }}
              />
            </div>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              {track.to}
            </span>
          </div>

          {/* Таймлайн */}
          <ol className="relative space-y-3 border-l border-white/[0.08] pl-4">
            {track.points.map((p) => (
              <li key={`${p.status}-${p.at}`} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[1.31rem] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full ${
                    p.done
                      ? track.status === p.status && !delivered
                        ? "bg-primary ring-2 ring-primary/30"
                        : "bg-green-400"
                      : "bg-white/20"
                  }`}
                >
                  {p.done && track.status !== p.status && (
                    <Check className="h-1.5 w-1.5 text-black" strokeWidth={4} />
                  )}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span
                    className={`text-sm ${p.done ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {p.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground tabular-nums">
                    {p.city} · {p.at}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <a
            href={`https://www.cdek.ru/ru/tracking?order_id=${track.trackNumber}`}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-1.5 border border-white/[0.08] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Открыть на cdek.ru
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
