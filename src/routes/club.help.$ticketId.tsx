import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bug, Lightbulb, HelpCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import {
  getTicket,
  supportQk,
  SUPPORT_CATEGORY_LABEL,
  type SupportCategory,
} from "@/lib/support-api";
import { useViewer } from "@/hooks/use-viewer";

export const Route = createFileRoute("/club/help/$ticketId")({
  head: () => ({
    meta: [
      { title: "Тикет — клуб HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketDetailPage,
});

const CATEGORY_ICON: Record<SupportCategory, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  question: HelpCircle,
};

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const { isAuthed } = useViewer();

  const q = useQuery({
    queryKey: supportQk.detail(ticketId),
    queryFn: () => getTicket(ticketId),
    enabled: isAuthed,
    refetchOnWindowFocus: true,
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)] md:max-w-3xl md:px-8 md:py-10">
      <Link
        to="/club/help"
        className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-primary active:opacity-60"
      >
        <ArrowLeft className="h-4 w-4" />
        Все тикеты
      </Link>

      {q.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : q.isError || !q.data ? (
        <p className="px-1 text-[14px] text-muted-foreground">Тикет не найден.</p>
      ) : (
        <article className="space-y-5">
          <PageHeader title={q.data.subject} />

          {/* Карточка вопроса */}
          <section className="rounded-2xl border border-white/[0.06] bg-card/40 p-4">
            <header className="mb-3 flex items-center gap-2">
              {(() => {
                const Icon = CATEGORY_ICON[q.data.category];
                return (
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
                  </span>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground">
                  Ваш вопрос
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {SUPPORT_CATEGORY_LABEL[q.data.category]} ·{" "}
                  {formatDateTime(q.data.createdAt)}
                </div>
              </div>
            </header>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {q.data.body}
            </p>
          </section>

          {/* Карточка ответа */}
          {q.data.adminReply ? (
            <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
              <header className="mb-3 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground font-mono text-[11px] font-bold">
                  HH
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-foreground">
                    Ответ команды
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {q.data.answeredAt ? formatDateTime(q.data.answeredAt) : ""}
                  </div>
                </div>
              </header>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {q.data.adminReply}
              </p>
            </section>
          ) : (
            <section className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-5 text-center">
              <p className="text-[14px] font-medium text-foreground">
                Ждём ответа команды
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Обычно отвечаем в течение пары дней. Пришлём пуш, как ответим.
              </p>
            </section>
          )}

          {q.data.status === "closed" && (
            <p className="px-1 text-center text-[12px] text-muted-foreground">
              Тикет закрыт.
            </p>
          )}

          {q.data.status === "answered" && !q.data.closedAt && (
            <Link
              to="/club/help/new"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3 text-[14px] font-semibold text-foreground active:opacity-80"
            >
              Новый вопрос — новый тикет
            </Link>
          )}
        </article>
      )}
    </main>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
