// iOS-style сгруппированный список: секция с заголовком + строки с разделителями.
// Используется в формах/настройках для тёмного "grouped inset" вида.

import type { ReactNode } from "react";
import { PlumpArrowRight as ChevronRight } from "@/components/ui/icons";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function IOSListSection({
  title,
  footer,
  children,
  className,
}: {
  title?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-1.5", className)}>
      {title && (
        <h3 className="px-4 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80">
          {title}
        </h3>
      )}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03]">
        {children}
      </div>
      {footer && (
        <p className="px-4 text-[12px] leading-snug text-muted-foreground/70">{footer}</p>
      )}
    </section>
  );
}

type Tone = "default" | "danger" | "warning";

type IOSListRowProps = {
  label?: ReactNode;
  /** Готовое значение справа (для readonly-row). */
  value?: ReactNode;
  /** Иконка слева. */
  icon?: ReactNode;
  /** Подсказка под label-ом. */
  description?: ReactNode;
  /** Альяс для description (используется в форме байка). */
  hint?: ReactNode;
  /** Кастомный элемент в правой части (приоритет над value/chevron). */
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  /** Если задан — строка ведёт по ссылке (TanStack Link). */
  to?: string;
  tone?: Tone;
  className?: string;
  /** Если children — кастомный контент строки целиком. */
  children?: ReactNode;
  disabled?: boolean;
};

/**
 * Строка списка: иконка + лейбл слева, значение/контент справа.
 * minH 44px (Apple HIG).
 */
export function IOSListRow({
  label,
  value,
  icon,
  description,
  hint,
  trailing,
  chevron = false,
  onClick,
  to,
  tone = "default",
  className,
  children,
  disabled = false,
}: IOSListRowProps) {
  const sub = description ?? hint;
  const interactive = (!!onClick || !!to) && !disabled;

  const rowBody = children ? (
    children
  ) : (
    <>
      {icon && (
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            tone === "danger"
              ? "text-[#ff453a]"
              : tone === "warning"
                ? "text-[#ff9f0a]"
                : "text-muted-foreground",
          )}
        >
          {icon}
        </span>
      )}
      {label !== undefined && (
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-[15px] leading-snug",
              tone === "danger"
                ? "text-[#ff453a]"
                : tone === "warning"
                  ? "text-[#ff9f0a]"
                  : "text-foreground",
            )}
          >
            {label}
          </div>
          {sub !== undefined && sub !== null && sub !== "" && (
            <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground/80">
              {sub}
            </div>
          )}
        </div>
      )}
      {trailing !== undefined ? (
        <div className="flex shrink-0 items-center gap-1.5 text-[15px] text-muted-foreground">
          {trailing}
          {chevron && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
        </div>
      ) : value !== undefined ? (
        <div className="flex min-w-0 shrink items-center gap-1.5 truncate text-right text-[15px] text-muted-foreground">
          <span className="min-w-0 truncate">{value}</span>
          {chevron && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
        </div>
      ) : chevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 opacity-60 text-muted-foreground" />
      ) : null}
    </>
  );

  const baseCls = cn(
    "flex w-full items-center gap-3 px-4 py-2.5 text-left",
    "min-h-[44px] border-b border-white/[0.05] last:border-b-0",
    interactive && "transition-colors active:bg-white/[0.04]",
    disabled && "opacity-50",
    className,
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={baseCls}>
        {rowBody}
      </Link>
    );
  }

  if (interactive) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={baseCls}>
        {rowBody}
      </button>
    );
  }

  return <div className={baseCls}>{rowBody}</div>;
}
