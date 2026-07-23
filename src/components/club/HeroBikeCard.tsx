import { Pencil, Trash2 } from "@/components/ui/icons";
import placeholderBike from "@/assets/bikes/placeholder.png";
import type { StoredBike } from "@/data/bike-storage";

type Props = {
  bike: StoredBike;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * Большая hero-карточка байка для блока «Мой гараж».
 * Aspect 21/9, фото на тёмном градиенте с pink glow.
 */
export function HeroBikeCard({ bike, onEdit, onDelete }: Props) {
  const photo = bike.photo || placeholderBike;
  const hasPhoto = !!bike.photo;

  return (
    <article className="group relative overflow-hidden border border-white/[0.06] bg-card/40 transition-colors hover:border-primary/40">
      {/* Фото */}
      <div className="relative aspect-[21/9] overflow-hidden bg-gradient-to-b from-surface to-background">
        {/* halftone */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        />
        {/* верхняя розовая полоска */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)",
          }}
        />

        <img
          src={photo}
          alt={`${bike.brand} ${bike.model}`}
          loading="lazy"
          className="hero-bike-photo absolute inset-0 m-auto h-full w-full object-contain p-8 transition-transform duration-700 group-hover:scale-[1.03]"
        />

        <style>{`
          .hero-bike-photo {
            filter:
              drop-shadow(0 0 2px color-mix(in oklab, var(--primary) 80%, transparent))
              drop-shadow(0 0 14px color-mix(in oklab, var(--primary) 35%, transparent));
          }
          .group:hover .hero-bike-photo {
            filter:
              drop-shadow(0 0 3px color-mix(in oklab, var(--primary) 95%, transparent))
              drop-shadow(0 0 22px color-mix(in oklab, var(--primary) 55%, transparent));
          }
        `}</style>

        {/* нижний затемняющий градиент под текст */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        />

        {/* Бейджи */}
        <div className="absolute left-4 top-4 flex flex-col gap-1">
          {bike.custom && (
            <span className="border border-primary/40 bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary backdrop-blur">
              Custom
            </span>
          )}
          {!hasPhoto && (
            <span className="border border-white/[0.12] bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur">
              Загрузи своё фото
            </span>
          )}
        </div>

        {/* Управление */}
        <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            aria-label="Редактировать байк"
            className="flex h-9 w-9 items-center justify-center border border-white/[0.1] bg-black/70 text-muted-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Удалить байк"
            className="flex h-9 w-9 items-center justify-center border border-white/[0.1] bg-black/70 text-muted-foreground backdrop-blur transition-colors hover:border-destructive/50 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Подпись на фото */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 md:p-8">
          <div className="min-w-0">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-primary">
              Основной байк
            </div>
            <h3 className="truncate font-display text-3xl font-black uppercase  tracking-tight text-foreground md:text-4xl">
              {bike.brand} {bike.model}
            </h3>
            {bike.nickname && (
              <div className="mt-1 font-mono text-[11px]  text-muted-foreground">
                «{bike.nickname}»
              </div>
            )}
          </div>
          <div className="hidden shrink-0 border-l border-white/[0.1] pl-6 text-right md:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Год
            </div>
            <div className="font-display text-xl font-black  tabular-nums text-foreground">
              {bike.year}
            </div>
            {bike.mileage && (
              <>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Пробег
                </div>
                <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {bike.mileage}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Теги под фото (только если есть) */}
      {(bike.color || (bike.mods && bike.mods.length > 0)) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] p-4">
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
    </article>
  );
}
