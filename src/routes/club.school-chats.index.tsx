// Список чатов инструктора + таб «Заказы» с выставленными счетами.
// Реальный API `/api/v1/instructor/{me,chats,orders}`.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import { useViewer } from "@/hooks/use-viewer";
import { useIsInstructor } from "@/hooks/use-is-instructor";
import {
  fetchInstructorChats,
  fetchInstructorOrders,
  schoolQk,
  type InstructorChatRow,
  type InstructorOrderRow,
} from "@/lib/api-school";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
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

function formatLessonDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
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
  const viewer = useViewer();
  const instr = useIsInstructor();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"chats" | "orders">("chats");
  const [details, setDetails] = useState<InstructorOrderRow | null>(null);

  useEffect(() => {
    if (viewer.hydrated && !viewer.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (instr.hydrated && viewer.user && !instr.isInstructor) {
      navigate({ to: "/club", replace: true });
    }
  }, [viewer.hydrated, viewer.user, instr.hydrated, instr.isInstructor, navigate]);

  const chatsQ = useQuery({
    queryKey: schoolQk.instructorChats,
    queryFn: fetchInstructorChats,
    enabled: !!viewer.user && instr.isInstructor,
    refetchInterval: 30_000,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return false;
      return count < 2;
    },
  });

  const ordersQ = useQuery({
    queryKey: schoolQk.instructorOrders,
    queryFn: fetchInstructorOrders,
    enabled: !!viewer.user && instr.isInstructor && tab === "orders",
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) return false;
      return count < 2;
    },
  });

  const chats: InstructorChatRow[] = chatsQ.data?.items ?? [];
  const orders: InstructorOrderRow[] = useMemo(
    () =>
      (ordersQ.data?.items ?? [])
        .filter((o) => o.status !== "cancelled")
        .sort((a, b) => {
          const at = a.paidAt ?? a.createdAt;
          const bt = b.paidAt ?? b.createdAt;
          return new Date(bt).getTime() - new Date(at).getTime();
        }),
    [ordersQ.data],
  );

  if (!instr.hydrated || (viewer.user && !instr.isInstructor && !instr.hydrated)) {
    return null;
  }

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Школа
          </h1>
        </div>

        <div className="px-4 pb-3">
          <div className="flex rounded-2xl border border-white/[0.08] bg-black/60 p-1">
            <button
              type="button"
              onClick={() => setTab("chats")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 font-display text-[13px] font-black uppercase tracking-tight transition-colors",
                tab === "chats" ? "bg-primary text-black" : "text-muted-foreground",
              )}
            >
              Чаты
            </button>
            <button
              type="button"
              onClick={() => setTab("orders")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 font-display text-[13px] font-black uppercase tracking-tight transition-colors",
                tab === "orders" ? "bg-[#B6FF3C] text-black" : "text-muted-foreground",
              )}
            >
              Заказы
            </button>
          </div>
        </div>

        {tab === "chats" && (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
            {chatsQ.isLoading && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Загрузка…
              </li>
            )}
            {!chatsQ.isLoading && chats.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Пока нет чатов
              </li>
            )}
            {chats.map((c) => {
              const isMine = c.lastMessageRole === "instructor";
              return (
                <li key={c.id}>
                  <Link
                    to="/club/school-chats/$chatId"
                    params={{ chatId: c.id }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                  >
                    <Avatar nick={c.studentNick} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                          {c.studentNick}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatWhen(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px]",
                            isMine ? "text-muted-foreground" : "text-foreground/80",
                          )}
                        >
                          {c.lastMessagePreview || "…"}
                        </span>
                        {c.unread > 0 && (
                          <span className="ml-auto grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1.5 font-mono text-[10px] font-bold leading-none text-primary-foreground">
                            {c.unread > 99 ? "99+" : c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "orders" && (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
            {ordersQ.isLoading && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Загрузка…
              </li>
            )}
            {!ordersQ.isLoading && orders.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Заказов пока нет
              </li>
            )}
            {orders.map((o) => {
              const paid = o.status === "paid";
              const inner = (
                <>
                  <Avatar nick={o.studentNick} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                        {o.studentNick}
                      </span>
                      <span
                        className={cn(
                          "ml-auto shrink-0 font-display text-[15px] font-black tracking-tight",
                          paid ? "text-[#B6FF3C]" : "text-muted-foreground",
                        )}
                      >
                        {formatRub(o.amountRub)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider",
                          paid
                            ? "bg-[#B6FF3C]/15 text-[#B6FF3C]"
                            : "bg-white/[0.06] text-muted-foreground",
                        )}
                      >
                        {paid ? "Оплачено" : "Ожидает оплаты"}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatLessonDate(o.scheduledAt ?? o.createdAt)}
                      </span>
                    </div>
                  </div>
                </>
              );
              return (
                <li key={o.id}>
                  {paid ? (
                    <button
                      type="button"
                      onClick={() => setDetails(o)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/[0.04]"
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link
                      to="/club/school-chats/$chatId"
                      params={{ chatId: o.chatId }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                    >
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <OrderDetailsSheet
        order={details}
        onOpenChange={(v) => {
          if (!v) setDetails(null);
        }}
      />
    </div>
  );
}

function OrderDetailsSheet({
  order,
  onOpenChange,
}: {
  order: InstructorOrderRow | null;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Sheet open={!!order} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-white/10 bg-[#0a0a0a] px-5 pb-6 pt-4"
      >
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="font-display text-lg font-black uppercase tracking-tight text-foreground">
            Заказ · {order ? formatRub(order.amountRub) : ""}
          </SheetTitle>
        </SheetHeader>
        {order && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-[#B6FF3C]/30 bg-[#B6FF3C]/10 p-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#B6FF3C]">
                Оплачено
              </div>
              <div className="mt-1 font-display text-[28px] font-black leading-none tracking-tight text-foreground">
                {formatRub(order.amountRub)}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Твоя сумма без комиссии платформы
              </div>
            </div>

            <DetailRow label="Ученик" value={order.studentNick} />
            <DetailRow label="Занятие" value={order.title} />
            {order.description && <DetailRow label="Описание" value={order.description} />}
            {order.scheduledAt && (
              <DetailRow label="Дата" value={formatLessonDate(order.scheduledAt)} />
            )}
            {order.paidAt && (
              <DetailRow label="Оплачено" value={formatLessonDate(order.paidAt)} />
            )}

            <Link
              to="/club/school-chats/$chatId"
              params={{ chatId: order.chatId }}
              onClick={() => onOpenChange(false)}
              className="mt-2 rounded-2xl border border-white/10 bg-black/50 px-5 py-3 text-center font-display text-[13px] font-black uppercase tracking-tight text-foreground/80 transition-transform active:scale-95"
            >
              Открыть чат
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div className="mt-1 font-display text-[14px] font-bold leading-snug tracking-tight text-foreground">
        {value}
      </div>
    </div>
  );
}
