/**
 * Кнопки оплаты с логотипами платёжных систем.
 * Нейтрально-белый фон — чтобы логотипы читались, и юзер сразу понял
 * «это официальная платёжка», а не наша кнопка бренда. Идеально для PWA:
 * крупный тач-таргет (мин. 48px), без узких эффектов, чётко на тёмном фоне.
 *
 * Используется на /club/checkout и /club/hell-pass/$tier.
 */
import { Loader2 } from "lucide-react";
import sbpLogo from "@/assets/sbp-logo.png";

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
  logos,
  className = "",
  size = "md",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  logos: React.ReactNode;
  className?: string;
  size?: Size;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex w-full items-center justify-between gap-3 rounded-xl bg-white text-neutral-900 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-[transform,opacity] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50 ${SIZE[size]} ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2 font-display font-bold uppercase tracking-wider">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-neutral-700" /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">{logos}</span>
    </button>
  );
}

/* ───── Логотипы ───── */

function VisaLogo() {
  return (
    <svg viewBox="0 0 64 22" className="h-4 w-auto" aria-label="Visa">
      <text
        x="0"
        y="18"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="20"
        fontStyle="italic"
        fontWeight="900"
        letterSpacing="-0.5"
        fill="#1A1F71"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 36 22" className="h-5 w-auto" aria-label="Mastercard">
      <circle cx="14" cy="11" r="8.5" fill="#EB001B" />
      <circle cx="22" cy="11" r="8.5" fill="#F79E1B" />
      <path d="M18 4.6a8.5 8.5 0 010 12.8 8.5 8.5 0 010-12.8z" fill="#FF5F00" />
    </svg>
  );
}

function MirLogo() {
  return (
    <svg viewBox="0 0 50 18" className="h-4 w-auto" aria-label="МИР">
      <rect width="50" height="18" rx="3" fill="#0F754E" />
      <text
        x="25"
        y="13.5"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="11"
        fontWeight="900"
        fill="#fff"
        letterSpacing="0.5"
      >
        MIR
      </text>
    </svg>
  );
}

function SbpLogo() {
  return (
    <img src={sbpLogo} alt="СБП" className="h-5 w-auto object-contain" loading="lazy" />
  );
}

/* ───── Публичные компоненты ───── */

export function PayCardButton(props: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: Size;
  className?: string;
}) {
  return (
    <Base
      {...props}
      label={props.label ?? "Оплатить картой"}
      logos={
        <>
          <VisaLogo />
          <MastercardLogo />
          <MirLogo />
        </>
      }
    />
  );
}

export function PaySbpButton(props: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  size?: Size;
  className?: string;
}) {
  return <Base {...props} label={props.label ?? "Оплатить через"} logos={<SbpLogo />} />;
}
