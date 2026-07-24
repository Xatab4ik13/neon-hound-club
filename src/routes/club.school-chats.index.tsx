// Список чатов инструктора + таб «Заказы» с оплаченными счетами и суммой
// заработка. Выплаты еженедельные, поэтому считаем «за неделю» и «всего».

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useMockInstructorRole } from "@/hooks/use-instructor-mock-role";
import { getInstructorAccount } from "@/data/instructor-accounts";
import {
  useInstructorThreadsList,
  type InstructorThread,
  type InvoicePayload,
} from "@/data/instructor-chats-mock";

export const Route = createFileRoute("/club/school-chats/")({
  head: () => ({
    meta: [
      { title: "Школа — чаты" },
      { name: "description", content: "Чаты инструктора с учениками." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchoolChatsList,
});

function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  if (same) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const yst = new Date();
  yst.setDate(now.getDate() - 1);
  if (d.toDateString() === yst.toDateString()) return "Вчера";
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function Avatar({ nick }: { nick: string }) {
  const initial = nick.slice(0, 1).toUpperCase();
  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display text-lg font-black uppercase tracking-tight text-black">
      {initial}
    </div>
  );
}

type PaidOrder = {
  invoice: InvoicePayload;
  studentNick: string;
  studentUserId: string;
};

function collectOrders(threads: InstructorThread[]): PaidOrder[] {
  const out: PaidOrder[] = [];
  for (const t of threads) {
    for (const m of t.messages) {
      if (m.invoice) {
        out.push({
          invoice: m.invoice,
          studentNick: t.studentNick,
          studentUserId: t.studentUserId,
        });
      }
    }
  }
  out.sort((a, b) => (b.invoice.paidAt ?? 0) - (a.invoice.paidAt ?? 0));
  return out;
}

function formatLessonDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function SchoolChatsList() {
  const slug = useMockInstructorRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"chats" | "orders">("chats");
  const threads = useInstructorThreadsList(slug ?? "");
  const account = slug ? getInstructorAccount(slug) : undefined;

  useEffect(() => {
    if (!slug) navigate({ to: "/club", replace: true });
  }, [slug, navigate]);

  const orders = useMemo(() => collectPaidOrders(threads), [threads]);

  const { total, weekTotal } = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    let total = 0;
    let weekTotal = 0;
    for (const o of orders) {
      total += o.invoice.amount;
      if ((o.invoice.paidAt ?? 0) >= weekAgo) weekTotal += o.invoice.amount;
    }
    return { total, weekTotal };
  }, [orders]);

  if (!slug || !account) return null;

  return (
    <div className="min-h-full bg-[#0a0a0a] pb-4">
      <div className="mx-auto max-w-[720px]">
        <div className="px-4 pb-3 pt-4">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
            Школа
          </h1>
        </div>

        {/* Tumbler */}
        <div className="px-4 pb-3">
          <div className="flex rounded-2xl border border-white/[0.08] bg-black/60 p-1">
            <button
              type="button"
              onClick={() => setTab("chats")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 font-display text-[13px] font-black uppercase tracking-tight transition-colors",
                tab === "chats"
                  ? "bg-primary text-black"
                  : "text-muted-foreground",
              )}
            >
              Чаты
            </button>
            <button
              type="button"
              onClick={() => setTab("orders")}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 font-display text-[13px] font-black uppercase tracking-tight transition-colors",
                tab === "orders"
                  ? "bg-primary text-black"
                  : "text-muted-foreground",
              )}
            >
              Заказы
            </button>
          </div>
        </div>

        {tab === "chats" && (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
            {threads.length === 0 && (
              <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                Пока нет чатов
              </li>
            )}
            {threads.map((t) => {
              const last = t.messages.at(-1);
              const isMine = last?.senderRole === "instructor";
              return (
                <li key={t.studentUserId}>
                  <Link
                    to="/club/school-chats/$studentId"
                    params={{ studentId: t.studentUserId }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                  >
                    <Avatar nick={t.studentNick} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                          {t.studentNick}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {last ? formatWhen(last.createdAt) : ""}
                        </span>
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={cn(
                            "truncate text-[13px] block",
                            isMine ? "text-muted-foreground" : "text-foreground/80",
                          )}
                        >
                          {last?.invoice
                            ? `Счёт · ${formatRub(last.invoice.amount)}`
                            : (last?.text ?? "…")}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "orders" && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 px-4 pb-3">
              <div className="rounded-2xl border border-white/[0.08] bg-black/60 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  За неделю
                </div>
                <div className="mt-1 font-display text-2xl font-black tracking-tight text-primary">
                  {formatRub(weekTotal)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Выплата в конце недели
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/60 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Всего
                </div>
                <div className="mt-1 font-display text-2xl font-black tracking-tight text-foreground">
                  {formatRub(total)}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Оплачено учениками
                </div>
              </div>
            </div>

            <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06] bg-black/40">
              {orders.length === 0 && (
                <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">
                  Оплаченных заказов пока нет
                </li>
              )}
              {orders.map((o) => (
                <li key={o.invoice.id}>
                  <Link
                    to="/club/school-chats/$studentId"
                    params={{ studentId: o.studentUserId }}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-white/[0.04]"
                  >
                    <Avatar nick={o.studentNick} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[15px] font-black uppercase tracking-tight text-foreground">
                          {o.studentNick}
                        </span>
                        <span className="ml-auto shrink-0 font-display text-[15px] font-black tracking-tight text-primary">
                          {formatRub(o.invoice.amount)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[13px] text-foreground/80">
                          {o.invoice.description || `${o.invoice.hours} ч занятия`}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {o.invoice.paidAt ? formatWhen(o.invoice.paidAt) : ""}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
