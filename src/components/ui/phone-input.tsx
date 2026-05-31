import { forwardRef } from "react";
import PhoneInputBase from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
};

/**
 * Международное поле телефона (E.164) с флагами и автоформатом по стране.
 * Возвращает значение в формате "+<код страны><цифры>" (например "+79123456789").
 * Дефолтная страна — Россия, но юзер может выбрать любую.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, defaultValue, onChange, placeholder = "+7 999 123-45-67", className, required, autoComplete = "tel" },
  ref,
) {
  return (
    <PhoneInputBase
      ref={ref as never}
      international
      defaultCountry="RU"
      countryCallingCodeEditable={false}
      value={value ?? defaultValue ?? ""}
      onChange={(v) => onChange?.(v ?? "")}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      className={cn("hh-phone-input", className)}
      numberInputProps={{
        className:
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      }}
    />
  );
});
