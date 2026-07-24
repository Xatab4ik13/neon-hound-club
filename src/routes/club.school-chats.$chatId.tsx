// Чат инструктора с учеником. Реальный API `/api/v1/school/chats/:id/*`.
// Инструктор может писать текст и выставлять счета через `POST /instructor/orders`.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useViewer } from "@/hooks/use-viewer";
import { useIsInstructor } from "@/hooks/use-is-instructor";
import { MockChatRoom } from "@/components/instructor/MockChatRoom";
import type { InstructorMsg } from "@/data/instructor-chats-mock";
import {
  createInstructorOrder,
  fetchChatMessages,
  fetchInstructorChats,
  schoolQk,
  sendChatMessage,
  type ChatMessageApi,
  type ChatOrderApi,
} from "@/lib/api-school";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/club/school-chats/$chatId")({
  head: () => ({
    meta: [
      { title: "Чат с учеником — Школа" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstructorChatRoom,
});

/** Сообщения + карточки счетов в единую ленту. */
function toFeed(messages: ChatMessageApi[], orders: ChatOrderApi[]): InstructorMsg[] {
  const feed: InstructorMsg[] = messages
    .filter((m) => !(m.text && m.text.startsWith("📄 Выставлен счёт")))
    .map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      text: m.text ?? undefined,
      createdAt: new Date(m.createdAt).getTime(),
    }));

  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const when = o.scheduledAt ?? o.createdAt;
    feed.push({
      id: `order_${o.id}`,
      senderRole: "instructor",
      createdAt: new Date(o.createdAt).getTime(),
      invoice: {
        id: o.id,
        // У инструктора viewer="instructor" → MockChatRoom покажет `amount` как есть,
        // а сервер возвращает amountRub = сумма инструктора.
        duration: o.title,
        description: o.description || o.title,
        dateTime: when,
        amount: o.amountRub,
        status: o.status === "paid" ? "paid" : "pending",
      },
    });
  }

  feed.sort((a, b) => a.createdAt - b.createdAt);
  return feed;
}

function InstructorChatRoom() {
  const { chatId } = Route.useParams();
  const viewer = useViewer();
  const instr = useIsInstructor();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (instr.hydrated && viewer.user && !instr.isInstructor) {
      navigate({ to: "/club", replace: true });
    }
  }, [viewer.hydrated, viewer.user, instr.hydrated, instr.isInstructor, navigate]);

  const q = useQuery({
    queryKey: schoolQk.chatMessages(chatId),
    queryFn: () => fetchChatMessages(chatId),
    enabled: !!viewer.user && instr.isInstructor,
    refetchInterval: 15_000,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return false;
      return count < 2;
    },
  });

  const chatsQ = useQuery({
    queryKey: schoolQk.instructorChats,
    queryFn: fetchInstructorChats,
    enabled: !!viewer.user && instr.isInstructor,
  });
  const chatRow = chatsQ.data?.items.find((c) => c.id === chatId);

  const sendMut = useMutation({
    mutationFn: (text: string) => sendChatMessage(chatId, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolQk.chatMessages(chatId) });
      qc.invalidateQueries({ queryKey: schoolQk.instructorChats });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Не отправилось"),
  });

  const invoiceMut = useMutation({
    mutationFn: (draft: { duration: string; description: string; dateTime: string; amount: number }) =>
      createInstructorOrder({
        chatId,
        title: draft.duration,
        description: draft.description,
        instructorAmountRub: draft.amount,
        scheduledAt: draft.dateTime,
      }),
    onSuccess: () => {
      toast.success("Счёт выставлен");
      qc.invalidateQueries({ queryKey: schoolQk.chatMessages(chatId) });
      qc.invalidateQueries({ queryKey: schoolQk.instructorChats });
      qc.invalidateQueries({ queryKey: schoolQk.instructorOrders });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Не удалось создать счёт");
    },
  });

  const feed = useMemo(
    () => toFeed(q.data?.messages ?? [], q.data?.orders ?? []),
    [q.data],
  );

  if (q.isError) {
    const status = q.error instanceof ApiError ? q.error.status : 0;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-display text-lg font-black uppercase text-foreground">
          {status === 404 ? "Чат не найден" : "Не удалось открыть чат"}
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

  const peerName = chatRow?.studentNick ?? "Ученик";

  const headerH = 56;
  const pageHeight = `calc(100svh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - 64px - 8px - env(safe-area-inset-bottom))`;

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/70 px-3"
        style={{ height: headerH }}
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-sm font-black uppercase text-black">
          {peerName.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            {peerName}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            райдер
          </div>
        </div>
      </div>

      <MockChatRoom
        messages={feed}
        myRole="instructor"
        peerLabel={peerName}
        height={pageHeight}
        onSend={(text) => sendMut.mutate(text)}
        onSendInvoice={(draft) => invoiceMut.mutate(draft)}
      />
    </div>
  );
}
