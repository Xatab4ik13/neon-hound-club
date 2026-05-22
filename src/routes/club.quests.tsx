import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { checkQuest, fetchQuests, qk, type QuestItem } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/club/quests")({
  head: () => ({
    meta: [
      { title: "Задания — клуб HELLHOUND" },
      {
        name: "description",
        content: "Задания клуба. Выполняй — получай билеты.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestsPage,
});

function QuestsPage() {
  const { isAuthed } = useViewer();
  const q = useQuery({
    queryKey: qk.quests,
    queryFn: fetchQuests,
    enabled: isAuthed,
  });

  const items = q.data?.items ?? [];
  const doneCount = items.filter((i) => i.completed).length;
  const ticketsEarned = items
    .filter((i) => i.completed)
    .reduce((sum, i) => sum + i.ticketsReward, 0);
  const ticketsAvailable = items
    .filter((i) => !i.completed)
    .reduce((sum, i) => sum + i.ticketsReward, 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
      <Link
        to="/club/me"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        В профиль
      </Link>

      <header className="mb-8 border border-white/[0.06] bg-card/40 p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Задания клуба
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Прокачка
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Выполняй задания клуба — получай билеты. Часть заданий зачитывается
          автоматически, часть проверяется по кнопке.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Выполнено" value={`${doneCount}/${items.length}`} />
          <Stat label="Билетов получено" value={`${ticketsEarned}`} />
          <Stat label="Можно получить" value={`${ticketsAvailable}`} />
        </div>
      </header>

      {q.isLoading ? (
        <div className="py-20 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          загрузка…
        </div>
      ) : items.length === 0 ? (
        <div className="border border-white/[0.06] bg-card/40 py-16 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          пока нет заданий
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((q) => (
            <QuestCard key={q.id} q={q} />
          ))}
        </div>
      )}
    </main>
  );
}

function QuestCard({ q }: { q: QuestItem }) {
  const qc = useQueryClient();
  const check = useMutation({
    mutationFn: () => checkQuest(q.code),
    onSuccess: (res) => {
      if ("credited" in res && res.credited) {
        toast.success(`+${res.tickets} билетов · ${q.title}`);
        qc.invalidateQueries({ queryKey: qk.quests });
        qc.invalidateQueries({ queryKey: qk.ticketsBalance });
        qc.invalidateQueries({ queryKey: ["tickets", "history"] });
      } else {
        const reason = (res as { reason?: string }).reason ?? "condition_not_met";
        toast.info(reasonLabel(reason));
      }
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Не удалось проверить квест";
      toast.error(msg);
    },
  });

  const done = q.completed;

  return (
    <article
      className={`relative flex flex-col gap-3 border bg-card/40 p-4 transition-colors ${
        done
          ? "border-green-500/40 opacity-80"
          : "border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-black uppercase italic tracking-tight text-foreground">
              {q.title}
            </h3>
            {q.kind === "manual" && (
              <span className="border border-white/[0.08] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                ручное
              </span>
            )}
            {q.repeatable && (
              <span className="border border-primary/40 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                повторяемое
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{q.description}</p>
        </div>
        {q.ticketsReward > 0 && (
          <div className="flex shrink-0 items-center gap-1 border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 font-mono text-xs font-bold text-yellow-400">
            <Ticket className="h-3 w-3" />+{q.ticketsReward}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {done ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-400">
            <Check className="h-3 w-3" />
            Выполнено
          </span>
        ) : q.kind === "auto" ? (
          <button
            type="button"
            disabled={check.isPending}
            onClick={() => check.mutate()}
            className="inline-flex items-center gap-1 border border-primary/60 bg-primary/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
          >
            {check.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            Проверить
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Засчитывает админ
          </span>
        )}
      </div>
    </article>
  );
}

function reasonLabel(reason: string): string {
  switch (reason) {
    case "condition_not_met":
      return "Условие пока не выполнено";
    case "already_completed":
      return "Квест уже засчитан";
    case "quest_inactive":
      return "Квест неактивен";
    default:
      return "Не удалось засчитать";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/[0.06] bg-black/30 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-black italic leading-none text-foreground tabular-nums">
        {value}
      </div>
    </div>
  );
}
