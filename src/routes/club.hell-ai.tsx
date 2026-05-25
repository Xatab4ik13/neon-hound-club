// Hell AI — AI-механик клуба HELLHOUND.
// Десктоп: центрированный композер на лава-фоне.
// Мобайл (iOS-стиль): экран-чат — история сообщений + липкий композер над таб-баром,
// переключатель байка и команды открываются bottom-sheet'ом (vaul).

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Drawer } from "vaul";
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
  ChevronDown,
  Plus,
  History as HistoryIcon,
  MessageSquarePlus,
  Trash2,
  ArrowRight,
  Square,
  Search as SearchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api";
import { type StoredBike } from "@/data/bike-storage";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewer } from "@/hooks/use-viewer";
import { useBikes, type ServerBike } from "@/lib/garage-api";
import { haptic } from "@/hooks/use-haptic";
import { Swipeable } from "@/components/club/Swipeable";
import { HellAiBubble } from "@/components/club/HellAiBubble";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";

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
type PassTier = "guest" | "silver" | "gold" | "platinum" | "staff";
type HellAiStatus = {
  tier: "silver" | "gold" | "platinum" | "staff" | null;
  limit: number;
  used: number;
  left: number;
  unlimited: boolean;
  expiresAt: string | null;
};

const TIER_LABEL: Record<PassTier, string> = {
  guest: "Без Hell Pass",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  staff: "STAFF",
};

function toStoredBike(b: ServerBike): StoredBike {
  return {
    id: b.id,
    brand: b.brand,
    model: b.model,
    year: b.year ?? new Date().getFullYear(),
    color: b.color ?? undefined,
    nickname: b.nickname ?? undefined,
    mileage: b.mileage ?? undefined,
    purchaseDate: b.purchaseDate ?? undefined,
    mods: b.mods.length > 0 ? b.mods : undefined,
    photo: b.photos[0] ?? undefined,
  };
}

function useHellAiRuntime() {
  const viewer = useViewer();
  const bikesQ = useBikes(viewer.isAuthed);
  const statusQ = useQuery({
    queryKey: ["hell-ai", "status", viewer.user?.id ?? "guest"],
    queryFn: () => apiFetch<HellAiStatus>("/api/v1/hell-ai/status"),
    enabled: viewer.isAuthed,
    staleTime: 10_000,
    retry: false,
  });

  const bikes = useMemo(() => (bikesQ.data ?? []).map(toStoredBike), [bikesQ.data]);
  const [activeBikeId, setActiveBikeId] = useState("");

  useEffect(() => {
    if (bikes.length === 0) {
      setActiveBikeId("");
      return;
    }
    setActiveBikeId((current) => (bikes.some((b) => b.id === current) ? current : bikes[0]!.id));
  }, [bikes]);

  const activeBike = bikes.find((b) => b.id === activeBikeId);
  const isStaff = viewer.user?.role === "admin" || viewer.user?.role === "blogger";
  const tier: PassTier = statusQ.data?.tier ?? (isStaff ? "staff" : viewer.isAuthed ? "guest" : "guest");
  const used = statusQ.data?.used ?? 0;
  const isUnlimited = statusQ.data?.unlimited ?? isStaff;
  const quota: number | "∞" = !viewer.isAuthed || tier === "guest"
    ? 0
    : isUnlimited
      ? "∞"
      : Math.max(0, statusQ.data?.limit ?? 0);
  const left = isUnlimited ? Infinity : Math.max(0, statusQ.data?.left ?? 0);
  const isGuest = !viewer.isAuthed || tier === "guest";
  const bikeStr = activeBike ? bikeLabel(activeBike) : isStaff ? "своего мото" : "твой мото";
  const canAsk =
    viewer.isAuthed &&
    (!statusQ.isPending || isStaff) &&
    (isStaff || (!isGuest && (isUnlimited || left > 0) && !!activeBike));

  return {
    bikes,
    activeBike,
    activeBikeId,
    setActiveBikeId,
    bikeStr,
    canAsk,
    isGuest,
    isStaff,
    isUnlimited,
    quota,
    used,
    tierLabel: TIER_LABEL[tier],
    refreshStatus: () => statusQ.refetch(),
  };
}


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

