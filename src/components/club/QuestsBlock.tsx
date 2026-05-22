// Компактный блок челленджей для дашборда. Показывает summary + 3 ближайших.
// Использует новую модель Quest с раздельными XP и билетами.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Flag, Sparkles, Ticket } from "lucide-react";
import {
  CURRENT_SEASON,
  ladderEarnedXp,
  questCompleted,
  questPct,
  seasonSummary,
  type Quest,
} from "@/data/quests";

function pickTop(quests: Quest[]) {
  const open = quests
    .filter((q) => !q.claimed && !q.bloggerOnly)
    .sort((a, b) => {
      const da = questCompleted(a) ? -1 : 0;
      const db = questCompleted(b) ? -1 : 0;
      if (da !== db) return da - db;
      return questPct(b) - questPct(a);
    });
  return open.slice(0, 3);
}

export function QuestsBlock() {
  const top = pickTop(CURRENT_SEASON.quests);
  const s = seasonSummary(CURRENT_SEASON);

  return (
    <section aria-label="Челленджи клуба" className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
            Челленджи · {CURRENT_SEASON.label}
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {s.done}/{s.total} выполнено
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
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Опыт:{" "}
              <span className="font-bold text-foreground tabular-nums">
                +{s.xpEarned}
              </span>{" "}
              XP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" strokeWidth={1.8} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Билеты:{" "}
              <span className="font-bold text-foreground tabular-nums">
                {s.ticketsEarned}
              </span>
            </span>
          </div>
          {s.ticketsAvailable > 0 && (
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-yellow-400" strokeWidth={1.8} />
              <span className="font-mono text-[11px] uppercase tracking-wider text-yellow-400">
                К получению:{" "}
                <span className="font-bold tabular-nums">{s.ticketsAvailable}</span>
              </span>
            </div>
          )}
        </div>

        <ul className="divide-y divide-white/[0.04]">
          {top.map((q) => {
            const pct = questPct(q);
            const done = questCompleted(q);
            const earned = q.ladder ? ladderEarnedXp(q) : 0;
            return (
              <li
                key={q.id}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-bold text-foreground">
                      {q.title}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: done
                            ? "rgb(74, 222, 128)"
                            : "var(--primary)",
                        }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {q.progress}/{q.goal} {q.unit}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    +{q.ladder ? `${earned}/${q.xp}` : q.xp} XP
                  </div>
                  {q.tickets > 0 && (
                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-yellow-400">
                      <Ticket className="h-3 w-3" />+{q.tickets}
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
