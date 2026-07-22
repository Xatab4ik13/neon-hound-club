import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  PlumpArrowRight,
  PlumpDownload,
  Loader2,
  Smartphone,
  Sparkles,
  PlumpTicket,
  Calendar,
  TrendingUp,
  ClipboardCheck,
  CircleDashed,
} from "@/components/ui/icons";
import { useEffect, useRef, useState } from "react";
import { hhToast as toast } from "@/lib/hh-toast";
import { checkQuest, confirmPwaInstall, fetchQuests, qk, type QuestItem } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";
import { ApiError } from "@/lib/api";
import { PageHeader } from "@/components/club/PageHeader";
import { PlumpNum } from "@/components/brand/PlumpNum";
import { TONE_BG, type InstructorTone } from "@/data/instructors";

export const Route = createFileRoute("/club/quests")({
  head: () => ({
    meta: [
      { title: "Квесты — клуб HELLHOUND" },
      { name: "description", content: "Задания клуба. Выполняй — получай билеты." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestsPage,
});

const CARD_TONES: InstructorTone[] = ["primary", "cyan", "lime", "violet", "yellow"];

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
    <main className="mx-auto w-full max-w-3xl px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-8">
      <PageHeader title="Квесты" subtitle="выполняй — получай билеты" />

      {/* Stats — три plump-плашки */}
      <section className="mb-6 grid grid-cols-3 gap-3">
        <StatTile label="Выполнено" value={`${doneCount}/${items.length || 0}`} tone="cyan" />
        <StatTile label="Получено" value={ticketsEarned} tone="primary" />
        <StatTile label="Доступно" value={ticketsAvailable} tone="lime" />
      </section>

      <InstallAppQuest />

      {q.isLoading ? (
        <div className="grid gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-[120px] rounded-3xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border-[3px] border-foreground bg-card px-6 py-14 text-center font-display text-lg font-black uppercase tracking-tight text-muted-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]">
          Пока нет заданий
        </div>
      ) : (
        <QuestsGrid items={items} />
      )}
    </main>
  );
}

function QuestsGrid({ items }: { items: QuestItem[] }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={gridRef} className="grid gap-5 [perspective:1000px]">
      {items.map((q, i) => (
        <QuestCard key={q.id} q={q} index={i} visible={visible} />
      ))}
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: InstructorTone;
}) {
  const isNum = typeof value === "number";
  return (
    <div
      className={`rounded-2xl border-[3px] border-foreground ${TONE_BG[tone]} px-3 py-3 shadow-[4px_4px_0_0_hsl(var(--foreground))]`}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">
        {label}
      </div>
      <div className="mt-1.5 text-black">
        {isNum ? (
          <PlumpNum value={value as number} size={22} format />
        ) : (
          <span className="font-display text-[22px] font-black leading-none tabular-nums">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

function InstallAppQuest() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
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
      className="mb-6 block -rotate-1 rounded-3xl border-[3px] border-foreground bg-[#FFD93D] p-4 text-black shadow-[8px_8px_0_0_hsl(var(--foreground))] transition-transform duration-200 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_hsl(var(--foreground))] active:scale-[0.99] md:p-5"
    >
      <div className="flex items-center gap-4">
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
            installed ? "bg-[#B6FF3C]" : "bg-card"
          }`}
        >
          {installed ? (
            <Check className="h-6 w-6 text-black" strokeWidth={3} />
          ) : (
            <Smartphone className="h-6 w-6 text-foreground" strokeWidth={2.5} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">
            <PlumpDownload className="h-3.5 w-3.5" />
            Установи приложение
          </div>
          <div className="mt-1 font-display text-lg font-black uppercase leading-tight tracking-tight text-black md:text-xl">
            {installed ? "Клуб уже в кармане" : "Клуб на главный экран"}
          </div>
        </div>

        <PlumpRewardChip tickets={1} />
        <PlumpArrowRight className="h-5 w-5 shrink-0 text-black" />
      </div>
    </Link>
  );
}

function QuestCard({
  q,
  index,
  visible,
}: {
  q: QuestItem;
  index: number;
  visible: boolean;
}) {
  const qc = useQueryClient();
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: qk.quests });
    qc.invalidateQueries({ queryKey: qk.ticketsBalance });
    qc.invalidateQueries({ queryKey: ["tickets", "history"] });
  };
  const isPwaInstallQuest = q.code === "pwa_install";

  const check = useMutation({
    mutationFn: async () => {
      if (isPwaInstallQuest) {
        const standalone =
          typeof window !== "undefined" &&
          (window.matchMedia?.("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
        if (!standalone) {
          throw new ApiError(
            400,
            "not_standalone",
            "Открой клуб из установленного приложения, чтобы засчитать квест.",
          );
        }
        return confirmPwaInstall();
      }
      return checkQuest(q.code);
    },
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

  const tone = CARD_TONES[index % CARD_TONES.length];
  const iconBg = done ? "bg-[#B6FF3C]" : TONE_BG[tone];

  return (
    <article
      className={`skill-card relative rounded-3xl border-[3px] border-foreground bg-card p-5 shadow-[6px_6px_0_0_hsl(var(--foreground))] ${
        done ? "opacity-70" : ""
      } ${visible ? "skill-card--in" : "skill-card--pre"}`}
      style={{
        animationDelay: visible ? `${index * 70}ms` : "0ms",
        willChange: "transform, opacity",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground ${iconBg} shadow-[3px_3px_0_0_hsl(var(--foreground))]`}
        >
          {done ? (
            <Check className="h-5 w-5 text-foreground" strokeWidth={3} />
          ) : (
            <Icon className="h-5 w-5 text-foreground" strokeWidth={2.5} />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h3
            className={`font-display text-lg font-black uppercase leading-tight tracking-tight text-foreground md:text-xl ${
              done ? "line-through decoration-2" : ""
            }`}
          >
            {q.title}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-snug text-muted-foreground">
            {q.description}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {q.ticketsReward > 0 && <PlumpRewardChip tickets={q.ticketsReward} />}
          {q.xpReward > 0 && (
            <div className="inline-flex items-center gap-1 rounded-full border-2 border-foreground/50 bg-background px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
              <Sparkles className="h-3 w-3" />
              {q.ladder ? `${earnedLadderXp}/${q.xpReward}` : `+${q.xpReward}`} XP
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(q.kind === "monthly" || q.kind === "ladder") && (
        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-3 flex-1 overflow-hidden rounded-full border-[3px] border-foreground bg-background">
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
              style={{
                width: `${pct}%`,
                backgroundColor: done ? "#B6FF3C" : "hsl(var(--foreground))",
              }}
            />
          </div>
          <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-foreground">
            {q.progress}/{q.goal}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {q.actionTo ? (
          <Link
            to={q.actionTo}
            className="inline-flex items-center gap-1 rounded-full border-[3px] border-foreground bg-card px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
          >
            {q.actionLabel ?? "Открыть"}
            <PlumpArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span />
        )}

        {done ? (
          <span className="font-display text-[11px] font-black uppercase tracking-widest text-foreground">
            Выполнено
          </span>
        ) : q.kind === "one_time" ? (
          <button
            type="button"
            disabled={check.isPending}
            onClick={() => check.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-foreground bg-foreground px-4 py-2 font-display text-[11px] font-black uppercase tracking-widest text-background shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:opacity-60"
          >
            {check.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Проверить
          </button>
        ) : q.kind === "manual" ? (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground/70">
            Засчитывает админ
          </span>
        ) : (
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-foreground/70">
            {q.kind === "monthly" ? "Автозачёт за месяц" : "Автозачёт по ступеням"}
          </span>
        )}
      </div>
    </article>
  );
}

function PlumpRewardChip({ tickets }: { tickets: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border-[3px] border-foreground bg-[#FFD93D] px-2.5 py-0.5 font-display text-[12px] font-black uppercase tracking-widest text-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))]">
      <PlumpTicket className="h-3.5 w-3.5" />+{tickets}
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
