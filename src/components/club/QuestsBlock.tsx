// Компактный блок челленджей для дашборда. Реальные данные с бэка.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlumpArrowRight as ArrowRight, Flag, Sparkles, PlumpTicket } from "@/components/ui/icons";
import { fetchQuests, qk, type QuestItem } from "@/lib/queries";
import { useViewer } from "@/hooks/use-viewer";

function questPct(q: QuestItem): number {
  if (q.completed) return 100;
  if (q.kind === "monthly" || q.kind === "ladder") {
    return Math.min(100, Math.round((q.progress / Math.max(1, q.goal)) * 100));
  }
  return 0;
}

function ladderEarnedXp(q: QuestItem): number {
  if (!q.ladder) return 0;
  return q.ladder.slice(0, q.lastLadderStep).reduce((s, st) => s + st.xp, 0);
}

function pickTop(items: QuestItem[]): QuestItem[] {
  return items
    .filter((q) => !q.completed)
    .sort((a, b) => questPct(b) - questPct(a))
    .slice(0, 3);
}

export function QuestsBlock() {
  const { isAuthed } = useViewer();
  const q = useQuery({ queryKey: qk.quests, queryFn: fetchQuests, enabled: isAuthed });
  const items = q.data?.items ?? [];
  const top = pickTop(items);
  const done = items.filter((i) => i.completed).length;
  const ticketsEarned = items
    .filter((i) => i.completed)
    .reduce((s, i) => s + i.ticketsReward, 0);
  const ticketsAvailable = items
    .filter((i) => !i.completed)
    .reduce((s, i) => s + i.ticketsReward, 0);

  if (!isAuthed || items.length === 0) return null;

  return (
    <section aria-label="Челленджи клуба" className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-sm font-black uppercase  tracking-widest text-foreground">
            Челленджи клуба
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {done}/{items.length} выполнено
          </span>
        </div>
        <Link
          to="/club/quests"
          className="group flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
        >
          Все челленджи
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="border border-white/[0.06] bg-card/40">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Выполнено:{" "}
              <span className="font-bold text-foreground tabular-nums">
                {done}/{items.length}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PlumpTicket className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Билеты:{" "}
              <span className="font-bold text-foreground tabular-nums">{ticketsEarned}</span>
            </span>
          </div>
          {ticketsAvailable > 0 && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-400" strokeWidth={1.8} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-yellow-400">
                К получению:{" "}
                <span className="font-bold tabular-nums">{ticketsAvailable}</span>
              </span>
            </div>
          )}
        </div>

        <ul className="divide-y divide-white/[0.04]">
          {top.map((quest) => {
            const pct = questPct(quest);
            const earned = quest.ladder ? ladderEarnedXp(quest) : 0;
            return (
              <li
                key={quest.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-bold text-foreground">
                      {quest.title}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm transition-all"
                        style={{ width: `${pct}%`, backgroundColor: "var(--primary)" }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {quest.progress}/{quest.goal} {quest.unit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {quest.xpReward > 0 && (
                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      +{quest.ladder ? `${earned}/${quest.xpReward}` : quest.xpReward} XP
                    </div>
                  )}
                  {quest.ticketsReward > 0 && (
                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-yellow-400">
                      <PlumpTicket className="h-3 w-3" />+{quest.ticketsReward}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
