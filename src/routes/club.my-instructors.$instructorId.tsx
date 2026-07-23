// Полноэкранный чат ученика с инструктором. Открывается со страницы Школы
// или из списка «Мои инструкторы».

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { PlumpArrowLeft as ArrowLeft } from "@/components/ui/icons";
import { useViewer } from "@/hooks/use-viewer";
import { getInstructorBySlug } from "@/data/instructors";
import {
  ensureThread,
  sendInstructorChatMessage,
  useInstructorThread,
} from "@/data/instructor-chats-mock";
import { MockChatRoom } from "@/components/instructor/MockChatRoom";

export const Route = createFileRoute("/club/my-instructors/$instructorId")({
  head: ({ params }) => {
    const it = getInstructorBySlug(params.instructorId);
    return {
      meta: [
        { title: it ? `Чат · ${it.name}` : "Чат с инструктором" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: MyInstructorChatRoom,
});

function MyInstructorChatRoom() {
  const { instructorId } = Route.useParams();
  const viewer = useViewer();
  const navigate = useNavigate();
  const instructor = getInstructorBySlug(instructorId);

  const student = useMemo(() => {
    if (viewer.user) return { userId: viewer.user.id, nick: viewer.user.nick };
    return { userId: "guest", nick: "GUEST" };
  }, [viewer.user]);

  const thread = useInstructorThread(instructorId, student.userId);

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
    }
  }, [viewer.hydrated, viewer.user, navigate]);

  useEffect(() => {
    if (instructor) ensureThread(instructor.slug, student.userId, student.nick);
  }, [instructor, student]);

  if (!instructor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">
          Инструктор не найден
        </p>
        <Link
          to="/club/my-instructors"
          className="rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
        >
          К чатам
        </Link>
      </div>
    );
  }

  const messages = thread?.messages ?? [];

  const headerH = 56;
  const pageHeight = `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - 64px - 8px - env(safe-area-inset-bottom))`;

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/70 px-3"
        style={{ height: headerH }}
      >
        <Link
          to="/club/my-instructors"
          aria-label="Назад"
          className="grid h-9 w-9 place-items-center rounded-full text-primary active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img
          src={instructor.photo}
          alt={instructor.name}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            {instructor.name}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {instructor.city} · инструктор
          </div>
        </div>
      </div>

      <MockChatRoom
        messages={messages}
        myRole="student"
        peerLabel={instructor.name}
        height={pageHeight}
        onSend={(text) =>
          sendInstructorChatMessage(
            instructor.slug,
            student.userId,
            student.nick,
            { text },
            "student",
          )
        }
      />
    </div>
  );
}
