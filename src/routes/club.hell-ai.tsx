// Hell AI — AI-механик клуба HELLHOUND.
// Минималистичный центрированный композер в духе референса: бэкграунд с
// мягкими «лава-блобами» в фирменных primary-тонах, glass-карточка ввода,
// command-палитра по «/», переключатель активного байка (контекст ответа).

import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bike as BikeIcon,
  Check,
  Command as CommandIcon,
  Gauge,
  LoaderIcon,
  SendIcon,
  Sparkles,
  Wrench,
  Zap,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api";
import { loadBikes, saveBikes, type StoredBike } from "@/data/bike-storage";

export const Route = createFileRoute("/club/hell-ai")({
  head: () => ({
    meta: [
      { title: "Hell AI — AI-механик клуба HELLHOUND" },
      {
        name: "description",
        content:
          "AI-механик: моменты затяжки, давление, масла, типичные болячки модели. По делу, под твой мото.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HellAiPage,
});

// ── Тариф / квоты ─────────────────────────────────────────────────────────
type PassTier = "guest" | "silver" | "gold" | "platinum";
const CURRENT_TIER: PassTier = "gold";
const QUOTA_BY_TIER: Record<PassTier, number | "∞"> = {
  guest: 0,
  silver: 20,
  gold: 100,
  platinum: "∞",
};
const TIER_LABEL: Record<PassTier, string> = {
  guest: "Без Hell Pass",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

// ── Команды ──────────────────────────────────────────────────────────────
type Cmd = { icon: React.ReactNode; label: string; description: string; prefix: string };
const COMMANDS: Cmd[] = [
  { icon: <Wrench className="h-4 w-4" />, label: "Затяжка", description: "моменты затяжки узлов", prefix: "/torque" },
  { icon: <Gauge className="h-4 w-4" />, label: "Давление", description: "давление в шинах", prefix: "/pressure" },
  { icon: <Sparkles className="h-4 w-4" />, label: "Масло", description: "тип и интервал замены", prefix: "/oil" },
  { icon: <Lightbulb className="h-4 w-4" />, label: "Болячки", description: "типичные проблемы модели", prefix: "/issues" },
  { icon: <Zap className="h-4 w-4" />, label: "Диагностика", description: "стук, шум, симптом", prefix: "/diag" },
];

// ── Авто-resize textarea ─────────────────────────────────────────────────
function useAutoResize(minHeight: number, maxHeight: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const adjust = useCallback(
    (reset?: boolean) => {
      const el = ref.current;
      if (!el) return;
      if (reset) {
        el.style.height = `${minHeight}px`;
        return;
      }
      el.style.height = `${minHeight}px`;
      el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, maxHeight))}px`;
    },
    [minHeight, maxHeight],
  );
  useEffect(() => {
    if (ref.current) ref.current.style.height = `${minHeight}px`;
  }, [minHeight]);
  return { ref, adjust };
}

function bikeLabel(b: StoredBike) {
  return `${b.brand} ${b.model}${b.year ? ` ${b.year}` : ""}`;
}

// Реальный вызов бэкенда. Бэк сам подставит контекст байка (по primary или bikeId)
// и проверит лимит по тиру Hell Pass.
async function askHellAi(question: string, bikeId?: string): Promise<string> {
  const res = await apiFetch<{ answer: string }>("/hell-ai/ask", {
    method: "POST",
    body: JSON.stringify({ question, bikeId }),
  });
  return res.answer;
}


function HellAiPage() {
  // байки
  const [bikes, setBikes] = useState<StoredBike[]>([]);
  const [activeBikeId, setActiveBikeId] = useState<string>("");
  useEffect(() => {
    const list = loadBikes();
    setBikes(list);
    setActiveBikeId(list[0]?.id ?? "");
  }, []);
  const activeBike = bikes.find((b) => b.id === activeBikeId);
  const bikeStr = activeBike ? bikeLabel(activeBike) : "твой мото";

  // композер
  const [value, setValue] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [activeCmd, setActiveCmd] = useState(-1);
  const [isThinking, setIsThinking] = useState(false);
  const [, startTransition] = useTransition();
  const [used, setUsed] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<{ q: string; a: string } | null>(null);
  const { ref: taRef, adjust } = useAutoResize(60, 200);
  const cmdRef = useRef<HTMLDivElement>(null);

  const quota = QUOTA_BY_TIER[CURRENT_TIER];
  const isUnlimited = quota === "∞";
  const isGuest = CURRENT_TIER === "guest";
  const left = isUnlimited ? Infinity : (quota as number) - used;
  const canAsk = !isGuest && (isUnlimited || left > 0) && !!activeBike;

  // мышь — для подсветки за курсором
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  // команды по слешу
  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCmd(true);
      const i = COMMANDS.findIndex((c) => c.prefix.startsWith(value));
      setActiveCmd(i);
    } else {
      setShowCmd(false);
    }
  }, [value]);

  // клик вне палитры
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      const btn = document.querySelector("[data-cmd-btn]");
      if (cmdRef.current && !cmdRef.current.contains(t) && !btn?.contains(t)) {
        setShowCmd(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function pickCommand(i: number) {
    const c = COMMANDS[i];
    if (!c) return;
    setValue(c.prefix + " ");
    setShowCmd(false);
    taRef.current?.focus();
  }

  function send() {
    const text = value.trim();
    if (!text || !canAsk || isThinking) return;
    startTransition(() => {
      setIsThinking(true);
      setUsed((n) => n + 1);
      const q = text;
      setValue("");
      adjust(true);
      setTimeout(() => {
        setLastAnswer({ q, a: mockAnswer(q, bikeStr) });
        setIsThinking(false);
      }, 1400);
    });
  }

  function onKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (showCmd) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveCmd((p) => (p < COMMANDS.length - 1 ? p + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveCmd((p) => (p > 0 ? p - 1 : COMMANDS.length - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (activeCmd >= 0) pickCommand(activeCmd);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCmd(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full items-center justify-center overflow-hidden px-4 py-10">
      {/* фоновые блобы в фирменном цвете */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-primary/15 blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-[128px] [animation-delay:700ms]" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 animate-pulse rounded-full bg-primary/[0.08] blur-[96px] [animation-delay:1000ms]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <motion.div
          className="space-y-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* заголовок */}
          <div className="space-y-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="inline-block"
            >
              <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                hell ai · online
              </div>
              <h1 className="bg-gradient-to-r from-foreground to-foreground/40 bg-clip-text pb-1 font-display text-3xl font-medium tracking-tight text-transparent md:text-4xl">
                Чем помочь по твоему мото?
              </h1>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "100%", opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </motion.div>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Введи «/» для команд или просто задай вопрос
            </motion.p>
          </div>

          {/* переключатель байка */}
          <BikeSwitcher
            bikes={bikes}
            activeId={activeBikeId}
            onPick={(id) => {
              setActiveBikeId(id);
              // переставим активный байк в начало и сохраним
              const next = [...bikes].sort((a, b) =>
                a.id === id ? -1 : b.id === id ? 1 : 0,
              );
              setBikes(next);
              saveBikes(next);
            }}
          />

          {/* последний ответ */}
          <AnimatePresence mode="wait">
            {lastAnswer && (
              <motion.div
                key={lastAnswer.q}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-2xl"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  ты спросил
                </div>
                <div className="text-sm text-foreground/80">{lastAnswer.q}</div>
                <div className="h-px bg-white/[0.05]" />
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                  hell ai
                </div>
                <div className="text-[15px] leading-relaxed text-foreground">
                  {lastAnswer.a}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* композер */}
          <motion.div
            className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-2xl backdrop-blur-2xl"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <AnimatePresence>
              {showCmd && (
                <motion.div
                  ref={cmdRef}
                  className="absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-lg border border-white/10 bg-background/95 shadow-lg backdrop-blur-xl"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="py-1">
                    {COMMANDS.map((c, i) => (
                      <motion.div
                        key={c.prefix}
                        onClick={() => pickCommand(i)}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors",
                          activeCmd === i
                            ? "bg-primary/15 text-foreground"
                            : "text-foreground/70 hover:bg-white/5",
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                          {c.icon}
                        </span>
                        <span className="font-medium">{c.label}</span>
                        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                          {c.prefix}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4">
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjust();
                }}
                onKeyDown={onKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={!canAsk}
                placeholder={
                  isGuest
                    ? "Hell AI доступен с Hell Pass"
                    : !activeBike
                      ? "добавь байк в гараж"
                      : !canAsk
                        ? "лимит на месяц исчерпан"
                        : `спроси про ${bikeStr}…`
                }
                className="min-h-[60px] w-full resize-none border-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:cursor-not-allowed"
                style={{ overflow: "hidden" }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/[0.05] p-3">
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  data-cmd-btn
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCmd((s) => !s);
                  }}
                  whileTap={{ scale: 0.94 }}
                  className={cn(
                    "rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
                    showCmd && "bg-white/10 text-foreground",
                  )}
                  aria-label="команды"
                >
                  <CommandIcon className="h-4 w-4" />
                </motion.button>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {TIER_LABEL[CURRENT_TIER]} ·{" "}
                  <span className="tabular-nums text-foreground/80">
                    {isUnlimited ? "∞" : `${used}/${quota}`}
                  </span>
                </span>
              </div>

              <motion.button
                type="button"
                onClick={send}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isThinking || !value.trim() || !canAsk}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  value.trim() && canAsk
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-white/[0.05] text-muted-foreground",
                )}
              >
                {isThinking ? (
                  <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
                <span>Send</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* thinking pill */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            className="fixed bottom-8 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 shadow-lg backdrop-blur-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-8 items-center justify-center rounded-full bg-primary/15">
                <span className="font-mono text-[10px] font-bold uppercase text-primary">
                  hell
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <span>думаю</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* подсветка за курсором при фокусе */}
      {focused && (
        <motion.div
          className="pointer-events-none fixed z-0 h-[40rem] w-[40rem] rounded-full bg-primary opacity-[0.04] blur-[96px]"
          animate={{ x: mouse.x - 320, y: mouse.y - 320 }}
          transition={{ type: "spring", damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}
    </div>
  );
}

// ── переключатель байка ──────────────────────────────────────────────────
function BikeSwitcher({
  bikes,
  activeId,
  onPick,
}: {
  bikes: StoredBike[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = bikes.find((b) => b.id === activeId);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (bikes.length === 0) {
    return (
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-xl">
        <BikeIcon className="h-3.5 w-3.5" />
        В гараже пусто — добавь байк в профиле
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-auto w-fit">
      <button
        onClick={() => setOpen((s) => !s)}
        className="group flex items-center gap-2.5 rounded-full border border-white/[0.06] bg-white/[0.02] py-1.5 pl-2 pr-3.5 text-xs text-foreground/80 backdrop-blur-xl transition-colors hover:border-primary/30 hover:bg-white/[0.04]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
          <BikeIcon className="h-3.5 w-3.5" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          контекст:
        </span>
        <span className="font-medium">{active ? bikeLabel(active) : "—"}</span>
        <span className="text-muted-foreground/60 transition-transform group-hover:translate-y-0.5">
          ▾
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="py-1">
              {bikes.map((b) => {
                const isActive = b.id === activeId;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      onPick(b.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground/80 hover:bg-white/5",
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-primary">
                      <BikeIcon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 truncate">
                      <span className="block truncate text-[13px] font-medium">
                        {bikeLabel(b)}
                      </span>
                      {b.mileage && (
                        <span className="block truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {b.mileage}
                        </span>
                      )}
                    </span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="ml-1 flex items-center">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="mx-0.5 h-1.5 w-1.5 rounded-full bg-primary"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
