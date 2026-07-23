// VIP Чат клуба HELLHOUND — персональный чат подписчика с Hell.
// Композер сделан по образцу комментов в /club (лента): круглая
// «скрепка» слева, textarea в pill'е по центру, круглая «отправка» справа.
// Заголовок — только текст "VIP Чат", без аватарки/иконок.

import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlumpAttach, Send, X, ImageIcon } from "@/components/ui/icons";
import { AdaptiveActionSheet } from "@/components/club/AdaptiveActionSheet";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

export const Route = createFileRoute("/club/vip-chat")({
  head: () => ({
    meta: [
      { title: "VIP Чат — HELLHOUND Racing Club" },
      { name: "description", content: "Персональный чат с Hell для участников клуба." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VipChatPage,
});

type Attachment = { url: string; file: File };

type Msg = {
  id: string;
  role: "hell" | "me";
  text?: string;
  image?: string;
  at: number;
};

const NOW = Date.now();
const MINUTE = 60_000;
const MAX_LEN = 2000;

const INITIAL_MESSAGES: Msg[] = [
  {
    id: "m1",
    role: "hell",
    text: "Йо. Это персональный чат — тут только ты и я. Пиши по делу.",
    at: NOW - 42 * MINUTE,
  },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yst = new Date();
  yst.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Сегодня";
  if (sameDay(d, yst)) return "Вчера";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" });
}

function VipChatPage() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Attachment | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Автоскролл к последнему сообщению.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, pending]);

  // Автоподбор высоты textarea.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 5 * 22 + 12)}px`;
  }, [text]);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 || !!pending;
  const overLimit = text.length > MAX_LEN;

  const send = () => {
    if (!canSend || overLimit) return;
    haptic("light");
    const mine: Msg = {
      id: `me_${Date.now()}`,
      role: "me",
      text: trimmed || undefined,
      image: pending?.url,
      at: Date.now(),
    };
    setMessages((prev) => [...prev, mine]);
    setText("");
    setPending(null);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFile = (f: File) => {
    if (pending) {
      try { URL.revokeObjectURL(pending.url); } catch { /* noop */ }
    }
    setPending({ url: URL.createObjectURL(f), file: f });
  };

  // Собираем сообщения в группы: по дню + подряд одним автором.
  const groups = useMemo(() => {
    const out: { day: string; items: Msg[] }[] = [];
    for (const m of messages) {
      const day = formatDay(m.at);
      const last = out[out.length - 1];
      if (!last || last.day !== day) out.push({ day, items: [m] });
      else last.items.push(m);
    }
    return out;
  }, [messages]);

  return (
    <div className="relative">
      {/* Заголовок: только текст, без иконок */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/85 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center justify-center gap-2">
          <span className="grid h-5 place-items-center rounded-md bg-primary px-1.5 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-primary-foreground">
            VIP
          </span>
          <span className="font-display text-[18px] font-black uppercase tracking-tight text-foreground">
            Чат
          </span>
        </div>
      </div>

      {/* Лента */}
      <div
        ref={scrollerRef}
        className="px-3 pt-4"
        style={{
          // высота: экран минус top-bar (~52px) минус наш заголовок (~44px)
          // минус табБар (~64px+safe) минус композер (~72px+safe)
          minHeight:
            "calc(100dvh - 52px - 44px - 64px - env(safe-area-inset-bottom) - 88px)",
          paddingBottom: "16px",
        }}
      >
        <div className="mx-auto flex max-w-[720px] flex-col gap-2">
          {groups.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-1.5">
              <div className="my-2 self-center rounded-full bg-white/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {g.day}
              </div>
              {g.items.map((m) => {
                const isMine = m.role === "me";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 32 }}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[86%] overflow-hidden text-[15.5px] leading-[1.35] shadow-sm",
                        m.image && !m.text ? "p-0" : "px-3.5 py-2",
                        isMine
                          ? "rounded-[22px] rounded-br-[6px] bg-primary text-primary-foreground"
                          : "rounded-[22px] rounded-bl-[6px] border border-white/[0.06] bg-white/[0.05] text-foreground",
                      )}
                    >
                      {m.image && (
                        <img
                          src={m.image}
                          alt=""
                          className={cn(
                            "block w-full max-w-[280px] object-cover",
                            m.text ? "mb-1.5 rounded-xl" : "",
                          )}
                        />
                      )}
                      {(m.text || !m.image) && (
                        <div className={cn(m.image && !m.text ? "px-3.5 py-2" : "")}>
                          {m.text && (
                            <span className="whitespace-pre-wrap break-words">
                              {m.text}
                            </span>
                          )}
                          <span
                            className={cn(
                              "mt-1 block text-right font-mono text-[10px] uppercase tracking-wider",
                              isMine
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground",
                            )}
                          >
                            {formatTime(m.at)}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Композер — фиксирован над таб-баром */}
      <div
        className="fixed inset-x-0 z-20 border-t border-white/[0.06] bg-background/95 backdrop-blur-md"
        style={{
          bottom: "calc(64px + env(safe-area-inset-bottom))",
        }}
      >
        <AnimatePresence>
          {pending && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
                  <img
                    src={pending.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                  Фото готово. Добавь подпись (опционально) и отправь.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { URL.revokeObjectURL(pending.url); } catch { /* noop */ }
                    setPending(null);
                  }}
                  aria-label="Убрать фото"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 px-3 py-2.5"
        >
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setAttachOpen(true);
            }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            aria-label="Прикрепить"
          >
            <PlumpAttach className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-3 pr-1 py-1 focus-within:border-primary/40">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Написать Hell…"
              className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[15px] leading-[22px] text-foreground placeholder:text-muted-foreground/60 outline-none"
              style={{ maxHeight: 5 * 22 + 12 }}
            />
            {text.length >= 1600 && (
              <span
                className={cn(
                  "mb-1.5 shrink-0 self-end font-mono text-[10px] tabular-nums",
                  overLimit ? "text-destructive" : "text-muted-foreground/60",
                )}
                aria-live="polite"
              >
                {MAX_LEN - text.length}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSend || overLimit}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Отправить"
          >
            <Send size={18} strokeWidth={2} className="-translate-x-[1px]" />
          </button>
        </form>
      </div>

      <AdaptiveActionSheet
        open={attachOpen}
        onOpenChange={setAttachOpen}
        title="Прикрепить к сообщению"
        description="JPG, PNG или WebP, до 10 МБ"
        items={[
          {
            key: "photo",
            label: "Фото из галереи",
            icon: <ImageIcon size={20} strokeWidth={1.7} />,
            onSelect: () => {
              setAttachOpen(false);
              fileInputRef.current?.click();
            },
          },
          {
            key: "camera",
            label: "Сделать снимок",
            icon: <PlumpAttach className="h-5 w-5" />,
            onSelect: () => {
              setAttachOpen(false);
              cameraInputRef.current?.click();
            },
          },
        ]}
      />
    </div>
  );
}
