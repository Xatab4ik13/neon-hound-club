// Список чатов ученика с инструкторами (мок). Открывается из «Ещё → Мои инструкторы».
// Стилистически повторяет club.school-chats.index.tsx, но со стороны обычного юзера.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useViewer } from "@/hooks/use-viewer";
import { getInstructorBySlug, INSTRUCTORS } from "@/data/instructors";
import { useStudentThreadsList } from "@/data/instructor-chats-mock";

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

function MyInstructorsList() {
  const viewer = useViewer();
  const navigate = useNavigate();
  const studentId = viewer.user?.id ?? "guest";
  const threads = useStudentThreadsList(studentId);

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
    }
  }, [viewer.hydrated, viewer.user, navigate]);

  const rows = useMemo(() => {
    return threads
      .map((t) => ({ thread: t, instructor: getInstructorBySlug(t.instructorSlug) }))
      .filter((r) => r.instructor);
  }, [threads]);

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Мои инструкторы
          </h1>
        </div>


        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
            {rows.map(({ thread: t, instructor }) => {
              if (!instructor) return null;
              const last = t.messages.at(-1);
              const isMine = last?.senderRole === "student";
              return (
                <li key={t.instructorSlug}>
                  <Link
                    to="/club/my-instructors/$instructorId"
                    params={{ instructorId: t.instructorSlug }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                  >
                    <img
                      src={instructor.photo}
                      alt={instructor.name}
                      loading="lazy"
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                          {instructor.name}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {last ? formatWhen(last.createdAt) : ""}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={cn(
                            "truncate text-[13px] block",
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
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const preview = INSTRUCTORS.slice(0, 4);
  return (
    <div className="px-4 py-10">
      <div className="mx-auto max-w-sm text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">
          Ещё нет переписок
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Открой Школу, выбери инструктора и нажми «Связаться» — чат появится здесь.
        </p>
        <div className="mt-6 flex items-center justify-center -space-x-3">
          {preview.map((it) => (
            <img
              key={it.slug}
              src={it.photo}
              alt={it.name}
              className="h-11 w-11 rounded-full border-2 border-[#0a0a0a] object-cover"
            />
          ))}
        </div>
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
