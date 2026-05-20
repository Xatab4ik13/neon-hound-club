import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Flag, Lock, Ticket } from "lucide-react";
import {
  CATEGORY_LABEL,
  CURRENT_SEASON,
  questCompleted,
  questPct,
  seasonSummary,
} from "@/data/quests";
import { Countdown } from "@/components/club/Countdown";

export const Route = createFileRoute("/club/quests")({
  head: () => ({
    meta: [
      { title: "Челленджи — клуб HELLHOUND" },
      {
        name: "description",
        content: "Сезонные задачи клуба HELLHOUND. Бери, выполняй, получай билеты.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestsPage,
});

function QuestsPage() {
  const s = seasonSummary(CURRENT_SEASON);
  const categories = Array.from(
    new Set(CURRENT_SEASON.quests.map((q) => q.category)),
  );

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
          Сезон · {CURRENT_SEASON.label}
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Челленджи месяца
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Каждый месяц — новый набор задач. Выполняешь — получаешь билеты.
          Не успел — следующий сезон обнулит прогресс.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Stat label="Выполнено" value={`${s.done}/${s.total}`} icon={Flag} />
          <Stat
            label="Билетов заработано"
            value={String(s.ticketsEarned)}
            icon={Ticket}
          />
          <div className="border border-white/[0.06] bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Сезон закроется через
            </div>
            <div className="mt-2">
              <Countdown deadlineAt={CURRENT_SEASON.endsAt} variant="tactical" />
            </div>
          </div>
        </div>
      </header>

      {categories.map((cat) => {
        const items = CURRENT_SEASON.quests.filter((q) => q.category === cat);
        return (
          <section key={cat} className="mb-10">
            <h2 className="mb-3 font-display text-sm font-black uppercase italic tracking-widest text-foreground">
              {CATEGORY_LABEL[cat]}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((q) => {
                const pct = questPct(q);
                const done = questCompleted(q);
                return (
                  <article
                    key={q.id}
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
                        <h3 className="font-display text-base font-black uppercase italic tracking-tight text-foreground">
                          {q.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {q.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <div className="flex items-center gap-1 border border-white/[0.08] bg-black/40 px-2 py-1 font-mono text-xs font-bold text-foreground">
                          <Ticket className="h-3 w-3 text-primary" />
                          +{q.reward}
                        </div>
                        {q.bonus && (
                          <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
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
                            backgroundColor: done
                              ? "rgb(74, 222, 128)"
                              : "var(--primary)",
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider tabular-nums">
                        <span className="text-muted-foreground">
                          {q.progress}/{q.goal} {q.unit}
                        </span>
                        <span className="font-bold text-foreground">{pct}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {q.requiresPass ? (
                        <span className="inline-flex items-center gap-1 border border-yellow-500/40 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                          <Lock className="h-3 w-3" />
                          Hell Pass {q.requiresPass}
                        </span>
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
                          Забрать +{q.reward}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          В процессе
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
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
