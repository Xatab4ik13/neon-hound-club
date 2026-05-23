import { toast as sonnerToast } from "sonner";
import { Check, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "success" | "error" | "info";

const VARIANTS: Record<
  Variant,
  { Icon: typeof Check; eyebrow: string; accent: string }
> = {
  success: { Icon: Check, eyebrow: "OK", accent: "var(--primary)" },
  error: { Icon: TriangleAlert, eyebrow: "ERR", accent: "var(--destructive)" },
  info: { Icon: Info, eyebrow: "INFO", accent: "var(--primary)" },
};

/**
 * Кастомный HHR-toast: компактная капсула top-center.
 * Не «классический iOS» — собственная эстетика проекта:
 * - тёмный blur-фон, тонкая цветная полоска-индикатор слева
 * - моно eyebrow + bold uppercase title
 * - тонкая прогресс-полоса снизу (auto-dismiss таймер)
 * - анимация mount/unmount → sonner (translateY+opacity)
 * Tap по капсуле — закрывает.
 */
function HHToast({
  id,
  variant,
  title,
  meta,
  duration,
}: {
  id: string | number;
  variant: Variant;
  title: ReactNode;
  meta?: ReactNode;
  duration: number;
}) {
  const { Icon, eyebrow, accent } = VARIANTS[variant];
  return (
    <button
      type="button"
      onClick={() => sonnerToast.dismiss(id)}
      className="group relative flex w-[min(92vw,360px)] items-stretch overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101012]/95 text-left shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl transition active:scale-[0.985]"
      style={{
        // тонкое свечение в цвет акцента — почти незаметно, но «своё»
        boxShadow: `0 10px 30px -12px rgba(0,0,0,0.7), inset 0 0 0 1px color-mix(in oklab, ${accent} 10%, transparent)`,
      }}
    >
      {/* вертикальная полоска-индикатор */}
      <span
        aria-hidden
        className="w-[3px] shrink-0"
        style={{ background: accent }}
      />

      {/* иконка */}
      <span
        className="flex w-10 shrink-0 items-center justify-center"
        aria-hidden
      >
        <span
          className="grid h-6 w-6 place-items-center rounded-full"
          style={{
            background: `color-mix(in oklab, ${accent} 18%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="size-3.5" strokeWidth={3} />
        </span>
      </span>

      {/* контент */}
      <div className="flex min-w-0 flex-1 flex-col justify-center py-2.5 pr-4">
        <div
          className="font-mono text-[9px] font-bold uppercase tracking-[0.22em]"
          style={{ color: accent }}
        >
          {meta != null ? eyebrow : `HRC // ${eyebrow}`}
        </div>
        <div className="mt-0.5 truncate font-display text-[14px] font-black uppercase italic leading-tight tracking-tight text-foreground">
          {title}
        </div>
        {meta != null && (
          <div className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {meta}
          </div>
        )}
      </div>

      {/* прогресс-полоса auto-dismiss */}
      <span
        aria-hidden
        className="hh-toast-bar absolute bottom-0 left-0 h-[2px] origin-left"
        style={{
          width: "100%",
          background: `color-mix(in oklab, ${accent} 60%, transparent)`,
          animation: `hh-toast-bar ${duration}ms linear forwards`,
        }}
      />
    </button>
  );
}

type Opts = {
  meta?: ReactNode;
  /** Алиас meta — для совместимости с sonner-стилем `{ description }`. */
  description?: ReactNode;
  duration?: number;
};

function make(variant: Variant) {
  return (title: ReactNode, opts: Opts = {}) => {
    const duration = opts.duration ?? 3200;
    const meta = opts.meta ?? opts.description;
    return sonnerToast.custom(
      (id) => (
        <HHToast
          id={id}
          variant={variant}
          title={title}
          meta={meta}
          duration={duration}
        />
      ),
      { duration },
    );
  };
}

const successFn = make("success");

/**
 * Drop-in replacement для `import { toast } from "sonner"`.
 * Поддерживает: toast(...) / toast.success / toast.error / toast.info / toast.dismiss.
 */
function callable(title: ReactNode, opts?: Opts) {
  return successFn(title, opts);
}

export const hhToast = Object.assign(callable, {
  success: successFn,
  error: make("error"),
  info: make("info"),
  message: successFn,
  dismiss: sonnerToast.dismiss,
});
