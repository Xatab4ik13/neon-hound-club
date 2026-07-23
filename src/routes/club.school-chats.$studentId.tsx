// Окно чата инструктора с учеником (мок). Стиль зеркалит VIP-чат:
// dot-grid фон, «мои» баблы — салатовые справа, ученик — белые слева.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMockInstructorRole } from "@/hooks/use-instructor-mock-role";
import { getInstructorAccount, getMockStudent } from "@/data/instructor-accounts";
import {
  ensureThread,
  payInstructorInvoice,
  sendInstructorChatMessage,
  sendInstructorInvoice,
  useInstructorThread,
} from "@/data/instructor-chats-mock";
import { MockChatRoom } from "@/components/instructor/MockChatRoom";

export const Route = createFileRoute("/club/school-chats/$studentId")({
  head: () => ({
    meta: [
      { title: "Чат с учеником — Школа" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchoolChatRoom,
});

function SchoolChatRoom() {
  const { studentId } = Route.useParams();
  const slug = useMockInstructorRole();
  const navigate = useNavigate();
  const account = slug ? getInstructorAccount(slug) : undefined;
  const student = getMockStudent(studentId);
  const thread = useInstructorThread(slug ?? "", studentId);

  useEffect(() => {
    if (!slug) navigate({ to: "/club", replace: true });
  }, [slug, navigate]);

  useEffect(() => {
    if (slug && student) ensureThread(slug, student.userId, student.nick);
  }, [slug, student]);

  if (!slug || !account) return null;
  if (!student) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">
          Ученик не найден
        </p>
        <Link
          to="/club/school-chats"
          className="rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
        >
          К чатам
        </Link>
      </div>
    );
  }

  const messages = thread?.messages ?? [];

  // Высота: viewport - MobileTopBar (3.25rem + safe-area) - локальная шапка (48px)
  // - таб-бар (64px + safe-area + 8px).
  const headerH = 48;
  const pageHeight = `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - 64px - 8px - env(safe-area-inset-bottom))`;

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/70 px-3"
        style={{ height: headerH }}
      >
        <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-sm font-black uppercase text-black">
          {student.nick.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[14px] font-black uppercase tracking-tight text-foreground">
            {student.nick}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            райдер
          </div>
        </div>
      </div>

      <MockChatRoom
        messages={messages}
        myRole="instructor"
        peerLabel={student.nick}
        height={pageHeight}
        onSend={(text) =>
          sendInstructorChatMessage(slug, student.userId, student.nick, { text }, "instructor")
        }
        onSendInvoice={(draft) =>
          sendInstructorInvoice(slug, student.userId, student.nick, draft)
        }
        onPayInvoice={(invoiceId, payer) =>
          payInstructorInvoice(slug, student.userId, student.nick, invoiceId, payer)
        }
      />
    </div>
  );
}
