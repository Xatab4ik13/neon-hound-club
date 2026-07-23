// VIP ЧАТ клуба HELLHOUND — персональный чат подписчика с блогером Hell.
// Дизайн — «Plump Racing Chat»: жирные plump-бабблы с 3px чёрной обводкой
// и hard-shadow, magenta (Hell) + салатовый (мой), закреплённый композер
// над таб-баром без скролла.

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
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import vanyaAvatar from "@/assets/vanya-presenter.webp.asset.json";

export const Route = createFileRoute("/club/vip-chat")({
  head: () => ({
    meta: [
      { title: "VIP ЧАТ — HELLHOUND Racing Club" },
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
    text: "Йо. Это персональный VIP-канал — тут только ты и я. Пиши по делу.",
    at: NOW - 42 * MINUTE,
  },
  {
    id: "m2",
    role: "me",
    text: "Го! Что нового по гаражу?",
    at: NOW - 40 * MINUTE,
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
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "СЕГОДНЯ";
  if (same(d, yst)) return "ВЧЕРА";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" }).toUpperCase();
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
  const keyboardOffset = useKeyboardOffset();

  // Автоскролл вниз при появлении сообщений/аттача.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, pending]);

  // Автовысота textarea.
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
    setMessages((prev) => [
      ...prev,
      {
        id: `me_${Date.now()}`,
        role: "me",
        text: trimmed || undefined,
        image: pending?.url,
        at: Date.now(),
      },
    ]);
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

  // Высота = viewport - MobileTopBar (3.25rem + safe-area-top) - TabBar (64px + safe + 8px).
  // Клавиатура — сжимаем на её высоту. Композер и заголовок в обычном flow — иначе
  // MobileTransition (transform) ломает position:fixed.
  const pageHeight =
    keyboardOffset > 0
      ? `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${keyboardOffset}px)`
      : "calc(100dvh - 3.25rem - env(safe-area-inset-top) - 64px - 8px - env(safe-area-inset-bottom))";

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]"
      style={{ height: pageHeight }}
    >
      {/* Локальная шапка чата: HELL (VANYA) + VIP + online */}
      <header className="relative z-30 shrink-0 border-b-4 border-white bg-[#111] px-4 py-2 shadow-[0_4px_0_0_#F000C0]">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#F000C0]">
              <img
                src={vanyaAvatar.url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <motion.span
              aria-hidden
              animate={{ scale: [1, 1.25, 1], opacity: [1, 0.75, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-black bg-[#B6FF3C]"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[14px] font-black italic uppercase leading-tight tracking-tight text-white">
              HELL (VANYA)
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="rounded border border-white bg-[#F000C0] px-1.5 py-[1px] font-mono text-[10px] font-black italic uppercase text-black">
                VIP ЧАТ
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#B6FF3C]">
                В сети
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Лента сообщений */}
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
        style={{
          backgroundImage: "radial-gradient(#1a1a1a 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          paddingBottom: 16,
        }}
      >
        <div className="mx-auto flex max-w-[640px] flex-col gap-6">
          {groups.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="h-[2px] flex-1 bg-white/10" />
                <span className="rounded border-2 border-white bg-black px-2 py-0.5 font-display text-[10px] font-black italic uppercase tracking-widest text-white shadow-[2px_2px_0_0_#F000C0]">
                  {g.day}
                </span>
                <span className="h-[2px] flex-1 bg-white/10" />
              </div>

              {g.items.map((m, mi) => {
                const isMine = m.role === "me";
                const prev = mi > 0 ? g.items[mi - 1] : null;
                const showAvatar = !isMine && (!prev || prev.role !== "hell");
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.96, rotate: isMine ? 1 : -1 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 480, damping: 28 }}
                    className={cn("flex items-start gap-3", isMine ? "justify-end" : "justify-start")}
                  >
                    {!isMine && (
                      <div
                        className={cn(
                          "mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-[#F000C0] bg-zinc-800 shadow-[2px_2px_0_0_#F000C0]",
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
                      </div>
                    )}

                    <div className={cn("relative max-w-[75%]", isMine ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "border-[3px] border-black",
                          m.image && !m.text
                            ? "rounded-2xl p-1.5"
                            : "rounded-2xl px-3 py-2.5",
                          isMine
                            ? "rounded-tr-none bg-[#B6FF3C] shadow-[-4px_4px_0_0_#000]"
                            : "rounded-tl-none bg-white shadow-[4px_4px_0_0_#F000C0]",
                        )}
                      >
                        {m.image && (
                          <div
                            className={cn(
                              "overflow-hidden rounded-xl border-2 border-black",
                              m.text ? "mb-2" : "",
                            )}
                          >
                            <img
                              src={m.image}
                              alt=""
                              className="block max-h-[220px] w-full max-w-[240px] object-cover"
                            />
                          </div>
                        )}
                        {m.text && (
                          <p
                            className={cn(
                              "whitespace-pre-wrap break-words text-[14px] font-black italic uppercase leading-snug text-black",
                              m.image ? "px-1.5" : "",
                            )}
                          >
                            {m.text}
                          </p>
                        )}
                      </div>
                      <div
                        className={cn(
                          "mt-1 flex items-center gap-1 px-0.5",
                          isMine ? "justify-end" : "justify-start",
                        )}
                      >
                        <span className="font-mono text-[10px] font-bold text-zinc-500">
                          {formatTime(m.at)}
                        </span>
                        {isMine && (
                          <span className="font-mono text-[10px] font-black text-[#F000C0]">
                            ✓✓
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Композер — plump-стиль, всегда виден над таб-баром */}
      <div className="shrink-0 border-t-4 border-white bg-[#111] shadow-[0_-4px_0_0_#B6FF3C]">
        <AnimatePresence>
          {pending && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 border-b-2 border-white/10 bg-black/50 px-3 py-2">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-black bg-black/40 shadow-[3px_3px_0_0_#F000C0]">
                  <img src={pending.url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Фото готово. Добавь подпись — и отправляй.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try { URL.revokeObjectURL(pending.url); } catch { /* noop */ }
                    setPending(null);
                  }}
                  aria-label="Убрать фото"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-white bg-black text-white"
                >
                  <X size={12} />
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
          className="flex items-end gap-3 px-3 py-3"
        >
          <button
            type="button"
            onClick={() => {
              haptic("light");
              setAttachOpen(true);
            }}
            aria-label="Прикрепить"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-white text-[#F000C0] shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <PlumpAttach className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-end rounded-xl border-[3px] border-black bg-zinc-800 pl-3 pr-2 py-1 focus-within:border-[#F000C0]">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="НАПИСАТЬ HELL…"
              className="min-w-0 flex-1 resize-none bg-transparent py-1.5 pr-1 font-black italic uppercase text-[14px] leading-[22px] tracking-tight text-white placeholder:text-zinc-500 outline-none"
              style={{ maxHeight: 5 * 22 + 12 }}
            />
            {text.length >= 1600 && (
              <span
                className={cn(
                  "mb-1.5 shrink-0 self-end font-mono text-[10px] tabular-nums",
                  overLimit ? "text-destructive" : "text-zinc-500",
                )}
                aria-live="polite"
              >
                {MAX_LEN - text.length}
              </span>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={!canSend || overLimit}
            whileTap={{ scale: 0.9 }}
            aria-label="Отправить"
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-black transition-all",
              canSend && !overLimit
                ? "bg-[#F000C0] text-white shadow-[3px_3px_0_0_#B6FF3C] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                : "bg-zinc-700 text-white/40 shadow-[3px_3px_0_0_#000]",
            )}
          >
            <Send size={18} strokeWidth={2.5} className="-translate-x-[1px]" />
          </motion.button>
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
