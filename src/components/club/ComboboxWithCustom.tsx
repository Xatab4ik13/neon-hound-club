import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string, custom: boolean) => void;
  options: string[];
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  isCustom?: boolean;
  emptyHint?: string;
};

/**
 * Комбобокс с поиском и опцией «добавить своё».
 * Если юзер вводит текст которого нет в списке — снизу появляется пункт
 * «➕ Добавить: <текст>». При выборе — custom=true.
 */
export function ComboboxWithCustom({
  value,
  onChange,
  options,
  loading,
  placeholder = "Выбрать...",
  disabled,
  isCustom,
  emptyHint = "Ничего не найдено",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState<number>();

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const normalizedQuery = query.trim();
  const queryMatchesOption = useMemo(
    () =>
      normalizedQuery.length > 0 &&
      options.some((o) => o.toLowerCase() === normalizedQuery.toLowerCase()),
    [normalizedQuery, options],
  );
  const showCustomOption = normalizedQuery.length > 0 && !queryMatchesOption;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center justify-between border border-white/[0.08] bg-black/30 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            <span className="truncate">{value || placeholder}</span>
            {isCustom && value && (
              <span className="shrink-0 border border-primary/40 px-1 font-mono text-[8px] uppercase tracking-[0.2em] text-primary">
                custom
              </span>
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[60] p-0"
        align="start"
        style={triggerWidth ? { width: triggerWidth } : undefined}
      >
        <Command shouldFilter>
          <CommandInput
            placeholder={loading ? "Загрузка..." : "Поиск..."}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!loading && options.length === 0 && !showCustomOption && (
              <CommandEmpty>{emptyHint}</CommandEmpty>
            )}
            {options.length > 0 && (
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt, false);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.toLowerCase() === opt.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCustomOption && (
              <CommandGroup heading="Своё значение">
                <CommandItem
                  value={`__custom__${normalizedQuery}`}
                  onSelect={() => {
                    onChange(normalizedQuery, true);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить: «{normalizedQuery}»
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