async function askHellAi(
  question: string,
  bikeId?: string,
  chatId?: string,
  signal?: AbortSignal,
): Promise<string> {
  const res = await apiFetch<{ answer: string }>("/api/v1/hell-ai/ask", {
    method: "POST",
    body: JSON.stringify({ question, bikeId, chatId }),
    signal,
  });
  return res.answer;
}

function errorToMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Войди в аккаунт, чтобы пользоваться Hell AI.";
    if (err.status === 403) return "Hell AI доступен с Hell Pass. Активируй любой тир.";
    if (err.status === 429) return err.message || "Лимит вопросов на этот месяц исчерпан.";
    return err.message || "Hell AI временно недоступен.";
  }
  return "Не удалось связаться с Hell AI. Попробуй ещё раз.";
}

// ─────────────────────────────────────────────────────────────────────────
export function HellAiPage() {
  const isMobile = useIsMobile();
  return isMobile ? <HellAiMobile /> : <HellAiDesktop />;
}

// ═══════════════════════════════════════════════════════════════════════
// MOBILE — iOS-стиль чата + история обращений
// ═══════════════════════════════════════════════════════════════════════

type Msg = { id: string; q: string; a?: string; error?: boolean };
type Chat = {
  id: string;
  title: string;
  bikeId?: string;
  messages: Msg[];
  createdAt: number;
  updatedAt: number;
};

const CHATS_KEY = "hh:hellai:chats:v1";
const ACTIVE_KEY = "hh:hellai:active:v1";

function loadChats(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveChats(chats: Chat[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    /* ignore */
  }
}
function loadActiveId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_KEY) ?? "";
}
function saveActiveId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

