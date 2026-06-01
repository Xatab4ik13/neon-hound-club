import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bug, Lightbulb, HelpCircle, ChevronRight, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { useViewer } from "@/hooks/use-viewer";
import {
  listMyTickets,
  supportQk,
  SUPPORT_CATEGORY_LABEL,
  type SupportCategory,
  type SupportStatus,
  type SupportTicketListItem,
} from "@/lib/support-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/club/help/")({
  head: () => ({
    meta: [
      { title: "Помощь — клуб HELLHOUND" },
      { name: "description", content: "Сообщить о баге, предложить идею, задать вопрос." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HelpPage,
});

const CATEGORY_ICON: Record<SupportCategory, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  question: HelpCircle,
};

function HelpPage() {
  const { isAuthed } = useViewer();
  const [tab, setTab] = useState<"active" | "closed">("active");

  const q = useQuery({
    queryKey: supportQk.list(tab),
    queryFn: () => listMyTickets(tab),
    enabled: isAuthed,
  });

  const items = q.data?.items ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)] md:max-w-3xl md:px-8 md:py-10">
      <PageHeader title="Помощь" subtitle="Вопросы, баги, идеи" />

      {/* Сегмент-контрол */}
      <div className="mb-4 inline-flex w-full rounded-xl bg-card/40 p-1 border border-white/[0.06]">
        {(
          [
            ["active", "Активные"],
            ["closed", "Архив"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "flex-1 rounded-lg py-2 text-[14px] font-semibold transition-colors",
              tab === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground active:bg-white/[0.04]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Link
        to="/club/help/new"
        className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[15px] font-semibold text-primary-foreground active:opacity-80"
      >
        <Plus className="h-4 w-4" />
        Новый тикет
      </Link>

      {q.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
          {items.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </ul>
      )}
    </main>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicketListItem }) {
  const Icon = CATEGORY_ICON[ticket.category];
  return (
    <li>
      <Link
        to="/club/help/$ticketId"
        params={{ ticketId: ticket.id }}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-foreground">
            {ticket.subject}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span>{SUPPORT_CATEGORY_LABEL[ticket.category]}</span>
            <span>·</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </span>
        </span>
        <StatusChip status={ticket.status} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function StatusChip({ status }: { status: SupportStatus }) {
  if (status === "answered") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Ответ
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Закрыт
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-foreground/70">
      Ждёт
    </span>
  );
}

function EmptyState({ tab }: { tab: "active" | "closed" }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-foreground">
        {tab === "active" ? "Активных тикетов нет" : "В архиве пусто"}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {tab === "active"
          ? "Заметил баг или есть идея — напиши."
          : "Закрытые тикеты появятся здесь."}
      </p>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}
