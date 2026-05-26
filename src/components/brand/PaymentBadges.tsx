/**
 * Логотипы платёжных систем (требование банка-эквайера).
 * Используется в футере, на чекауте и на странице «Оплата и доставка».
 */

type Size = "sm" | "md";

const HEIGHT: Record<Size, string> = {
  sm: "h-5",
  md: "h-7",
};

function VisaMark({ size }: { size: Size }) {
  return (
    <svg viewBox="0 0 80 28" className={`${HEIGHT[size]} w-auto`} aria-label="VISA">
      <text
        x="0"
        y="22"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="26"
        fontStyle="italic"
        fontWeight="900"
        fill="currentColor"
        letterSpacing="-1"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark({ size }: { size: Size }) {
  const h = size === "sm" ? "h-6" : "h-9";
  return (
    <svg viewBox="0 0 60 36" className={`${h} w-auto`} aria-label="Mastercard">
      <circle cx="22" cy="18" r="14" fill="#EB001B" />
      <circle cx="38" cy="18" r="14" fill="#F79E1B" />
      <path d="M30 7.5a14 14 0 010 21 14 14 0 010-21z" fill="#FF5F00" />
    </svg>
  );
}

function MirMark({ size }: { size: Size }) {
  return (
    <svg viewBox="0 0 80 28" className={`${HEIGHT[size]} w-auto`} aria-label="МИР">
      <text
        x="0"
        y="22"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="24"
        fontWeight="900"
        fill="currentColor"
      >
        МИР
      </text>
    </svg>
  );
}

export function PaymentBadges({
  size = "md",
  className = "",
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-3 text-foreground/85 ${className}`}
      aria-label="Принимаем к оплате: VISA, Mastercard, МИР"
    >
      <VisaMark size={size} />
      <MastercardMark size={size} />
      <MirMark size={size} />
    </div>
  );
}
