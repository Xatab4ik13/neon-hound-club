// Админская страница VIP-чата. Показывает список всех тредов «юзер ↔ блогер»
// и позволяет ответить «от лица блогера» (senderRole='blogger', senderId =
// bloggerId треда). Пользователю сообщение приходит неотличимо от ответа Hell.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { PageHeader, Panel, Btn, Badge } from "@/components/admin/ui";
import {
  useAdminVipChatThreads,
  useAdminVipChatThread,
  useAdminSendVipMessage,
  useAdminMarkVipRead,
  type AdminVipChatThreadItem,
  type AdminVipChatMessage,
} from "@/lib/admin-vip-chat-api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";
import { hhToast as toast } from "@/lib/hh-toast";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/admin/vip-chat")({
  component: AdminVipChatPage,
});

function AdminVipChatPage() {
  const threadsQ = useAdminVipChatThreads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = threadsQ.data ?? [];

  // Автовыбор первого треда.
  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].threadId);
  }, [items, selectedId]);

  const selected = useMemo(
    () => items.find((t) => t.threadId === selectedId) ?? null,
    [items, selectedId],
  );

  return (
    <div>
      <PageHeader
        title="VIP-чат"
        description="Все переписки подписчиков с блогерами. Ответы уходят от лица блогера."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        <Panel className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-sm font-semibold">Треды</div>
            <div className="text-xs text-zinc-500">{items.length}</div>
          </div>
          <div className="h-[calc(100%-49px)] overflow-y-auto">
            {threadsQ.isLoading && (
              <div className="p-4 text-sm text-zinc-500">Загружаем…</div>
            )}
            {!threadsQ.isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-zinc-500">Пока нет ни одной переписки.</div>
            )}
            {items.map((t) => (
              <ThreadRow
                key={t.threadId}
                item={t}
                active={t.threadId === selectedId}
                onSelect={() => setSelectedId(t.threadId)}
              />
            ))}
          </div>
        </Panel>

        <Panel className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
          {selected ? (
            <ThreadView key={selected.threadId} item={selected} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Выбери тред слева
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ThreadRow({
  item,
  active,
  onSelect,
}: {
  item: AdminVipChatThreadItem;
  active: boolean;
  onSelect: () => void;
}) {
  const avatar = resolveAssetUrl(item.peerAvatar);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors dark:border-zinc-800",
        active
          ? "bg-zinc-100 dark:bg-zinc-800/60"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
      )}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
            {item.peerNick.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">{item.peerNick}</div>
          <div className="shrink-0 text-[11px] text-zinc-500">{formatTime(item.lastMessageAt)}</div>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <div className="truncate text-xs text-zinc-500">
            {item.lastMessageRole === "blogger" ? "Вы: " : ""}
            {item.lastMessagePreview || "…"}
          </div>
          {item.bloggerUnread > 0 && (
            <Badge tone="rose">{item.bloggerUnread}</Badge>
          )}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-zinc-400">
          → {item.bloggerNick}
        </div>
      </div>
    </button>
  );
}

function ThreadView({ item }: { item: AdminVipChatThreadItem }) {
  const threadQ = useAdminVipChatThread(item.threadId);
  const send = useAdminSendVipMessage(item.threadId);
  const markRead = useAdminMarkVipRead();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const messages = threadQ.data?.messages ?? [];
  const peer = threadQ.data?.peer;
  const blogger = threadQ.data?.blogger;

  // Автоскролл вниз при новых сообщениях.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Помечаем непрочитанное юзером как прочитанное при открытии.
  useEffect(() => {
    if (item.bloggerUnread > 0) {
      markRead.mutate(item.threadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.threadId]);

  async function onSend() {
    const t = text.trim();
    if (!t || send.isPending) return;
    try {
      await send.mutateAsync({ text: t });
      setText("");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Не удалось отправить";
      toast.error(msg);
    }
  }

  function onKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSend();
    }
  }

  const peerAvatar = resolveAssetUrl(peer?.avatarUrl ?? item.peerAvatar);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
          {peerAvatar ? (
            <img src={peerAvatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
              {(peer?.nick ?? item.peerNick).slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{peer?.nick ?? item.peerNick}</div>
          <div className="truncate text-xs text-zinc-500">
            Отвечаешь от лица <span className="font-medium">{blogger?.nick ?? item.bloggerNick}</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 px-4 py-4 dark:bg-zinc-950/40"
      >
        {threadQ.isLoading && (
          <div className="text-center text-sm text-zinc-500">Загружаем…</div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {messages.length === 0 && !threadQ.isLoading && (
          <div className="text-center text-sm text-zinc-500">Пока пусто</div>
        )}
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={2}
            placeholder="Ответ от лица блогера… (⌘/Ctrl + Enter)"
            className="min-h-[40px] flex-1 resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
          />
          <Btn variant="primary" onClick={onSend} disabled={!text.trim() || send.isPending}>
            {send.isPending ? "Отправка…" : "Отправить"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: AdminVipChatMessage }) {
  const isBlogger = m.senderRole === "blogger";
  return (
    <div className={cn("flex", isBlogger ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
          isBlogger
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100",
        )}
      >
        {m.text && <div>{m.text}</div>}
        {m.sticker && <div className="text-2xl">🎨 {m.sticker}</div>}
        {m.imageUrl && (
          <img
            src={resolveAssetUrl(m.imageUrl) ?? m.imageUrl}
            alt=""
            className="mt-1 max-h-48 rounded-lg object-cover"
          />
        )}
        <div
          className={cn(
            "mt-1 text-[10px]",
            isBlogger ? "text-white/60 dark:text-zinc-900/60" : "text-zinc-400",
          )}
        >
          {formatTime(m.createdAt)}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}
