// VIP-чат клуба HELLHOUND — закрытый чат подписчика с Hell (Ваней).
// Пока без бэкенда: моки сообщений + локальный композер.
// Стилистика — iOS-чат + Plump-акценты клуба.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SendIcon, PlumpChat } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { haptic } from "@/hooks/use-haptic";
import vanyaAvatar from "@/assets/vanya-presenter.webp.asset.json";

export const Route = createFileRoute("/club/vip-chat")({
  head: () => ({
    meta: [
      { title: "VIP-чат — HELLHOUND Racing Club" },
      { name: "description", content: "Закрытый чат с Hell для участников клуба." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VipChatPage,
});

type Msg = {
  id: string;
  role: "hell" | "me";
  text: string;
  at: number;
};

const NOW = Date.now();
const MINUTE = 60_000;

const INITIAL_MESSAGES: Msg[] = [
  {
    id: "m1",
    role: "hell",
    text:
      "Йо! Это VIP-чат клуба. Тут я на связи — можно спросить про мото, треки, поездки или просто по хардкору поболтать.",
    at: NOW - 42 * MINUTE,
  },
  {
    id: "m2",
    role: "hell",
    text: "Пиши сразу по делу — отвечаю, как только сажусь за телефон. 🤘",
    at: NOW - 41 * MINUTE,
  },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function VipChatPage() {
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOffset = useKeyboardOffset();

  // авто-скролл вниз при новых сообщениях / typing
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // авто-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "40px";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const canSend = text.trim().length > 0;

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    haptic("light");
    const mine: Msg = {
      id: `me_${Date.now()}`,
      role: "me",
      text: clean,
      at: Date.now(),
    };
    setMessages((prev) => [...prev, mine]);
    setText("");
    // Мок «печатает…» — пока нет бэкенда, показываем индикатор и убираем.
    setTyping(true);
    window.setTimeout(() => setTyping(false), 1800);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const grouped = useMemo(() => messages, [messages]);

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-[calc(100vh-72px)]">
      {/* Шапка чата */}
      <header className="relative shrink-0 border-b border-white/[0.06] bg-background/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="grid h-11 w-11 overflow-hidden rounded-full ring-2 ring-primary/60">
              <img
                src={vanyaAvatar.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </span>
            <span
              aria-hidden
              className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-[#B6FF3C] ring-2 ring-background"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-display text-[17px] font-black italic uppercase tracking-tight text-foreground">
                Hell
              </span>
              <span className="grid h-5 place-items-center rounded-full bg-primary px-2 font-mono text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                VIP
              </span>
            </div>
            <span className="block text-[12px] text-muted-foreground">
              Закрытый чат клуба · в сети
            </span>
          </div>
          <PlumpChat className="h-6 w-6 text-primary/70" />
        </div>
      </header>

      {/* Лента сообщений */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
        style={{ paddingBottom: keyboardOffset ? `${keyboardOffset + 12}px` : undefined }}
      >
        <div className="mx-auto flex max-w-[720px] flex-col gap-2">
          <div className="mb-2 self-center rounded-full bg-white/[0.05] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Начало чата
          </div>

          {grouped.map((m, i) => {
            const prev = grouped[i - 1];
            const showAvatar = m.role === "hell" && (!prev || prev.role !== "hell");
            const isMine = m.role === "me";
            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-end gap-2",
                  isMine ? "justify-end" : "justify-start",
                )}
              >
                {!isMine && (
                  <span
                    className={cn(
                      "h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10",
                      showAvatar ? "opacity-100" : "invisible",
                    )}
                  >
                    <img
                      src={vanyaAvatar.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 520, damping: 32 }}
                  className={cn(
                    "max-w-[84%] rounded-[22px] px-4 py-2.5 text-[16px] leading-[1.35] shadow-sm",
                    isMine
                      ? "rounded-br-[6px] bg-primary text-primary-foreground"
                      : "rounded-bl-[6px] border border-white/[0.06] bg-white/[0.05] text-foreground",
                  )}
                >
                  <span className="whitespace-pre-wrap break-words">{m.text}</span>
                  <span
                    className={cn(
                      "mt-1 block text-right font-mono text-[10px] uppercase tracking-wider",
                      isMine ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {formatTime(m.at)}
                  </span>
                </motion.div>
              </div>
            );
          })}

          <AnimatePresence>
            {typing && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-2"
              >
                <span className="h-7 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  <img src={vanyaAvatar.url} alt="" className="h-full w-full object-cover" />
                </span>
                <div className="flex items-center gap-1 rounded-[22px] rounded-bl-[6px] border border-white/[0.06] bg-white/[0.05] px-4 py-3">
                  <TypingDot delay={0} />
                  <TypingDot delay={0.15} />
                  <TypingDot delay={0.3} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Композер */}
      <div
        className="shrink-0 border-t border-white/[0.06] bg-background/85 px-3 py-2 backdrop-blur-md"
        style={{
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${keyboardOffset ? keyboardOffset + 8 : 8}px)`,
        }}
      >
        <div className="mx-auto flex max-w-[720px] items-end gap-2">
          <div className="flex-1 rounded-[22px] border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 focus-within:border-primary/50">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Написать Hell…"
              rows={1}
              className="block max-h-[140px] min-h-[28px] w-full resize-none bg-transparent text-[16px] leading-[1.35] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            aria-label="Отправить"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all active:scale-90",
              canSend
                ? "bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary))]"
                : "bg-white/[0.06] text-muted-foreground",
            )}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-[720px] px-1 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
          Только для участников клуба · без скринов и пересылок
        </p>
      </div>
    </div>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="block h-2 w-2 rounded-full bg-foreground/60"
      animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 0.9, repeat: Infinity, delay }}
    />
  );
}