function newChat(bikeId?: string): Chat {
  const now = Date.now();
  return {
    id: `c_${now}_${Math.random().toString(36).slice(2, 7)}`,
    title: "Новый чат",
    bikeId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} дн`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });
}

function HellAiMobile() {
  const {
    bikes,
    activeBike,
    activeBikeId,
    setActiveBikeId,
    bikeStr,
    canAsk: runtimeCanAsk,
    isGuest,
    isStaff,
    isUnlimited,
    quota,
    used: serverUsed,
    tierLabel,
    refreshStatus,
  } = useHellAiRuntime();

  // история чатов
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>("");
  const hydrated = useRef(false);

  useEffect(() => {
    const list = loadChats();
    const aid = loadActiveId();
    if (list.length === 0) {
      const c = newChat();
      setChats([c]);
      setActiveChatId(c.id);
    } else {
      setChats(list);
      setActiveChatId(list.find((c) => c.id === aid)?.id ?? list[0].id);
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) saveChats(chats);
  }, [chats]);
  useEffect(() => {
    if (hydrated.current && activeChatId) saveActiveId(activeChatId);
  }, [activeChatId]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages ?? [];

  const [value, setValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [usedDelta, setUsedDelta] = useState(0);
  const [bikeSheetOpen, setBikeSheetOpen] = useState(false);
  const [cmdSheetOpen, setCmdSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { ref: taRef, adjust } = useAutoResize(40, 140);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const keyboardOffset = useKeyboardOffset();

  const used = serverUsed + usedDelta;
  const left = isUnlimited ? Infinity : Math.max(0, (quota as number) - used);
  const canAsk = runtimeCanAsk && (isUnlimited || left > 0 || isStaff);

  useEffect(() => {
    setUsedDelta(0);
  }, [serverUsed]);

  // умный авто-скролл вниз: только если юзер уже у низа (в пределах 140px)
  const stickToBottomRef = useRef(true);
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 140;
  }
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, isThinking, activeChatId]);

  function updateChat(id: string, updater: (c: Chat) => Chat) {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  }

  function makeId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function performAsk(text: string, msgId: string, chatId: string) {
    setIsThinking(true);
    setUsedDelta((n) => n + 1);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    askHellAi(text, activeBike?.id, chatId, ctrl.signal)
      .then((a) => {
        updateChat(chatId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === msgId ? { ...m, a, error: false } : m)),
          updatedAt: Date.now(),
        }));
        refreshStatus();
        haptic("selection");
      })
      .catch((err: unknown) => {
        const aborted =
          (err instanceof DOMException && err.name === "AbortError") ||
          (typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError");
        if (aborted) {
          // отменили — убираем pending-сообщение из чата целиком
          updateChat(chatId, (c) => ({
            ...c,
            messages: c.messages.filter((m) => m.id !== msgId),
            updatedAt: Date.now(),
          }));
          setUsedDelta((n) => Math.max(0, n - 1));
          haptic("light");
          return;
        }
        updateChat(chatId, (c) => ({
          ...c,
          messages: c.messages.map((m) =>
            m.id === msgId ? { ...m, a: errorToMessage(err), error: true } : m,
          ),
          updatedAt: Date.now(),
        }));
        setUsedDelta((n) => Math.max(0, n - 1));
        refreshStatus();
        haptic("warning");
      })
      .finally(() => {
        if (abortRef.current === ctrl) abortRef.current = null;
        setIsThinking(false);
      });
  }

  function stopGeneration() {
    abortRef.current?.abort();
  }
    const text = value.trim();
    if (!text || !canAsk || isThinking || !activeChatId) return;
    const id = makeId();
    const chatId = activeChatId;
    haptic("light");
    stickToBottomRef.current = true;
    updateChat(chatId, (c) => ({
      ...c,
      messages: [...c.messages, { id, q: text }],
      title: c.messages.length === 0 ? text.slice(0, 60) : c.title,
      bikeId: c.bikeId ?? activeBike?.id,
      updatedAt: Date.now(),
    }));
    setValue("");
    adjust(true);
    performAsk(text, id, chatId);
  }

  function regenerate(msgId: string) {
    if (!activeChatId || isThinking) return;
    const chat = chats.find((c) => c.id === activeChatId);
    const msg = chat?.messages.find((m) => m.id === msgId);
    if (!msg) return;
    haptic("light");
    updateChat(activeChatId, (c) => ({
      ...c,
      messages: c.messages.map((m) => (m.id === msgId ? { ...m, a: undefined, error: false } : m)),
    }));
    performAsk(msg.q, msgId, activeChatId);
  }

  function onKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function pickCommand(c: Cmd) {
    setValue(c.prefix + " ");
    setCmdSheetOpen(false);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      adjust();
    });
  }

  function startNewChat() {
    // если активный пуст — переиспользуем
    if (activeChat && activeChat.messages.length === 0) {
      setHistoryOpen(false);
      requestAnimationFrame(() => taRef.current?.focus());
      return;
    }
    const c = newChat(activeBike?.id);
    setChats((prev) => [c, ...prev]);
    setActiveChatId(c.id);
    setHistoryOpen(false);
    setValue("");
    adjust(true);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  function pickChat(id: string) {
    setActiveChatId(id);
    setHistoryOpen(false);
  }

  function deleteChat(id: string) {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (id === activeChatId) {
        if (next.length === 0) {
          const c = newChat(activeBike?.id);
          setActiveChatId(c.id);
          return [c];
        }
        setActiveChatId(next[0].id);
      }
      return next;
    });
  }

  // высота композера ≈ 56 + textarea, плюс таб-бар 52 + safe-area
  const composerOffset = "calc(64px + env(safe-area-inset-bottom))";

  return (
    <div className="relative flex min-h-[calc(100vh-3.25rem)] flex-col">
      {/* без фоновых glow — чистый iOS */}

      {/* верхняя панель: история + контекст + новый чат */}
      <div className="sticky top-14 z-20 -mt-px border-b border-white/[0.05] bg-background/80 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.06] bg-white/[0.03] text-foreground/80 active:scale-95 active:opacity-80"
            aria-label="История"
          >
            <HistoryIcon className="h-[18px] w-[18px]" />
          </button>

          <button
            type="button"
            onClick={() => setBikeSheetOpen(true)}
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] py-1.5 pl-2 pr-3 text-[13px] text-foreground/85 active:scale-[0.98] active:opacity-80"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
              <BikeIcon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-left font-medium">
              {activeBike ? bikeLabel(activeBike) : "выбрать байк"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={startNewChat}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.06] bg-white/[0.03] text-foreground/80 active:scale-95 active:opacity-80"
            aria-label="Новый чат"
          >
            <MessageSquarePlus className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* лента сообщений */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 pb-4 pt-4"
        style={{ paddingBottom: `calc(${composerOffset} + 110px)` }}
      >
        {messages.length === 0 ? (
          <EmptyChat
            bikeStr={bikeStr}
            onPick={pickCommand}
            disabled={!canAsk}
            isGuest={isGuest}
          />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <li key={m.id} className="space-y-2">
                  <HellAiBubble role="user" content={m.q} />
                  {m.a !== undefined && (
                    <HellAiBubble
                      role="assistant"
                      content={m.a}
                      error={m.error}
                      onRegenerate={() => regenerate(m.id)}
                    />
                  )}
                </li>
              ))}
            </AnimatePresence>

            {isThinking && (
              <li>
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-[22px] rounded-bl-[6px] border border-white/[0.06] bg-white/[0.05] px-4 py-3 shadow-sm">
                    <TypingDots />
                  </div>
                </motion.div>
              </li>
            )}
          </ul>
        )}
      </div>


      {/* липкий композер / CTA для гостя */}
      {isGuest ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-background/90 backdrop-blur-xl"
          style={{ bottom: composerOffset }}
        >
          <div className="px-4 pb-3 pt-3">
            <Link
              to="/club/hell-pass"
              onClick={() => haptic("light")}
              className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-primary-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)] active:scale-[0.98] transition-transform"
            >
              <span className="flex items-center gap-3">
                <Sparkles className="h-5 w-5" />
                <span className="text-[17px] font-semibold">Активировать Hell Pass</span>
              </span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="mt-2 px-1 text-center text-[13px] text-muted-foreground">
              AI-механик по твоему мото · 20/100/∞ вопросов на 30 дней
            </p>
          </div>
        </div>
      ) : (
        <div
          className="fixed inset-x-0 z-30 border-t border-white/[0.06] bg-background/85 backdrop-blur-xl"
          style={{ bottom: composerOffset }}
        >
          {/* квота */}
          <div className="flex items-center justify-between px-4 pb-1.5 pt-2">
            <span className="text-[12px] text-muted-foreground">
              {tierLabel} ·{" "}
              <span className="tabular-nums text-foreground/80">
                {isUnlimited ? "∞" : `${used} / ${quota}`}
              </span>
            </span>
            {!canAsk && (
              <span className="text-[12px] text-red-400/80">
                {!activeBike && !isStaff ? "добавь байк" : "лимит"}
              </span>
            )}
          </div>

          <div className="flex items-end gap-2 px-3 pb-2">
            <button
              type="button"
              onClick={() => {
                haptic("selection");
                setCmdSheetOpen(true);
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground active:scale-95"
              aria-label="команды"
            >
              <Plus className="h-[20px] w-[20px]" />
            </button>

            <div className="flex min-w-0 flex-1 items-end rounded-[22px] border border-white/[0.08] bg-white/[0.03]">
              <textarea
                ref={taRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjust();
                }}
                onKeyDown={onKey}
                disabled={!canAsk}
                rows={1}
                placeholder={
                  !activeBike && !isStaff
                    ? "добавь байк в гараж"
                    : !canAsk
                      ? "лимит на месяц исчерпан"
                      : `спроси про ${bikeStr}…`
                }
                className="min-h-[44px] w-full resize-none border-none bg-transparent px-3.5 py-2.5 text-[17px] leading-snug text-foreground placeholder:text-muted-foreground/45 focus:outline-none disabled:cursor-not-allowed"
                style={{ overflow: "hidden" }}
              />
            </div>

            <motion.button
              type="button"
              onClick={send}
              whileTap={{ scale: 0.9 }}
              disabled={isThinking || !value.trim() || !canAsk}
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors",
                value.trim() && canAsk
                  ? "bg-primary text-primary-foreground shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                  : "bg-white/[0.06] text-muted-foreground",
              )}
              aria-label="Отправить"
            >
              {isThinking ? (
                <LoaderIcon className="h-[20px] w-[20px] animate-spin" />
              ) : (
                <SendIcon className="h-[18px] w-[18px]" />
              )}
            </motion.button>
          </div>
        </div>
      )}


      {/* sheet: выбор байка */}
      <BikeSheet
        open={bikeSheetOpen}
        onOpenChange={setBikeSheetOpen}
        bikes={bikes}
        activeId={activeBikeId}
        emptyText={
          isStaff
            ? "Можно спрашивать и без байка — для точности лучше выбрать модель прямо в вопросе."
            : "В гараже пусто — добавь байк в профиле."
        }
        onPick={(id) => {
          setActiveBikeId(id);
          setBikeSheetOpen(false);
        }}
      />

      {/* sheet: команды */}
      <CommandSheet open={cmdSheetOpen} onOpenChange={setCmdSheetOpen} onPick={pickCommand} />

      {/* sheet: история */}
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        chats={chats}
        activeId={activeChatId}
        onPick={pickChat}
        onDelete={deleteChat}
        onNew={startNewChat}
      />
    </div>
  );
}

function HistorySheet({
  open,
  onOpenChange,
  chats,
  activeId,
  onPick,
  onDelete,
  onNew,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  chats: Chat[];
  activeId: string;
  onPick: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Drawer.Title className="sr-only">История чатов</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <h2 className="font-display text-xl font-black italic uppercase tracking-tight">
              История
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
            >
              Готово
            </button>
          </div>

          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={onNew}
              className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-left text-primary active:scale-[0.98]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15">
                <MessageSquarePlus className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[15px] font-semibold">Новый чат</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {sorted.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
                Истории пока нет.
              </div>
            ) : (
              <>
                <div className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  обращения · {sorted.length}
                </div>
                <ul className="space-y-2">
                  {sorted.map((c) => {
                    const active = c.id === activeId;
                    const count = c.messages.length;
                    const preview =
                      c.messages.length === 0
                        ? "Пустой чат"
                        : c.title;
                    return (
                      <li key={c.id}>
                        <Swipeable
                          radius={16}
                          left={{
                            icon: <Trash2 className="h-5 w-5" />,
                            label: "Удалить",
                            bg: "linear-gradient(90deg, rgba(239,68,68,0.18), rgba(239,68,68,0.32))",
                            fg: "rgb(252,165,165)",
                            onAction: () => onDelete(c.id),
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onPick(c.id)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left active:scale-[0.99] active:bg-white/[0.05]",
                              active
                                ? "border-primary/30 bg-primary/[0.06]"
                                : "border-white/[0.06] bg-card/40",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                                active
                                  ? "bg-primary/15 text-primary"
                                  : "bg-white/[0.05] text-muted-foreground",
                              )}
                            >
                              <Sparkles className="h-[20px] w-[20px]" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-foreground">
                                  {preview}
                                </span>
                                {active && (
                                  <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
                                    активный
                                  </span>
                                )}
                              </span>
                              <span className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                                <span>{formatRelative(c.updatedAt)}</span>
                                <span className="opacity-50">·</span>
                                <span className="tabular-nums">
                                  {count} {count === 1 ? "сообщ." : "сообщ."}
                                </span>
                              </span>
                            </span>
                          </button>
                        </Swipeable>
                      </li>
                    );
                  })}
                </ul>

              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}


function EmptyChat({
  bikeStr,
  onPick,
  disabled,
  isGuest,
}: {
  bikeStr: string;
  onPick: (c: Cmd) => void;
  disabled: boolean;
  isGuest: boolean;
}) {
  const items = COMMANDS.slice(0, 4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="px-1 pt-4"
    >
      {/* Large iOS title */}
      <header className="px-2 pb-7">
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-foreground">
          Hell AI
        </h1>
        <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
          {isGuest
            ? "AI-механик по твоему мото — моменты затяжки, давление, масла, болячки."
            : <>Спрашивай про {bikeStr}: затяжка, давление, масло, болячки.</>}
        </p>
      </header>

      {/* iOS-style grouped suggestions list */}
      <section>
        <h2 className="mb-2 px-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Примеры
        </h2>
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          {items.map((c, i) => (
            <li key={c.prefix}>
              <button
                type="button"
                onClick={() => {
                  haptic("selection");
                  onPick(c);
                }}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-white/[0.05] disabled:opacity-50",
                  i < items.length - 1 && "border-b border-white/[0.05]",
                )}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-foreground/70">
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">
                  {c.label}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </motion.div>
  );
}


function BikeSheet({
  open,
  onOpenChange,
  bikes,
  activeId,
  emptyText,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bikes: StoredBike[];
  activeId: string;
  emptyText?: string;
  onPick: (id: string) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Drawer.Title className="sr-only">Выбор байка</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <h2 className="font-display text-xl font-black italic uppercase tracking-tight">Байк</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
            >
              Готово
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {bikes.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
                {emptyText ?? "В гараже пусто — добавь байк в профиле."}
              </div>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
                {bikes.map((b) => {
                  const active = b.id === activeId;
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => onPick(b.id)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <BikeIcon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-foreground">
                            {bikeLabel(b)}
                          </span>
                          {b.mileage && (
                            <span className="mt-0.5 block truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                              {b.mileage}
                            </span>
                          )}
                        </span>
                        {active && <Check className="h-5 w-5 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function CommandSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (c: Cmd) => void;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <Drawer.Title className="sr-only">Команды Hell AI</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex items-center justify-between px-5 pb-3 pt-3">
            <h2 className="font-display text-xl font-black italic uppercase tracking-tight">
              Команды
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[12px] font-bold uppercase tracking-wider text-primary active:opacity-60"
            >
              Закрыть
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
              {COMMANDS.map((c) => (
                <li key={c.prefix}>
                  <button
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-white/[0.04]"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-foreground">
                        {c.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                        {c.description}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {c.prefix}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DESKTOP — оригинальный композер на лава-фоне
// ═══════════════════════════════════════════════════════════════════════

function HellAiDesktop() {
  const {
    bikes,
    activeBike,
    activeBikeId,
    setActiveBikeId,
    bikeStr,
    canAsk: runtimeCanAsk,
    isGuest,
    isStaff,
    isUnlimited,
    quota,
    used: serverUsed,
    tierLabel,
    refreshStatus,
  } = useHellAiRuntime();

  const [value, setValue] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [activeCmd, setActiveCmd] = useState(-1);
  const [isThinking, setIsThinking] = useState(false);
  const [usedDelta, setUsedDelta] = useState(0);
  const [lastAnswer, setLastAnswer] = useState<{ q: string; a: string } | null>(null);
  const { ref: taRef, adjust } = useAutoResize(60, 200);
  const cmdRef = useRef<HTMLDivElement>(null);

  const used = serverUsed + usedDelta;
  const left = isUnlimited ? Infinity : Math.max(0, (quota as number) - used);
  const canAsk = runtimeCanAsk && (isUnlimited || left > 0 || isStaff);

  useEffect(() => {
    setUsedDelta(0);
  }, [serverUsed]);

  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const h = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCmd(true);
      const i = COMMANDS.findIndex((c) => c.prefix.startsWith(value));
      setActiveCmd(i);
    } else {
      setShowCmd(false);
    }
  }, [value]);

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
    const q = text;
    setValue("");
    adjust(true);
    setIsThinking(true);
    setUsedDelta((n) => n + 1);
    askHellAi(q, activeBike?.id)
      .then((a) => {
        setLastAnswer({ q, a });
        refreshStatus();
      })
      .catch((err: unknown) => {
        setLastAnswer({ q, a: errorToMessage(err) });
        setUsedDelta((n) => Math.max(0, n - 1));
        refreshStatus();
      })
      .finally(() => setIsThinking(false));
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

          <BikeSwitcher
            bikes={bikes}
            activeId={activeBikeId}
            emptyText={
              isStaff
                ? "У блогера может не быть байка в профиле — просто укажи модель в вопросе."
                : "В гараже пусто — добавь байк в профиле"
            }
            onPick={(id) => {
              setActiveBikeId(id);
            }}
          />

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
                    : !activeBike && !isStaff
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
                  {tierLabel} ·{" "}
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
                <span className="font-mono text-[10px] font-bold uppercase text-primary">hell</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <span>думаю</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

function BikeSwitcher({
  bikes,
  activeId,
  emptyText,
  onPick,
}: {
  bikes: StoredBike[];
  activeId: string;
  emptyText?: string;
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

  // нужно, чтобы useMemo не выбивал линтер из-за bikes ссылочного типа
  const sorted = useMemo(() => bikes, [bikes]);

  if (sorted.length === 0) {
    return (
      <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-xl">
        <BikeIcon className="h-3.5 w-3.5" />
        {emptyText ?? "В гараже пусто — добавь байк в профиле"}
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
              {sorted.map((b) => {
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
                      <span className="block truncate text-[13px] font-medium">{bikeLabel(b)}</span>
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
    <div className="flex items-center">
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
