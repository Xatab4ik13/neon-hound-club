import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Bug, Lightbulb, HelpCircle, Loader2 } from "@/components/ui/icons";
import { PageHeader } from "@/components/club/PageHeader";
import { createTicket, supportQk, type SupportCategory } from "@/lib/support-api";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/club/help/new")({
  head: () => ({
    meta: [
      { title: "Новый тикет — клуб HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewTicketPage,
});

const CATEGORIES: { value: SupportCategory; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Баг", icon: Bug },
  { value: "feature", label: "Идея", icon: Lightbulb },
  { value: "question", label: "Вопрос", icon: HelpCircle },
];

const SUBJECT_MAX = 120;
const BODY_MAX = 4000;

function NewTicketPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [category, setCategory] = useState<SupportCategory>("question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createTicket({ category, subject: subject.trim(), body: body.trim() }),
    onSuccess: (res) => {
      toast.success("Тикет отправлен");
      qc.invalidateQueries({ queryKey: ["support", "tickets"] });
      navigate({ to: "/club/help/$ticketId", params: { ticketId: res.id } });
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError ? e.message || "Не получилось" : "Не получилось";
      toast.error(msg);
    },
  });

  const disabled =
    mut.isPending ||
    subject.trim().length < 3 ||
    body.trim().length < 5 ||
    subject.length > SUBJECT_MAX ||
    body.length > BODY_MAX;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+96px)] md:max-w-3xl md:px-8 md:py-10">
      <Link
        to="/club/help"
        className="mb-3 inline-flex items-center gap-1 text-[14px] font-medium text-primary active:opacity-60"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <PageHeader title="Новый тикет" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) mut.mutate();
        }}
        className="space-y-5"
      >
        {/* Категория — segmented */}
        <section>
          <label className="mb-2 block px-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Категория
          </label>
          <div className="inline-flex w-full rounded-xl bg-card/40 p-1 border border-white/[0.06]">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground active:bg-white/[0.04]",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Тема */}
        <section>
          <label
            htmlFor="subject"
            className="mb-2 block px-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Тема
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
            placeholder="Кратко суть"
            className="w-full rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
          <div className="mt-1.5 px-1 text-right text-[11px] tabular-nums text-muted-foreground">
            {subject.length} / {SUBJECT_MAX}
          </div>
        </section>

        {/* Описание */}
        <section>
          <label
            htmlFor="body"
            className="mb-2 block px-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            Описание
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
            rows={8}
            placeholder={
              category === "bug"
                ? "Что произошло, где и как воспроизвести"
                : category === "feature"
                  ? "Что хочется и зачем"
                  : "Опиши вопрос"
            }
            className="w-full resize-none rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
          <div className="mt-1.5 px-1 text-right text-[11px] tabular-nums text-muted-foreground">
            {body.length} / {BODY_MAX}
          </div>
        </section>

        <button
          type="submit"
          disabled={disabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-[15px] font-semibold text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Отправить
        </button>

        <p className="px-1 text-center text-[12px] text-muted-foreground">
          Один тикет — один вопрос. Дополнить нельзя; будет нужно ещё — создай новый.
        </p>
      </form>
    </main>
  );
}
