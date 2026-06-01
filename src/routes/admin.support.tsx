import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bug, Lightbulb, HelpCircle } from "lucide-react";
import {
  PageHeader,
  Panel,
  PanelHeader,
  Btn,
  DataTable,
  Modal,
  TextArea,
  Badge,
  Select,
  Field,
} from "@/components/admin/ui";
import { AdminPager, type AdminPageSize } from "@/components/admin/AdminPager";
import {
  fetchAdminSupportTickets,
  fetchAdminSupportTicket,
  replyToSupportTicket,
  closeSupportTicket,
  SUPPORT_CATEGORY_LABEL,
  type SupportCategory,
  type SupportStatus,
} from "@/lib/support-api";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

const CATEGORY_ICON: Record<SupportCategory, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  question: HelpCircle,
};

function AdminSupportPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminPageSize>(50);
  const [status, setStatus] = useState<SupportStatus | "all">("all");
  const [category, setCategory] = useState<SupportCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "support", "tickets", page, pageSize, status, category],
    queryFn: () =>
      fetchAdminSupportTickets({
        page,
        pageSize,
        status: status === "all" ? undefined : status,
        category: category === "all" ? undefined : category,
      }),
    placeholderData: (prev) => prev,
  });

  const items = q.data?.items ?? [];
  const total = q.data?.total ?? 0;

  return (
    <div>
      <PageHeader
        title="Помощь"
        description="Тикеты пользователей: баги, идеи, вопросы."
      />

      <Panel>
        <PanelHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as SupportStatus | "all");
                setPage(1);
              }}
              className="w-auto"
            >
              <option value="all">Все статусы</option>
              <option value="open">Открытые</option>
              <option value="answered">Отвеченные</option>
              <option value="closed">Закрытые</option>
            </Select>
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as SupportCategory | "all");
                setPage(1);
              }}
              className="w-auto"
            >
              <option value="all">Все категории</option>
              <option value="bug">Баги</option>
              <option value="feature">Идеи</option>
              <option value="question">Вопросы</option>
            </Select>
          </div>
          <div className="text-sm text-zinc-500">Всего: {total}</div>
        </PanelHeader>

        <DataTable
          headers={["Дата", "Юзер", "Категория", "Тема", "Статус"]}
          rows={items.map((row) => [
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              {new Date(row.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>,
            <span className="font-medium">@{row.nick ?? "—"}</span>,
            <CategoryCell category={row.category} />,
            <button
              type="button"
              onClick={() => setOpenId(row.id)}
              className="text-left text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              {row.subject}
            </button>,
            <StatusCell status={row.status} />,
          ])}
        />

        {q.isLoading && (
          <div className="p-6 text-center text-sm text-zinc-500">Загрузка…</div>
        )}
        {!q.isLoading && items.length === 0 && (
          <div className="p-6 text-center text-sm text-zinc-500">Пусто</div>
        )}

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      </Panel>

      {openId && (
        <TicketModal id={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

function CategoryCell({ category }: { category: SupportCategory }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5" />
      {SUPPORT_CATEGORY_LABEL[category]}
    </span>
  );
}

function StatusCell({ status }: { status: SupportStatus }) {
  if (status === "open") return <Badge tone="amber">Открыт</Badge>;
  if (status === "answered") return <Badge tone="blue">Отвечен</Badge>;
  return <Badge tone="zinc">Закрыт</Badge>;
}

function TicketModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin", "support", "ticket", id],
    queryFn: () => fetchAdminSupportTicket(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "support"] });
  };

  const replyMut = useMutation({
    mutationFn: (close: boolean) => replyToSupportTicket(id, reply.trim(), close),
    onSuccess: (_d, close) => {
      toast.success(close ? "Ответ отправлен, тикет закрыт" : "Ответ отправлен");
      invalidate();
      onClose();
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Не получилось");
    },
  });

  const closeMut = useMutation({
    mutationFn: () => closeSupportTicket(id),
    onSuccess: () => {
      toast.success("Тикет закрыт");
      invalidate();
      onClose();
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Не получилось");
    },
  });

  const ticket = detailQ.data;
  const canReply = !!ticket && ticket.status !== "closed";

  return (
    <Modal
      open
      onClose={onClose}
      title={ticket?.subject ?? "Тикет"}
      size="lg"
      description={
        ticket
          ? `@${ticket.nick ?? "—"} · ${SUPPORT_CATEGORY_LABEL[ticket.category]} · ${new Date(ticket.createdAt).toLocaleString("ru-RU")}`
          : undefined
      }
      footer={
        canReply ? (
          <>
            <Btn onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>
              Закрыть без ответа
            </Btn>
            <Btn
              onClick={() => replyMut.mutate(false)}
              disabled={!reply.trim() || replyMut.isPending}
            >
              Отправить ответ
            </Btn>
            <Btn
              variant="primary"
              onClick={() => replyMut.mutate(true)}
              disabled={!reply.trim() || replyMut.isPending}
            >
              Отправить и закрыть
            </Btn>
          </>
        ) : (
          <Btn onClick={onClose}>Закрыть</Btn>
        )
      }
    >
      {!ticket ? (
        <div className="py-6 text-center text-sm text-zinc-500">Загрузка…</div>
      ) : (
        <div className="space-y-4">
          <Field label="Вопрос юзера">
            <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
              {ticket.body}
            </div>
          </Field>

          {ticket.adminReply && (
            <Field label="Уже отправленный ответ">
              <div className="whitespace-pre-wrap rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-zinc-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-zinc-200">
                {ticket.adminReply}
              </div>
            </Field>
          )}

          {canReply && (
            <Field
              label={ticket.adminReply ? "Новый ответ (перезапишет старый)" : "Ответ"}
            >
              <TextArea
                rows={6}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Текст ответа юзеру. Будет отправлен пушем."
              />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}

