// Список чатов инструктора (мок). Отображается в PWA-таббаре под пунктом
// «Школа» — только когда включён mock-режим инструктора.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMockInstructorRole } from "@/hooks/use-instructor-mock-role";
import {
  getInstructorAccount,
} from "@/data/instructor-accounts";
import { useInstructorThreadsList } from "@/data/instructor-chats-mock";

export const Route = createFileRoute("/club/school-chats/")({
  head: () => ({
    meta: [
      { title: "Школа — чаты" },
      { name: "description", content: "Чаты инструктора с учениками." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchoolChatsList,
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

function Avatar({ nick }: { nick: string }) {
  const initial = nick.slice(0, 1).toUpperCase();
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-lg font-black uppercase tracking-tight text-black">
      {initial}
    </div>
  );
}

function SchoolChatsList() {
  const slug = useMockInstructorRole();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const threads = useInstructorThreadsList(slug ?? "");
  const account = slug ? getInstructorAccount(slug) : undefined;

  useEffect(() => {
    if (!slug) navigate({ to: "/club", replace: true });
  }, [slug, navigate]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return threads;
    return threads.filter((t) => t.studentNick.toLowerCase().includes(s));
  }, [threads, q]);

  if (!slug || !account) {
    return null;
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Школа · {account.name}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {threads.length} {threads.length === 1 ? "чат" : "чатов"} с учениками
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
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              Пока нет чатов
            </li>
          )}
          {rows.map((t) => {
            const last = t.messages.at(-1);
            const isMine = last?.senderRole === "instructor";
            return (
              <li key={t.studentUserId}>
                <Link
                  to="/club/school-chats/$studentId"
                  params={{ studentId: t.studentUserId }}
                  className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                >
                  <Avatar nick={t.studentNick} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                        {t.studentNick}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {last ? formatWhen(last.createdAt) : ""}
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
                        {last?.text ?? "…"}
                      </span>
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
