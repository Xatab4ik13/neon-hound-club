// Список чатов блогера (мок). Стилистика — «Plump Racing»: жирные ники,
// mono-таймстампы, magenta-акценты. При тапе — переход в диалог.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CHAT_USERS, CHAT_HISTORY, lastMessage, chatPreview } from "@/data/blogger-chats-mock";
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

function formatWhen(ts: number): string {
  const d = new Date(ts);
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

function Avatar({ nick, online }: { nick: string; online?: boolean }) {
  const initial = nick.slice(0, 1).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-lg font-black uppercase tracking-tight text-black">
        {initial}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0a0a0a] bg-[#B6FF3C]" />
      )}
    </div>
  );
}

function BloggerChatsList() {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = CHAT_USERS.map((u) => {
      const last = lastMessage(u.id);
      return { user: u, last };
    }).filter((r) => !!r.last);
    list.sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0));
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => r.user.nick.toLowerCase().includes(s));
  }, [q]);

  const totalMessages = useMemo(
    () => Object.values(CHAT_HISTORY).reduce((n, arr) => n + arr.length, 0),
    [],
  );

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Чаты
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {CHAT_USERS.length} чатов · {totalMessages} сообщений
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
          {rows.map(({ user, last }) => {
            const isMine = last?.role === "me";
            return (
              <li key={user.id}>
                <Link
                  to="/blogger/chats/$userId"
                  params={{ userId: user.id }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                >
                  <Avatar nick={user.nick} online={user.online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                        {user.nick}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {last ? formatWhen(last.at) : ""}
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
                        {chatPreview(last)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              Ничего не нашли
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
