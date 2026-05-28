// iOS-style сгруппированный список: секция с заголовком + строки с разделителями.
// Используется в формах/настройках для тёмного "grouped inset" вида.

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
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

/**
 * Строка списка: ярлык слева, контент справа. Контент может быть текстом
 * (readonly-row, который открывает picker по тапу) или интерактивным элементом
 * (inline-input). minH 44px — Apple HIG.
 */
export function IOSListRow({
  label,
  value,
  hint,
  trailing,
  chevron = false,
  onClick,
  destructive = false,
  className,
  children,
  disabled = false,
}: {
  label?: ReactNode;
  /** Готовое значение справа (для readonly-row). */
  value?: ReactNode;
  /** Подсказка под label-ом. */
  hint?: ReactNode;
  /** Кастомный элемент в правой части (приоритет над value/chevron). */
  trailing?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  className?: string;
  /** Если children — рендерим вместо двухколоночной разметки. */
  children?: ReactNode;
  disabled?: boolean;
}) {
  const interactive = !!onClick && !disabled;
  const Comp: "button" | "div" = interactive ? "button" : "div";

  if (children) {
    return (
      <div
        className={cn(
          "min-h-[44px] px-4 py-2.5",
          "border-b border-white/[0.05] last:border-b-0",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <Comp
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left",
        "min-h-[44px] border-b border-white/[0.05] last:border-b-0",
        interactive && "transition-colors active:bg-white/[0.04]",
        disabled && "opacity-50",
        className,
      )}
    >
      {label !== undefined && (
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-[15px] leading-snug",
              destructive ? "text-[#ff453a]" : "text-foreground",
            )}
          >
            {label}
          </div>
          {hint && (
            <div className="mt-0.5 text-[12px] leading-snug text-muted-foreground/80">
              {hint}
            </div>
          )}
        </div>
      )}
      {trailing !== undefined ? (
        <div className="flex shrink-0 items-center gap-1.5 text-[15px] text-muted-foreground">
          {trailing}
        </div>
      ) : value !== undefined ? (
        <div className="flex min-w-0 shrink items-center gap-1.5 truncate text-right text-[15px] text-muted-foreground">
          <span className="min-w-0 truncate">{value}</span>
          {chevron && <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
        </div>
      ) : chevron ? (
        <ChevronRight className="h-4 w-4 shrink-0 opacity-60 text-muted-foreground" />
      ) : null}
    </Comp>
  );
}
