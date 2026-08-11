import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  PlumpArrowLeft as ArrowLeft,
  Bug,
  Lightbulb,
  HelpCircle,
  Loader2,
} from "@/components/ui/icons";
import { ImagePlus, X, Send } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import { uploadFileToS3 } from "@/lib/garage-api";
import {
  getTicket,
  postTicketMessage,
  supportQk,
  SUPPORT_CATEGORY_LABEL,
  type SupportCategory,
  type SupportMessage,
} from "@/lib/support-api";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";
import { cn } from "@/lib/utils";

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

const MAX_FILES = 4;

function TicketDetailPage() {
  const { ticketId } = Route.useParams();
  const { isAuthed } = useViewer();
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const q = useQuery({
    queryKey: supportQk.detail(ticketId),
    queryFn: () => getTicket(ticketId),
    enabled: isAuthed,
    refetchOnWindowFocus: true,
  });

  const sendMut = useMutation({
    mutationFn: () =>
      postTicketMessage(ticketId, { body: text.trim(), attachments }),
    onSuccess: () => {
      setText("");
      setAttachments([]);
      qc.invalidateQueries({ queryKey: supportQk.detail(ticketId) });
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Не отправилось");
    },
  });

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const free = MAX_FILES - attachments.length;
    if (free <= 0) {
      toast.error(`Максимум ${MAX_FILES} фото`);
      return;
    }
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, free)) {
        if (!f.type.startsWith("image/")) {
          toast.error("Можно только картинки");
          continue;
        }
        if (f.size > 10 * 1024 * 1024) {
          toast.error("Файл больше 10 МБ");
          continue;
        }
        const url = await uploadFileToS3(f, "support");
        setAttachments((prev) => [...prev, url]);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Не получилось загрузить");
    } finally {
      setUploading(false);
    }
  }

  const ticket = q.data;
  const closed = ticket?.status === "closed";
  const messages: SupportMessage[] = ticket?.messages?.length
    ? ticket.messages
    : ticket
      ? [
          {
            id: "legacy-user",
            authorRole: "user" as const,
            body: ticket.body,
            attachments: ticket.attachments ?? [],
            createdAt: ticket.createdAt,
          },
          ...(ticket.adminReply
            ? [
                {
                  id: "legacy-admin",
                  authorRole: "admin" as const,
                  body: ticket.adminReply,
                  attachments: [],
                  createdAt: ticket.answeredAt ?? ticket.createdAt,
                },
              ]
            : []),
        ]
      : [];

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
      ) : q.isError || !ticket ? (
        <p className="px-1 text-[14px] text-muted-foreground">Тикет не найден.</p>
      ) : (
        <div className="space-y-4">
          <PageHeader title={ticket.subject} />

          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            {(() => {
              const Icon = CATEGORY_ICON[ticket.category];
              return <Icon className="h-3.5 w-3.5" strokeWidth={2} />;
            })()}
            {SUPPORT_CATEGORY_LABEL[ticket.category]} · {formatDateTime(ticket.createdAt)}
          </div>

          {/* Переписка */}
          <section className="space-y-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </section>

          {ticket.status === "open" && (
            <p className="px-1 text-center text-[12px] text-muted-foreground">
              Ждём ответа команды. Пришлём пуш, как ответим.
            </p>
          )}

          {closed ? (
            <div className="space-y-3">
              <p className="px-1 text-center text-[12px] text-muted-foreground">
                Тикет закрыт — писать в него больше нельзя.
              </p>
              <Link
                to="/club/help/new"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3 text-[14px] font-semibold text-foreground active:opacity-80"
              >
                Новый тикет
              </Link>
            </div>
          ) : (
            /* Композер */
            <section className="rounded-2xl border border-white/[0.06] bg-card/40 p-3">
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((url) => (
                    <div
                      key={url}
                      className="relative h-16 w-16 overflow-hidden rounded-xl border border-white/[0.06]"
                    >
                      <img src={url} alt="Вложение" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((u) => u !== url))
                        }
                        className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white"
                        aria-label="Убрать фото"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 4000))}
                rows={3}
                placeholder="Дописать в тикет…"
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
              />

              <div className="mt-2 flex items-center justify-between">
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13px] font-medium text-muted-foreground active:opacity-60",
                    (uploading || attachments.length >= MAX_FILES) &&
                      "pointer-events-none opacity-40",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Фото
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => sendMut.mutate()}
                  disabled={!text.trim() || sendMut.isPending || uploading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground disabled:opacity-40 active:opacity-80"
                >
                  {sendMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Отправить
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isAdmin = message.authorRole === "admin";
  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        isAdmin
          ? "border-primary/20 bg-primary/[0.04]"
          : "border-white/[0.06] bg-card/40",
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        {isAdmin ? (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary font-mono text-[11px] font-bold text-primary-foreground">
            HH
          </span>
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-[11px] font-bold text-muted-foreground">
            Я
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">
            {isAdmin ? "Команда HELLHOUND" : "Вы"}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {formatDateTime(message.createdAt)}
          </div>
        </div>
      </header>

      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
        {message.body}
      </p>

      {message.attachments?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.attachments.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="h-20 w-20 overflow-hidden rounded-xl border border-white/[0.06]"
            >
              <img src={url} alt="Вложение" className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </article>
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
