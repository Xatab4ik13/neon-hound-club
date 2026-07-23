// Список чатов блогера. Источник — /api/v1/blogger/chats. Пока бэк не задеплоен —
// показываем empty-state, без моков.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useBloggerChatList } from "@/lib/blogger-chats-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blogger/chats/")({
  head: () => ({
    meta: [
      { title: "Чаты — Кабинет блогера" },
      { name: "description", content: "Личные чаты подписчиков с Hell." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BloggerChatsList,
});

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  if (same) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const yst = new Date();
  yst.setDate(now.getDate() - 1);
  if (d.toDateString() === yst.toDateString()) return "Вчера";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function Avatar({ nick }: { nick: string }) {
  const initial = nick.slice(0, 1).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-lg font-black uppercase tracking-tight text-black">
        {initial}
      </div>
    </div>
  );
}

function BloggerChatsList() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useBloggerChatList();

  const rows = useMemo(() => {
    const list = data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => r.peerNick.toLowerCase().includes(s));
  }, [data, q]);

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Чаты
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {(data?.length ?? 0)} чатов
          </p>
        </div>

        <div className="px-4 pb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по нику…"
            className="w-full rounded-2xl border border-white/[0.08] bg-black/60 px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60"
          />
        </div>

        <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
          {isLoading && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">Загружаем…</li>
          )}
          {!isLoading && rows.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              {isError ? "Не удалось загрузить чаты" : "Пока ни одного чата"}
            </li>
          )}
          {rows.map((r) => {
            const isMine = r.lastMessageRole === "blogger";
            return (
              <li key={r.threadId}>
                <Link
                  to="/blogger/chats/$userId"
                  params={{ userId: r.userId }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                >
                  <Avatar nick={r.peerNick} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                        {r.peerNick}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatWhen(r.lastMessageAt)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {isMine && (
                        <span className="shrink-0 rounded-md bg-[#B6FF3C]/15 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-widest text-[#B6FF3C]">
                          Ты
                        </span>
                      )}
                      <span
                        className={cn(
                          "truncate text-[13px]",
                          isMine ? "text-muted-foreground" : "text-foreground/80",
                        )}
                      >
                        {r.lastMessagePreview || "…"}
                      </span>
                      {r.bloggerUnread > 0 && (
                        <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold text-primary-foreground">
                          {r.bloggerUnread}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
