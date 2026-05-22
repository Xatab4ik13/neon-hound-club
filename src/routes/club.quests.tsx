import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Flag, Sparkles, Ticket } from "lucide-react";
import {
  CATEGORY_LABEL,
  CLUB_QUESTS,
  ladderEarnedXp,
  nextLadderStep,
  questCompleted,
  questPct,
  questsSummary,
  type Quest,
  type QuestCategory,
} from "@/data/quests";

export const Route = createFileRoute("/club/quests")({
  head: () => ({
    meta: [
      { title: "Челленджи — клуб HELLHOUND" },
      {
        name: "description",
        content:
          "Челленджи клуба HELLHOUND. Выполняй задачи — получай XP и билеты, расти в ранге.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestsPage,
});

function QuestsPage() {
  const s = questsSummary(CLUB_QUESTS);
  const categories = Array.from(
    new Set(CLUB_QUESTS.map((q) => q.category)),
  ) as QuestCategory[];

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
          Челленджи клуба
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Прокачка
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Выполняй задания — получай XP и билеты. Если пройдёшь все базовые
          челленджи, окажешься на пороге ранга{" "}
          <span className="font-bold text-foreground">Road Captain</span>.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Выполнено" value={`${s.done}/${s.total}`} icon={Flag} />
          <Stat
            label="Билетов получено"
            value={`${s.ticketsEarned}`}
            icon={Ticket}
          />
          <Stat
            label="К получению"
            value={`${s.ticketsAvailable}`}
            icon={Sparkles}
          />
        </div>
      </header>

      {categories.map((cat) => {
        const items = CLUB_QUESTS.filter((q) => q.category === cat);
        return (
          <section key={cat} className="mb-10">
            <h2 className="mb-3 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
              {CATEGORY_LABEL[cat]}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((q) => (
                <QuestCard key={q.id} q={q} />
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}

function QuestCard({ q }: { q: Quest }) {
  const pct = questPct(q);
  const done = questCompleted(q);
  const earned = q.ladder ? ladderEarnedXp(q) : 0;
  const nextStep = q.ladder ? nextLadderStep(q) : null;

  return (
    <article
      className={`relative flex flex-col gap-3 border bg-card/40 p-4 transition-colors ${
        q.claimed
          ? "border-white/[0.04] opacity-60"
          : done
            ? "border-green-500/40"
            : "border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-black uppercase italic tracking-tight text-foreground">
              {q.title}
            </h3>
            {q.kind === "one-time" && (
              <span className="border border-white/[0.08] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                разовое
              </span>
            )}
            {q.bloggerOnly && (
              <span className="border border-primary/40 px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                Блогер
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{q.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1 border border-white/[0.08] bg-black/40 px-2 py-1 font-mono text-xs font-bold text-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            +{q.ladder ? `${earned}/${q.xp}` : q.xp} XP
          </div>
          {q.tickets > 0 && (
            <div className="flex items-center gap-1 border border-yellow-500/30 bg-yellow-500/10 px-2 py-1 font-mono text-[10px] font-bold text-yellow-400">
              <Ticket className="h-3 w-3" />+{q.tickets}{" "}
              {q.tickets === 1 ? "билет" : "билета"}
            </div>
          )}
          {q.bonus && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {q.bonus}
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="relative h-2 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-sm transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: done ? "rgb(74, 222, 128)" : "var(--primary)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider tabular-nums">
          <span className="text-muted-foreground">
            {q.progress}/{q.goal} {q.unit}
          </span>
          <span className="font-bold text-foreground">{pct}%</span>
        </div>

        {q.ladder && (
          <div className="mt-3 space-y-1">
            {q.ladder.map((step) => {
              const reached = q.progress >= step.at;
              return (
                <div
                  key={step.at}
                  className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider"
                >
                  <span
                    className={
                      reached ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {reached ? "✓ " : ""}
                    {step.at} вопросов
                  </span>
                  <span
                    className={
                      reached
                        ? "font-bold text-green-400"
                        : "text-muted-foreground"
                    }
                  >
                    +{step.xp} XP
                  </span>
                </div>
              );
            })}
            {nextStep && (
              <div className="pt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                до следующей ступени: {nextStep.at - q.progress} вопросов
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        {q.action ? (
          <Link
            to={q.action.to}
            className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary transition-colors hover:text-foreground"
          >
            {q.action.label} →
          </Link>
        ) : (
          <span />
        )}

        {q.claimed ? (
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-400">
            <Check className="h-3 w-3" />
            Награда получена
          </span>
        ) : done ? (
          <button
            type="button"
            className="border border-green-500/60 bg-green-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors hover:bg-green-500/20"
          >
            Забрать награду
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            В процессе
          </span>
        )}
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Flag;
}) {
  return (
    <div className="border border-white/[0.06] bg-black/30 p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
        <span className="font-display text-2xl font-black italic leading-none text-foreground tabular-nums">
          {value}
        </span>
      </div>
    </div>
  );
}
