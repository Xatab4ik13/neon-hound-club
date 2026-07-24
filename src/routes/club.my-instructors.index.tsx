// Список чатов ученика с инструкторами — реальный API `/api/v1/school/chats`.
// Открывается из «Ещё → Мои инструкторы».

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useViewer } from "@/hooks/use-viewer";
import { fetchInstructors, fetchMyChats, schoolQk } from "@/lib/api-school";

export const Route = createFileRoute("/club/my-instructors/")({
  head: () => ({
    meta: [
      { title: "Мои инструкторы" },
      { name: "description", content: "Твои чаты с инструкторами Школы." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyInstructorsList,
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

function MyInstructorsList() {
  const viewer = useViewer();
  const navigate = useNavigate();

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
    }
  }, [viewer.hydrated, viewer.user, navigate]);

  const q = useQuery({
    queryKey: schoolQk.myChats,
    queryFn: fetchMyChats,
    enabled: !!viewer.user,
  });
  const items = q.data?.items ?? [];

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Мои инструкторы
          </h1>
        </div>

        {q.isLoading ? (
          <div className="px-4 py-10 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Загружаем чаты…
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
            {items.map((t) => {
              const isMine = t.lastMessageRole === "student";
              return (
                <li key={t.id}>
                  <Link
                    to="/club/my-instructors/$chatId"
                    params={{ chatId: t.id }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                  >
                    {t.instructorAvatar ? (
                      <img
                        src={t.instructorAvatar}
                        alt={t.instructorName}
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/30 font-display font-black uppercase text-black">
                        {t.instructorName.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                          {t.instructorName}
                        </span>
                        {t.unread > 0 && (
                          <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-[#B6FF3C] px-1.5 font-mono text-[10px] font-bold text-black">
                            {t.unread}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatWhen(t.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={cn(
                            "truncate text-[13px] block",
                            isMine ? "text-muted-foreground" : "text-foreground/80",
                          )}
                        >
                          {t.lastMessagePreview || "…"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const q = useQuery({ queryKey: schoolQk.instructors, queryFn: fetchInstructors });
  const preview = (q.data?.items ?? []).slice(0, 4);
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-sm text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">
          Ещё нет переписок
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Открой Школу, выбери инструктора и нажми «Связаться» — чат появится здесь.
        </p>
        {preview.length > 0 && (
          <div className="mt-6 flex items-center justify-center -space-x-3">
            {preview.map((it) =>
              it.avatarUrl ? (
                <img
                  key={it.slug}
                  src={it.avatarUrl}
                  alt={it.displayName}
                  className="h-11 w-11 rounded-full border-2 border-[#0a0a0a] object-cover"
                />
              ) : (
                <div
                  key={it.slug}
                  className="grid h-11 w-11 place-items-center rounded-full border-2 border-[#0a0a0a] bg-primary/30 font-display font-black uppercase text-black"
                >
                  {it.displayName.slice(0, 1)}
                </div>
              ),
            )}
          </div>
        )}
        <Link
          to="/club/school"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground active:opacity-80"
        >
          К инструкторам
        </Link>
      </div>
    </div>
  );
}
