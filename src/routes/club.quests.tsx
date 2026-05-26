import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  Download,
  Loader2,
  Smartphone,
  Sparkles,
  Ticket,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  CircleDashed,
} from "lucide-react";
import { useEffect, useState } from "react";
import { hhToast as toast } from "@/lib/hh-toast";
import { checkQuest, confirmPwaInstall, fetchQuests, qk, type QuestItem } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/club/quests")({
  head: () => ({
    meta: [
      { title: "Квесты — клуб HELLHOUND" },
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
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)] md:max-w-3xl md:px-8 md:py-10">
      {/* iOS large title */}
      <header className="mb-5 pt-2">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight text-foreground">
          Квесты
        </h1>
        <p className="mt-1 text-[15px] leading-snug text-muted-foreground">
          Выполняй задания — получай билеты и XP.
        </p>
      </header>

      {/* Stats row, iOS-style soft tiles */}
      <section className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Выполнено" value={`${doneCount}/${items.length || 0}`} />
        <Stat label="Получено" value={`${ticketsEarned}`} accent />
        <Stat label="Доступно" value={`${ticketsAvailable}`} />
      </section>

      <InstallAppQuest />

      {q.isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[84px] rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white/[0.04] py-14 text-center text-[14px] text-muted-foreground">
          Пока нет заданий
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((q) => (
            <QuestCard key={q.id} q={q} />
          ))}
        </div>
      )}
    </main>
  );
}

function InstallAppQuest() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone ===
          true;
      setInstalled(!!standalone);
    };
    check();
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", check);
    return () => mq?.removeEventListener?.("change", check);
  }, []);

  return (
    <Link
      to="/club/install"
      className="mb-4 block rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-white/[0.04] p-4 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center gap-3.5">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            installed
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-primary/20 text-primary"
          }`}
        >
          {installed ? (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <Smartphone className="h-5 w-5" strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
            <Download className="h-3 w-3" />
            Установи приложение
          </div>
          <p className="mt-0.5 text-[13.5px] leading-snug text-muted-foreground">
            {installed
              ? "Готово — клуб открыт из приложения."
              : "Поставь клуб на главный экран — получай пуши."}
          </p>
        </div>
        <RewardPill tickets={1} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </div>
    </Link>
  );
}

function QuestCard({ q }: { q: QuestItem }) {
  const qc = useQueryClient();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: qk.quests });
    qc.invalidateQueries({ queryKey: qk.ticketsBalance });
    qc.invalidateQueries({ queryKey: ["tickets", "history"] });
  };
  const check = useMutation({
    mutationFn: () => checkQuest(q.code),
    onSuccess: (res) => {
      if ("credited" in res && res.credited) {
        toast.success(
          res.tickets > 0
            ? `+${res.tickets} билетов · ${q.title}`
            : `+${res.xp} XP · ${q.title}`,
        );
        invalidateAll();
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
  const pct =
    q.kind === "ladder" || q.kind === "monthly"
      ? Math.min(100, Math.round((q.progress / q.goal) * 100))
      : done
        ? 100
        : 0;
  const earnedLadderXp = q.ladder
    ? q.ladder.slice(0, q.lastLadderStep).reduce((s, step) => s + step.xp, 0)
    : 0;

  const Icon =
    q.kind === "monthly"
      ? Calendar
      : q.kind === "ladder"
        ? TrendingUp
        : q.kind === "manual"
          ? ClipboardCheck
          : CircleDashed;

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-2xl p-4 transition-colors ${
        done ? "bg-white/[0.025]" : "bg-white/[0.04]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
            done
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-white/[0.06] text-foreground"
          }`}
        >
          {done ? (
            <Check className="h-5 w-5" strokeWidth={2.5} />
          ) : (
            <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className={`text-[15px] font-semibold leading-snug ${
              done ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {q.title}
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {q.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {q.ticketsReward > 0 && <RewardPill tickets={q.ticketsReward} />}
          {q.xpReward > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-medium tabular-nums text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              {q.ladder ? `${earnedLadderXp}/${q.xpReward}` : `+${q.xpReward}`} XP
            </div>
          )}
        </div>
      </div>

      {(q.kind === "monthly" || q.kind === "ladder") && (
        <div className="flex items-center gap-3 pl-[52px]">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                backgroundColor: done ? "rgb(52, 199, 89)" : "var(--primary)",
              }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {q.progress}/{q.goal}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pl-[52px]">
        {q.actionTo ? (
          <Link
            to={q.actionTo}
            className="inline-flex items-center gap-0.5 text-[13px] font-medium text-primary active:opacity-60"
          >
            {q.actionLabel ?? "Открыть"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span />
        )}

        {done ? (
          <span className="text-[12px] font-medium text-emerald-400">
            Выполнено
          </span>
        ) : q.kind === "one_time" ? (
          <button
            type="button"
            disabled={check.isPending}
            onClick={() => check.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[13px] font-semibold text-background transition-opacity active:opacity-70 disabled:opacity-60"
          >
            {check.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Проверить
          </button>
        ) : q.kind === "manual" ? (
          <span className="text-[12px] text-muted-foreground">
            Засчитывает админ
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">
            {q.kind === "monthly" ? "Автозачёт за месяц" : "Автозачёт по ступеням"}
          </span>
        )}
      </div>
    </article>
  );
}

function RewardPill({ tickets }: { tickets: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[12px] font-semibold tabular-nums text-yellow-300">
      <Ticket className="h-3 w-3" />+{tickets}
    </span>
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl px-3 py-2.5 ${
        accent ? "bg-primary/15" : "bg-white/[0.04]"
      }`}
    >
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-[20px] font-bold leading-none tabular-nums ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
