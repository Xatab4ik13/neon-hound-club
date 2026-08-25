// Админская страница чатов Школы: все переписки «ученик ↔ инструктор».
// Только чтение — отвечать за инструктора нельзя, это его работа.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Panel, Badge } from "@/components/admin/ui";
import {
  useAdminSchoolChats,
  useAdminSchoolChat,
  type AdminSchoolChatItem,
} from "@/lib/admin-school-chats-api";
import { resolveAssetUrl } from "@/lib/asset-url";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/school-chats")({
  component: AdminSchoolChatsPage,
});

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

const ORDER_STATUS_RU: Record<string, string> = {
  invoiced: "выставлен",
  pending: "ждёт оплаты",
  paid: "оплачен",
  cancelled: "отменён",
};

function AdminSchoolChatsPage() {
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const chatsQ = useAdminSchoolChats(instructorId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = chatsQ.data ?? [];

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0]!.chatId);
  }, [items, selectedId]);

  // Фильтр по инструкторам собираем из самих чатов — отдельный запрос не нужен.
  const instructors = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of items) map.set(c.instructorId, c.instructorName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [items]);

  return (
    <div>
      <PageHeader
        title="Чаты Школы"
        description="Все переписки учеников с инструкторами. Только чтение."
      />

      {(instructors.length > 1 || instructorId) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FilterChip active={!instructorId} onClick={() => setInstructorId(null)}>
            Все
          </FilterChip>
          {instructors.map((i) => (
            <FilterChip
              key={i.id}
              active={instructorId === i.id}
              onClick={() => {
                setInstructorId(i.id);
                setSelectedId(null);
              }}
            >
              {i.name}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px,1fr]">
        <Panel className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="text-sm font-semibold">Диалоги</div>
            <div className="text-xs text-zinc-500">{items.length}</div>
          </div>
          <div className="h-[calc(100%-49px)] overflow-y-auto">
            {chatsQ.isLoading && <div className="p-4 text-sm text-zinc-500">Загружаем…</div>}
            {!chatsQ.isLoading && items.length === 0 && (
              <div className="p-4 text-sm text-zinc-500">Пока нет ни одной переписки.</div>
            )}
            {items.map((c) => (
              <ChatRow
                key={c.chatId}
                item={c}
                active={c.chatId === selectedId}
                onSelect={() => setSelectedId(c.chatId)}
              />
            ))}
          </div>
        </Panel>

        <Panel className="h-[calc(100vh-220px)] min-h-[520px] overflow-hidden">
          {selectedId ? (
            <ChatView key={selectedId} chatId={selectedId} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">
              Выбери диалог слева
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
      )}
    >
      {children}
    </button>
  );
}

function ChatRow({
  item,
  active,
  onSelect,
}: {
  item: AdminSchoolChatItem;
  active: boolean;
  onSelect: () => void;
}) {
  const avatar = resolveAssetUrl(item.studentAvatar);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors dark:border-zinc-800",
        active ? "bg-zinc-100 dark:bg-zinc-800/60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
      )}
    >
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        {avatar ? (
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
            {item.studentNick.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">@{item.studentNick}</div>
          <div className="shrink-0 text-[11px] text-zinc-500">{formatTime(item.lastMessageAt)}</div>
        </div>
        <div className="truncate text-[12px] text-zinc-500 dark:text-zinc-400">
          {item.instructorName}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-zinc-600 dark:text-zinc-300">
          {item.lastMessageRole === "instructor" ? "→ " : ""}
          {item.lastMessagePreview || "—"}
        </div>
      </div>
    </button>
  );
}

function ChatView({ chatId }: { chatId: string }) {
  const q = useAdminSchoolChat(chatId);
  const data = q.data;

  if (!data) {
    return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Загружаем…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            @{data.student.nick} · {data.instructor.displayName}
          </div>
          <div className="text-[11px] text-zinc-500">
            {data.messages.length} сообщений · счетов: {data.orders.length}
          </div>
        </div>
        <Badge tone="zinc">только чтение</Badge>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {data.messages.length === 0 && (
          <div className="text-sm text-zinc-500">Сообщений нет.</div>
        )}
        {data.messages.map((m) => {
          const fromInstructor = m.senderRole === "instructor";
          return (
            <div key={m.id} className={cn("flex", fromInstructor ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-[13px]",
                  fromInstructor
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
                )}
              >
                {m.imageUrl && (
                  <img
                    src={resolveAssetUrl(m.imageUrl) ?? m.imageUrl}
                    alt=""
                    className="mb-1 max-h-64 rounded-xl object-cover"
                  />
                )}
                {m.text && <div className="whitespace-pre-wrap break-words">{m.text}</div>}
                <div className="mt-1 text-right text-[10px] opacity-60">
                  {formatTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.orders.length > 0 && (
        <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            Счета в этом чате
          </div>
          <div className="space-y-1.5">
            {data.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate">{o.title}</span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                  {o.studentAmountRub.toLocaleString("ru-RU")} ₽ ·{" "}
                  {ORDER_STATUS_RU[o.status] ?? o.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
