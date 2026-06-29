import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import PhoneInputBase, {
  getCountries,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input/input";
import { getExampleNumber, parsePhoneNumberFromString } from "libphonenumber-js";
import examples from "libphonenumber-js/examples.mobile.json";
import ruLabels from "react-phone-number-input/locale/ru.json";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
  verified?: boolean;
};

/** Эмодзи-флаг по двухбуквенному ISO-коду. */
function flagEmoji(country: string): string {
  if (!country || country.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  const a = "A".charCodeAt(0);
  return String.fromCodePoint(
    A + (country.charCodeAt(0) - a),
    A + (country.charCodeAt(1) - a),
  );
}

/**
 * Поле телефона (E.164) с кастомным селектом страны:
 * флаг-кнопка, выпадающий список с поиском, автоформат и помощь по длине номера для выбранной страны.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, defaultValue, onChange, placeholder, className, required, autoComplete = "tel", verified },
  ref,
) {
  // Определяем стартовую страну: если в value уже есть номер — берём из него, иначе RU.
  const initialCountry = useMemo<Country>(() => {
    const v = value ?? defaultValue ?? "";
    const parsed = v ? parsePhoneNumberFromString(v) : undefined;
    return (parsed?.country as Country) ?? "RU";
  }, [value, defaultValue]);

  const [country, setCountry] = useState<Country>(initialCountry);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalizedValue = useMemo(() => {
    const raw = value ?? defaultValue ?? "";
    if (!raw) return "";
    return parsePhoneNumberFromString(raw)?.number ?? raw;
  }, [value, defaultValue]);

  // Закрытие по клику снаружи + Esc.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    // Фокус в поиск.
    setTimeout(() => searchRef.current?.focus(), 10);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const countries = useMemo(() => {
    const list = getCountries().map((c) => ({
      code: c as Country,
      name: (ruLabels as Record<string, string>)[c] ?? c,
      dial: `+${getCountryCallingCode(c as Country)}`,
    }));
    list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    return list;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [countries, query]);

  // Пример-плейсхолдер в формате выбранной страны — даёт юзеру понять длину.
  const example = useMemo(() => {
    const ex = getExampleNumber(country, examples);
    return ex?.formatInternational() ?? `+${getCountryCallingCode(country)}`;
  }, [country]);

  return (
    <div ref={wrapRef} className={cn("hh-phone-input relative flex items-stretch gap-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        aria-label="Выбор страны"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-2xl leading-none">{flagEmoji(country)}</span>
        <ChevronDown className="size-4 text-white/40" />
      </button>

      <PhoneInputBase
        ref={ref as never}
        country={country}
        international
        withCountryCallingCode
        value={normalizedValue}
        onChange={(v) => onChange?.((v as string) ?? "")}
        placeholder={placeholder ?? example}
        autoComplete={autoComplete}
        required={required}
        className="flex h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white ring-offset-background placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(320px,100%)] overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c10] shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <Search className="size-4 text-white/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск страны"
              className="h-7 w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-white/40">Не найдено</li>
            ) : (
              filtered.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      setCountry(c.code);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/5",
                      c.code === country && "bg-primary/15 text-primary",
                    )}
                  >
                    <span className="text-lg leading-none">{flagEmoji(c.code)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-xs text-white/40">+{getCountryCallingCode(c.code)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
});
