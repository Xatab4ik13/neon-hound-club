import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search, X } from "@/components/ui/icons";
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
import { useIsMobile } from "@/hooks/use-mobile";


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
 * - Desktop: Popover + cmdk
 * - Mobile: нативный IOSSheet-пикер (потому что cmdk внутри Vaul Drawer
 *   ловит focus/pointer-конфликты и не даёт нормально тапать/вводить).
 */
export function ComboboxWithCustom(props: Props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobilePicker {...props} />;
  return <DesktopCombobox {...props} />;
}

function Trigger({
  value,
  isCustom,
  placeholder,
  disabled,
  onClick,
  triggerRef,
  open,
}: {
  value: string;
  isCustom?: boolean;
  placeholder: string;
  disabled?: boolean;
  onClick?: () => void;
  triggerRef?: React.Ref<HTMLButtonElement>;
  open?: boolean;
}) {
  return (
    <button
      ref={triggerRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "flex h-11 w-full items-center justify-between border border-white/[0.08] bg-black/30 px-3 text-left text-base text-foreground transition-colors hover:border-white/20 focus:border-primary/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
  );
}

function DesktopCombobox({
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
        <Trigger
          triggerRef={triggerRef}
          value={value}
          isCustom={isCustom}
          placeholder={placeholder}
          disabled={disabled}
          open={open}
        />
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

function MobilePicker({
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const normalizedQuery = query.trim();
  const lowerQuery = normalizedQuery.toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) return options;
    return options.filter((o) => o.toLowerCase().includes(lowerQuery));
  }, [options, normalizedQuery, lowerQuery]);
  const queryMatchesOption =
    normalizedQuery.length > 0 &&
    options.some((o) => o.toLowerCase() === lowerQuery);
  const showCustomOption = normalizedQuery.length > 0 && !queryMatchesOption;

  // Не блокируем body — vaul уже держит свой scroll-lock,
  // двойная блокировка приводит к фризу скролла после закрытия пикера.

  return (
    <>
      <Trigger
        value={value}
        isCustom={isCustom}
        placeholder={placeholder}
        disabled={disabled}
        onClick={() => !disabled && setOpen(true)}
        open={open}
      />
      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[300] flex animate-fade-in flex-col bg-[#0d0d0d]"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
              touchAction: "manipulation",
            }}
            role="dialog"
            aria-modal="true"
            // Гасим события в bubble-фазе — таргет (input/кнопки) уже получил их,
            // а до vaul Drawer выше они не дойдут. Capture-фаза здесь ломала
            // фокус инпута (stopPropagation не давал событию долететь до таргета).
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Шапка */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-ml-2 flex h-11 items-center px-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground active:opacity-60"
              >
                Отмена
              </button>
              <h2 className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">
                {placeholder}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-2 flex h-11 items-center px-2 font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
              >
                Готово
              </button>
            </div>



            {/* Поиск */}
            <div className="shrink-0 border-b border-white/[0.06] bg-[#0d0d0d] px-4 py-3">
              <div className="flex h-11 items-center gap-2 border border-white/[0.08] bg-black/30 px-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={loading ? "Загрузка..." : "Поиск или ввести своё..."}
                  className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="shrink-0 text-muted-foreground active:opacity-60"
                    aria-label="Очистить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Список */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
              {showCustomOption && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(normalizedQuery, true);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 border-b border-white/[0.04] px-3 py-3.5 text-left text-primary active:bg-primary/[0.06]"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-[15px]">
                    Добавить: «{normalizedQuery}»
                  </span>
                </button>
              )}

              {filtered.length === 0 && !showCustomOption && (
                <p className="px-4 py-8 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {loading ? "Загрузка..." : emptyHint}
                </p>
              )}

              {filtered.map((opt) => {
                const active = value.toLowerCase() === opt.toLowerCase();
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt, false);
                      setOpen(false);
                    }}
                    className="flex min-h-[44px] w-full items-center gap-3 border-b border-white/[0.04] px-3 py-3 text-left active:bg-white/[0.04]"
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1 truncate text-[15px] text-foreground">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

