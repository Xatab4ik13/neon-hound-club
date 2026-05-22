// iOS-style grouped list rows.
// Использование:
//   <IOSListSection title="Аккаунт" footer="...">
//     <IOSListRow icon={<Settings/>} label="Профиль" onClick={...} chevron />
//     <IOSListRow label="Выйти" tone="danger" />
//   </IOSListSection>

import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Children, type ReactNode } from "react";
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
    <section className={cn("mb-5", className)}>
      {title && (
        <h3 className="mb-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h3>
      )}
      <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
        {Children.map(children, (c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      {footer && (
        <div className="mt-1.5 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {footer}
        </div>
      )}
    </section>
  );
}

type RowProps = {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  /** Правая колонка — текст, бейдж и т.д. */
  value?: ReactNode;
  chevron?: boolean;
  to?: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger" | "accent";
  disabled?: boolean;
  /** Поставить компонент справа во всю строку (например Switch) вместо value. */
  trailing?: ReactNode;
};

export function IOSListRow({
  icon,
  label,
  description,
  value,
  chevron,
  to,
  href,
  onClick,
  tone = "default",
  disabled,
  trailing,
}: RowProps) {
  const danger = tone === "danger";
  const accent = tone === "accent";

  const inner = (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5 transition-colors",
        !disabled && (onClick || to || href) && "active:bg-white/[0.05]",
        disabled && "opacity-50",
      )}
    >
      {icon && (
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
            danger
              ? "bg-red-500/10 text-red-400"
              : accent
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[15px] font-semibold",
            danger ? "text-red-400" : "text-foreground",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {description}
          </span>
        )}
      </span>
      {trailing ? (
        <span className="shrink-0">{trailing}</span>
      ) : value !== undefined ? (
        <span className="shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground">
          {value}
        </span>
      ) : null}
      {chevron && (
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      )}
    </div>
  );

  if (disabled) return <div>{inner}</div>;
  if (to) {
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className="block">
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left">
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
}
