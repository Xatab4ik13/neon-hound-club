import { toast as sonnerToast } from "sonner";
import { Check, Info, TriangleAlert, X } from "lucide-react";
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

function HHToast({
  id,
  variant,
  title,
  meta,
}: {
  id: string | number;
  variant: Variant;
  title: ReactNode;
  meta?: ReactNode;
}) {
  const { Icon, eyebrow, accent } = VARIANTS[variant];
  return (
    <div
      className="relative flex w-[min(92vw,380px)] items-stretch border-2 bg-background"
      style={{
        borderColor: `oklch(${accent})`,
        boxShadow: `6px 6px 0 0 oklch(${accent} / 0.28)`,
      }}
    >
      {/* Icon bar */}
      <div
        className="flex w-11 shrink-0 items-center justify-center"
        style={{ background: `oklch(${accent})` }}
      >
        <Icon className="size-5 text-background" strokeWidth={3} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
        <div
          className="font-display text-base uppercase leading-tight tracking-wider text-foreground"
          style={{ fontWeight: 700 }}
        >
          {title}
        </div>
        {meta ? (
          <div
            className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-widest"
            style={{ color: `oklch(${accent})` }}
          >
            {meta}
          </div>
        ) : (
          <div
            className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-widest"
            style={{ color: `oklch(${accent})` }}
          >
            HRC // {eyebrow}
          </div>
        )}
      </div>

      {/* Close */}
      <button
        onClick={() => sonnerToast.dismiss(id)}
        aria-label="Закрыть"
        className="flex items-start px-2 py-2 text-foreground/30 transition-colors hover:text-foreground"
      >
        <X className="size-4" strokeWidth={2} />
      </button>

      {/* Corner detail */}
      <div
        aria-hidden
        className="absolute -right-[3px] -top-[3px] size-1.5"
        style={{ background: `oklch(${accent})` }}
      />
    </div>
  );
}

type Opts = { meta?: ReactNode; duration?: number };

function make(variant: Variant) {
  return (title: ReactNode, opts: Opts = {}) =>
    sonnerToast.custom(
      (id) => (
        <HHToast id={id} variant={variant} title={title} meta={opts.meta} />
      ),
      { duration: opts.duration ?? 3500 },
    );
}

export const hhToast = {
  success: make("success"),
  error: make("error"),
  info: make("info"),
  dismiss: sonnerToast.dismiss,
};
