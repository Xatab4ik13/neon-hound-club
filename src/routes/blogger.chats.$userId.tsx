// Диалог блогера с подписчиком (мок). Полностью зеркалит стиль user-side
// VIP-чата (`/club/vip-chat`): plump-бабблы, magenta для собеседника,
// салатовый для меня, dot-grid фон, композер как в комментариях ленты.
// Отличие — слева не Hell, а конкретный подписчик; шапка с ником и назад.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlumpAttach,
  Send,
  X,
  ImageIcon,
  PlumpSticker as Sticker,
  PlumpArrowLeft as ArrowLeft,
} from "@/components/ui/icons";
import { AdaptiveActionSheet } from "@/components/club/AdaptiveActionSheet";
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
import {
  useBloggerChatThread,
  useSendBloggerMessage,
  type ChatServerMessage,
} from "@/lib/blogger-chats-api";

// Локальный формат сообщения (совместим с прежним UI): "me" — блогер (я),
// "them" — подписчик. Сервер отдаёт senderRole: "user" | "blogger".
type ChatMsg = {
  id: string;
  role: "them" | "me";
  text?: string;
  sticker?: string;
  at: number;
};

function adapt(m: ChatServerMessage): ChatMsg {
  return {
    id: m.id,
    role: m.senderRole === "blogger" ? "me" : "them",
    text: m.text ?? undefined,
    sticker: m.sticker ?? undefined,
    at: new Date(m.createdAt).getTime(),
  };
}

