// Bottom-sheet «Записаться» — открывается по кнопке на странице инструктора
// (`/club/school/$instructorId`). Юзер общается с инструктором в стиле VIP-чата,
// история хранится в localStorage вместе с чатами инструкторской стороны.

import { Drawer } from "vaul";
import { useEffect, useMemo } from "react";
import { X } from "@/components/ui/icons";
import { useViewer } from "@/hooks/use-viewer";
import {
  ensureThread,
  sendInstructorChatMessage,
  useInstructorThread,
} from "@/data/instructor-chats-mock";
import { MockChatRoom } from "@/components/instructor/MockChatRoom";

export function BookInstructorChatSheet({
  open,
  onOpenChange,
  instructorSlug,
  instructorName,
  instructorPhoto,
  instructorCity,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  instructorSlug: string;
  instructorName: string;
  instructorPhoto: string;
  instructorCity: string;
}) {
  const viewer = useViewer();

  // Ученик = текущий пользователь. Пока нет бэка — берём id/nick из сессии,
  // а если юзер не залогинен, используем «guest».
  const student = useMemo(() => {
    if (viewer.user) {
      return { userId: viewer.user.id, nick: viewer.user.nick };
    }
    return { userId: "guest", nick: "GUEST" };
  }, [viewer.user]);

  const thread = useInstructorThread(instructorSlug, student.userId);

  useEffect(() => {
    if (open) ensureThread(instructorSlug, student.userId, student.nick);
  }, [open, instructorSlug, student]);

  const messages = thread?.messages ?? [];

  // Высота ленты внутри шита: почти весь viewport минус шапка.
  const chatHeight = "calc(88dvh - 68px)";

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col rounded-t-[20px] border-t border-white/[0.08] bg-[#0d0d0d] outline-none"
          style={{ paddingBottom: 0 }}
        >
          <Drawer.Title className="sr-only">Чат с {instructorName}</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-3">
            <img
              src={instructorPhoto}
              alt={instructorName}
              className="h-11 w-11 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[16px] font-black uppercase tracking-tight text-foreground">
                {instructorName}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {instructorCity} · инструктор
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Закрыть"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <MockChatRoom
              messages={messages}
              myRole="student"
              peerLabel={instructorName}
              height={chatHeight}
              onSend={(text) =>
                sendInstructorChatMessage(
                  instructorSlug,
                  student.userId,
                  "student",
                  text,
                )
              }
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
