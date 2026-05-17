import { Pencil, Trash2 } from "lucide-react";
import placeholderBike from "@/assets/bikes/placeholder.png";
import type { StoredBike } from "@/data/bike-storage";

type Props = {
  bike: StoredBike;
  onEdit: () => void;
  onDelete: () => void;
};

export function BikeCard({ bike, onEdit, onDelete }: Props) {
  const photo = bike.photo || placeholderBike;
  const hasPhoto = !!bike.photo;

  return (
    <article className="group relative overflow-hidden border border-white/[0.06] bg-card/40 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40">
      {/* Фото байка на градиентном фоне */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-b from-surface to-background">
        {/* halftone декор */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        {/* line-ы по краям */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent)",
          }}
        />

        <img
          src={photo}
          alt={`${bike.brand} ${bike.model}`}
          loading="lazy"
          className="bike-photo absolute inset-0 m-auto h-full w-full object-contain p-6 transition-all duration-500 group-hover:scale-[1.04]"
        />

        {/* Тонкий glow по контуру PNG с альфой */}
        <style>{`
          .bike-photo {
            filter:
              drop-shadow(0 0 1px color-mix(in oklab, var(--primary) 80%, transparent))
              drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 30%, transparent));
          }
          .group:hover .bike-photo {
            filter:
              drop-shadow(0 0 2px color-mix(in oklab, var(--primary) 90%, transparent))
              drop-shadow(0 0 14px color-mix(in oklab, var(--primary) 50%, transparent));
          }
        `}</style>

        {/* Бейджи в углу */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {bike.custom && (
            <span className="border border-primary/40 bg-black/60 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-primary backdrop-blur">
              Custom
            </span>
          )}
          {!hasPhoto && (
            <span className="border border-white/[0.12] bg-black/60 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
              Загрузи своё фото
            </span>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Редактировать байк"
            className="flex h-8 w-8 items-center justify-center border border-white/[0.1] bg-black/70 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Удалить байк"
            className="flex h-8 w-8 items-center justify-center border border-white/[0.1] bg-black/70 text-muted-foreground backdrop-blur transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Текстовая часть */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {bike.brand} · <span className="text-primary">{bike.year}</span>
            </div>
            <h3 className="mt-0.5 truncate font-display text-2xl font-black uppercase italic tracking-tight text-foreground">
              {bike.model}
            </h3>
            {bike.nickname && (
              <div className="mt-1 font-mono text-[11px] italic text-muted-foreground">
                «{bike.nickname}»
              </div>
            )}
          </div>
          {bike.mileage && (
            <div className="shrink-0 text-right">
              <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                {bike.mileage}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                пробег
              </div>
            </div>
          )}
        </div>

        {(bike.color || (bike.mods && bike.mods.length > 0)) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {bike.color && (
              <span className="border border-white/[0.08] bg-black/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {bike.color}
              </span>
            )}
            {bike.mods?.map((m) => (
              <span
                key={m}
                className="border border-primary/30 bg-primary/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
