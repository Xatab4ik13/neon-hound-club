import { forwardRef, useMemo, useState } from "react";
import PhoneInputBase, {
  getCountries,
  getCountryCallingCode,
  type Country,
} from "react-phone-number-input/input";
import ruLabels from "react-phone-number-input/locale/ru.json";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  autoComplete?: string;
};

/** Эмодзи-флаг из двухбуквенного ISO-кода страны. */
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
 * Международное поле телефона (E.164) с кастомным селектом страны:
 * флаг + поиск + код страны. Тёмная тема, скруглённые формы.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(function PhoneInput(
  { value, defaultValue, onChange, placeholder, className, required, autoComplete = "tel" },
  ref,
) {
  const [country, setCountry] = useState<Country>("RU");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  const dial = `+${getCountryCallingCode(country)}`;

  return (
    <div className={cn("hh-phone-input flex items-stretch gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label="Выбор страны"
          >
            <span className="text-xl leading-none">{flagEmoji(country)}</span>
            <span className="font-mono text-white/70">{dial}</span>
            <ChevronDown className="size-4 text-white/40" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[280px] rounded-2xl border-white/10 bg-[#0c0c10] p-0 text-white shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <Search className="size-4 text-white/40" />
            <input
              autoFocus
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
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-white/5",
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
        </PopoverContent>
      </Popover>

      <PhoneInputBase
        ref={ref as never}
        country={country}
        international
        withCountryCallingCode
        value={value ?? defaultValue ?? ""}
        onChange={(v) => onChange?.((v as string) ?? "")}
        placeholder={placeholder ?? `${dial} 999 123-45-67`}
        autoComplete={autoComplete}
        required={required}
        className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-base text-white ring-offset-background placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
});
