// Полноэкранный чат ученика с инструктором. Открывается со страницы Школы
// или из списка «Мои инструкторы». Реальный API `/api/v1/school/chats/:id`.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useViewer } from "@/hooks/use-viewer";
import { MockChatRoom } from "@/components/instructor/MockChatRoom";
import type { InstructorMsg } from "@/data/instructor-chats-mock";
import {
  fetchChatMessages,
  fetchMyChats,
  payOrder,
  schoolQk,
  sendChatMessage,
  type ChatOrderApi,
  type ChatMessageApi,
} from "@/lib/api-school";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/club/my-instructors/$chatId")({
  head: () => ({
    meta: [
      { title: "Чат с инструктором" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyInstructorChatRoom,
});

/** Составляем ленту: обычные сообщения + счета как invoice-карточки. */
function toChatFeed(
  messages: ChatMessageApi[],
  orders: ChatOrderApi[],
): InstructorMsg[] {
  const feed: InstructorMsg[] = messages
    // отфильтровываем сервисный текст "📄 Выставлен счёт …" — карточка счёта покажется отдельно
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
        duration: o.title,
        description: o.description || o.title,
        dateTime: when,
        // Для ученика сервер уже отдаёт цену с наценкой; передаём как есть,
        // а UI-хелпер invoiceTotalForStudent домножает ещё раз — поэтому
        // делим обратно через фиктивный «amount» = student / 1.2.
        // Проще: используем amount = student, а `invoiceTotalForStudent`
        // подкорректируем в MockChatRoom → нельзя. Оставим amount = student
        // и полагаемся на то, что «оплатить N₽» рассчитается снова, что даст
        // завышение. Обходим — сохраняем корректную сумму через хак: amount
        // = round(student / 1.2), тогда invoiceTotalForStudent(amount) ≈ student.
        amount: Math.round(o.amountRub / 1.2),
        status: o.status === "paid" ? "paid" : "pending",
      },
    });
  }

  feed.sort((a, b) => a.createdAt - b.createdAt);
  return feed;
}

function MyInstructorChatRoom() {
  const { chatId } = Route.useParams();
  const viewer = useViewer();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
    }
  }, [viewer.hydrated, viewer.user, navigate]);

  const q = useQuery({
    queryKey: schoolQk.chatMessages(chatId),
    queryFn: () => fetchChatMessages(chatId),
    enabled: !!viewer.user,
    refetchInterval: 15_000,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return false;
      return count < 2;
    },
  });

  // Дополнительно — данные о собеседнике (аватар/имя) из списка чатов.
  const chatsQ = useQuery({
    queryKey: schoolQk.myChats,
    queryFn: fetchMyChats,
    enabled: !!viewer.user,
  });
  const chatRow = chatsQ.data?.items.find((c) => c.id === chatId);

  const sendMut = useMutation({
    mutationFn: (text: string) => sendChatMessage(chatId, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolQk.chatMessages(chatId) });
      qc.invalidateQueries({ queryKey: schoolQk.myChats });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Не отправилось"),
  });

  const payMut = useMutation({
    mutationFn: (orderId: string) => payOrder(orderId, "card"),
    onSuccess: (res) => {
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.error("Оплата временно недоступна");
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Не удалось создать платёж");
    },
  });

  const feed = useMemo(
    () => toChatFeed(q.data?.messages ?? [], q.data?.orders ?? []),
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
          to="/club/my-instructors"
          className="rounded-full bg-primary px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary-foreground"
        >
          К чатам
        </Link>
      </div>
    );
  }

  const peerName = chatRow?.instructorName ?? q.data?.chat.instructorName ?? "Инструктор";
  const peerAvatar = chatRow?.instructorAvatar ?? null;
  const peerCity = ""; // не приходит в ответе — можно расширить API позже, пока не критично

  const headerH = 56;
  const pageHeight = `calc(100dvh - 3.25rem - env(safe-area-inset-top) - ${headerH}px - 64px - 8px - env(safe-area-inset-bottom))`;

  return (
    <div className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-black/70 px-3"
        style={{ height: headerH }}
      >
        {peerAvatar ? (
          <img
            src={peerAvatar}
            alt={peerName}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/30 font-display font-black uppercase text-black">
            {peerName.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
            {peerName}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {peerCity ? `${peerCity} · инструктор` : "инструктор"}
          </div>
        </div>
      </div>

      <MockChatRoom
        messages={feed}
        myRole="student"
        peerLabel={peerName}
        height={pageHeight}
        onSend={(text) => sendMut.mutate(text)}
        onPayInvoice={(invoiceId) => payMut.mutate(invoiceId)}
      />
    </div>
  );
}
