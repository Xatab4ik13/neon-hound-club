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
import { PlumpAttach, Send, X, ImageIcon, PlumpSticker as Sticker } from "@/components/ui/icons";
import { AdaptiveActionSheet } from "@/components/club/AdaptiveActionSheet";
import { HellhoundAvatar } from "@/components/club/HellhoundPlaque";
import { StickerView } from "@/components/club/StickerView";
import {
  StickerPanel,
  loadRecent,
  saveRecent,
  STICKER_PACKS,
  parseSticker,
  type StickerTab,
} from "@/components/club/StickerPanel";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import { useMyProfile } from "@/lib/garage-api";
import { useMyStickerPacks } from "@/lib/stickers-api";

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
  sticker?: string;
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [tab, setTab] = useState<StickerTab>("stickers");
  const [activePack, setActivePack] = useState<string>(STICKER_PACKS[0].id);
  const [recent, setRecent] = useState<string[]>(() => loadRecent());

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
      {/* Лента сообщений — без локальной шапки, фон уходит под MobileTopBar */}
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
              <div className="flex justify-center">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {g.day}
                </span>
              </div>

              {g.items.map((m, mi) => {
                const isMine = m.role === "me";
                const prev = mi > 0 ? g.items[mi - 1] : null;
                const showAvatar = !isMine && (!prev || prev.role !== "hell");
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 480, damping: 28 }}
                    className={cn("flex items-end gap-2", isMine ? "justify-end" : "justify-start")}
                  >
                    {!isMine && (
                      <div className={cn("shrink-0", showAvatar ? "opacity-100" : "invisible")}>
                        <HellhoundAvatar size={44} initials="H" />
                      </div>
                    )}
                    <div className={cn("flex max-w-[78%] flex-col", isMine ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "relative select-text rounded-2xl",
                          isMine ? "rounded-br-md" : "rounded-bl-md",
                          m.image && !m.text ? "p-1" : "px-3 py-2",
                        )}
                        style={{ backgroundColor: isMine ? "#B6FF3C" : "#ffffff" }}
                      >
                        {m.image && (
                          <div className={cn("overflow-hidden rounded-xl", m.text ? "mb-2" : "")}>
                            <img
                              src={m.image}
                              alt=""
                              className="block max-h-[220px] w-full max-w-[240px] object-cover"
                            />
                          </div>
                        )}
                        {m.text && (
                          <p className="whitespace-pre-wrap break-words font-display text-[14px] font-bold leading-snug tracking-tight text-black">
                            {m.text}
                          </p>
                        )}
                      </div>
                      <span className="mt-1 px-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                        {formatTime(m.at)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>


      {/* Композер — идентичен стилю комментариев в ленте */}
      <div className="shrink-0 border-t border-white/[0.06] bg-black/40">
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
                  <img src={pending.url} alt="" className="h-full w-full object-cover" />
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
            aria-label="Прикрепить"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95"
          >
            <PlumpAttach className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-3 pr-1 py-1 focus-within:border-[#B6FF3C]/60 focus-within:shadow-[0_0_0_3px_rgba(182,255,60,0.10)]">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Написать Hell…"
              className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-[22px] text-foreground placeholder:text-muted-foreground/60 outline-none"
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
            aria-label="Отправить"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#B6FF3C] text-black transition-transform active:scale-95 disabled:opacity-40"
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