export const Route = createFileRoute("/blogger/chats/$userId")({
  head: () => ({
    meta: [
      { title: "Чат — Кабинет блогера" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BloggerChatPage,
});

type Attachment = { url: string; file: File };

const MAX_LEN = 2000;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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

function PeerAvatar({ nick, size = 44 }: { nick: string; size?: number }) {
  const initial = nick.slice(0, 1).toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display font-black uppercase tracking-tight text-black"
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

function BloggerChatPage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();

  const threadQ = useBloggerChatThread(userId);
  const peer = threadQ.data?.peer;
  const messages: ChatMsg[] = useMemo(
    () => (threadQ.data?.messages ?? []).map(adapt),
    [threadQ.data?.messages],
  );
  const sendMsg = useSendBloggerMessage(userId);

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
  const myProfileQ = useMyProfile();
  const myProfile = myProfileQ.data;
  const ownedPacksQ = useMyStickerPacks(!!myProfile);
  const ownedPacks = ownedPacksQ.data ?? [];

  // Анимация — только для сообщений, добавленных в текущей сессии.
  const initialIdsRef = useRef<Set<string> | null>(null);
  if (initialIdsRef.current === null && threadQ.data) {
    initialIdsRef.current = new Set(messages.map((m) => m.id));
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, pending]);

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
    // TODO: аплоад pending.file на S3 → передавать imageUrl.
    sendMsg.mutate({ text: trimmed || undefined });
    setText("");
    setPending(null);
  };

  const pushRecent = (s: string) => {
    setRecent((prev) => {
      const next = [s, ...prev.filter((x) => x !== s)].slice(0, 24);
      saveRecent(next);
      return next;
    });
  };

  const sendSticker = (s: string) => {
    const stickerId = parseSticker(s) ?? s;
    pushRecent(s);
    setPanelOpen(false);
    haptic("light");
    sendMsg.mutate({ sticker: stickerId });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleFile = (f: File) => {
    if (pending) {
      try {
        URL.revokeObjectURL(pending.url);
      } catch {
        /* noop */
      }
    }
    setPending({ url: URL.createObjectURL(f), file: f });
  };

  const groups = useMemo(() => {
    const out: { day: string; items: ChatMsg[] }[] = [];
    for (const m of messages) {
      const day = formatDay(m.at);
      const last = out[out.length - 1];
      if (!last || last.day !== day) out.push({ day, items: [m] });
      else last.items.push(m);
    }
    return out;
  }, [messages]);

  // Высота с учётом локальной шапки (48px). Оставляем такой же расчёт,
  // как в user-side VIP-чате, минус собственный header.
  const headerH = 48;
  const pageHeight =
    keyboardOffset > 0
      ? `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - ${keyboardOffset}px)`
      : `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - 64px - 8px - env(safe-area-inset-bottom))`;

  if (!peer) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">Чат не найден</p>
        <Link
          to="/blogger/chats"
          className="rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
        >
          К списку чатов
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Локальная шапка чата */}
      <div
        className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/70 px-3"
        style={{ height: headerH }}
      >
        <PeerAvatar nick={peer.nick} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[14px] font-black uppercase tracking-tight text-foreground">
            {peer.nick}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            подписчик
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col overflow-hidden" style={{ height: pageHeight }}>
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
                  const showAvatar = !isMine && (!prev || prev.role !== "them");
                  const isNew = !!initialIdsRef.current && !initialIdsRef.current.has(m.id);
                  return (
                    <div
                      key={m.id}
                      className={cn("flex items-end gap-2", isMine ? "justify-end" : "justify-start")}
                    >
                      {!isMine && (
                        <div className={cn("shrink-0", showAvatar ? "opacity-100" : "invisible")}>
                          <PeerAvatar nick={peer.nick} size={44} />
                        </div>
                      )}
                      <div
                        data-vip-message={m.id}
                        className={cn(
                          "flex max-w-[78%] flex-col",
                          isMine ? "items-end" : "items-start",
                          isNew && "vip-message-live",
                          isNew && (isMine ? "vip-message-live--right" : "vip-message-live--left"),
                        )}
                      >
                        <div
                          className={cn(
                            "relative select-text rounded-2xl",
                            isMine ? "rounded-br-md" : "rounded-bl-md",
                            m.sticker && !m.text ? "" : "px-3 py-2",
                          )}
                          style={
                            m.sticker && !m.text
                              ? undefined
                              : { backgroundColor: isMine ? "#B6FF3C" : "#ffffff" }
                          }
                        >
                          {m.sticker && (
                            <div className={cn(m.text ? "mb-2 overflow-hidden rounded-xl" : "")}>
                              <StickerView
                                url={m.sticker}
                                alt="стикер"
                                size={160}
                                className="block h-32 w-32 max-w-[240px] object-contain"
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
                    </div>
                  );
                })}
              </div>
            ))}

            {groups.length === 0 && (
              <div className="mt-16 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Начни переписку с {peer.nick}
              </div>
            )}
          </div>
        </div>

        {/* Композер — идентичен user-side VIP-чату */}
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
                    Фото готово. Добавь подпись и отправь.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        URL.revokeObjectURL(pending.url);
                      } catch {
                        /* noop */
                      }
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
                onChange={(e) => {
                  setText(e.target.value.slice(0, MAX_LEN));
                  if (panelOpen) setPanelOpen(false);
                }}
                onFocus={() => setPanelOpen(false)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={`Написать ${peer.nick}…`}
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

            {trimmed.length === 0 && !pending ? (
              <button
                type="button"
                onClick={() => {
                  haptic("light");
                  setPanelOpen((p) => !p);
                }}
                aria-label="Стикеры"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground active:scale-95"
              >
                <Sticker size={22} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend || overLimit}
                aria-label="Отправить"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#B6FF3C] text-black transition-transform active:scale-95 disabled:opacity-40"
              >
                <Send size={18} strokeWidth={2} className="-translate-x-[1px]" />
              </button>
            )}
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

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="shrink-0 overflow-hidden"
            >
              <StickerPanel
                tab={tab}
                setTab={setTab}
                activePack={activePack}
                setActivePack={setActivePack}
                recent={recent}
                ownedPacks={ownedPacks}
                onPickEmoji={(e) => {
                  setText((v) => (v + e).slice(0, MAX_LEN));
                  textareaRef.current?.focus();
                }}
                onPickSticker={sendSticker}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
