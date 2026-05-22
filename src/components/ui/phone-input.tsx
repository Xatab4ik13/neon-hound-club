import { useState, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { formatRuPhone } from "@/lib/phone";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (formatted: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
};

/**
 * Поле телефона с автоформатом «+7 (XXX) XXX-XX-XX».
 * Работает и контролируемо (через value/onChange), и неконтролируемо
 * (через defaultValue) — для форм-заглушек без state.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, defaultValue, onChange, placeholder = "+7 (___) ___-__-__", className, required, autoComplete = "tel" },
  ref,
) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => formatRuPhone(defaultValue ?? ""));
  const shown = isControlled ? (value ?? "") : internal;

  return (
    <Input
      ref={ref}
      type="tel"
      inputMode="tel"
      autoComplete={autoComplete}
      placeholder={placeholder}
      className={className}
      required={required}
      value={shown}
      onChange={(e) => {
        const next = formatRuPhone(e.target.value);
        if (!isControlled) setInternal(next);
        onChange?.(next);
      }}
    />
  );
});
