import { useRef } from "react";
import { Loader2 } from "lucide-react";

type Size = "md" | "lg";

const SIZE: Record<Size, string> = {
  md: "h-12 px-4 text-[13px]",
  lg: "h-14 px-5 text-sm",
};

function Base({
  onClick,
  disabled,
  loading,
  label,
  className = "",
  size = "md",
  type = "button",
  name,
  value,
}: {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  className?: string;
  size?: Size;
  type?: "button" | "submit";
  name?: string;
  value?: string;
}) {
  const lastTapRef = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 500) {
      e.preventDefault();
      return;
    }
    lastTapRef.current = now;
    onClick?.(e);
  };

  return (
    <button
      type={type}
      name={name}
      value={value}
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-primary font-display text-sm font-black uppercase italic tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)] transition-[transform,opacity,box-shadow] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${SIZE[size]} ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}

/* ───── Публичные компоненты ───── */

type PublicProps = {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: Size;
  className?: string;
  type?: "button" | "submit";
  name?: string;
  value?: string;
};

export function PayButton(props: PublicProps) {
  return <Base {...props} label={props.label ?? "Оплатить"} />;
}

export const PayCardButton = PayButton;
export const PaySbpButton = PayButton;


