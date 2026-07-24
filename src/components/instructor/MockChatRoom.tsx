// Общий UI чат-комнаты для мок-переписок «инструктор ↔ ученик».
// Стиль плитки идентичен VIP-чату: салатовые баблы «мои», белые — «чужие»,
// dot-grid фон, композер как в комментариях. Только текст (без стикеров/фото)
// — достаточно, чтобы посмотреть, как всё будет работать.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Send, Receipt } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";
import { useKeyboardOffset } from "@/hooks/use-keyboard-offset";
import type { InstructorMsg, InvoicePayload } from "@/data/instructor-chats-mock";
import { invoiceTotalForStudent } from "@/data/instructor-chats-mock";
import {
  InvoiceComposer,
  PayInvoiceSheet,
  type InvoiceDraft,
} from "@/components/instructor/InvoiceComposer";

const MAX_LEN = 2000;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yst = new Date();
  yst.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (same(d, today)) return "СЕГОДНЯ";
  if (same(d, yst)) return "ВЧЕРА";
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long" }).toUpperCase();
}

function Avatar({ label, size = 44 }: { label: string; size?: number }) {
  const initial = label.slice(0, 1).toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/70 to-primary/30 font-display font-black uppercase tracking-tight text-black"
      style={{ height: size, width: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

export type MockChatRoomProps = {
  messages: InstructorMsg[];
  /** Роль текущего пользователя в переписке — определяет какие сообщения справа/салатовые. */
  myRole: "instructor" | "student";
  /** Ник собеседника для placeholder и аватарки. */
  peerLabel: string;
  /** Высота чата — рассчитывается снаружи (варьируется от контейнера). */
  height: string;
  onSend: (text: string) => void;
  /** Инструктор → отправка счёта. Если не передан, кнопка счёта скрыта. */
  onSendInvoice?: (draft: InvoiceDraft) => void;
  /** Ученик → оплата счёта. */
  onPayInvoice?: (invoiceId: string, payer: { name: string; email: string; phone: string }) => void;
  /** Дополнительный контент над лентой (например, локальный заголовок). */
  header?: React.ReactNode;
};

export function MockChatRoom({
  messages,
  myRole,
  peerLabel,
  height,
  onSend,
  onSendInvoice,
  onPayInvoice,
  header,
}: MockChatRoomProps) {
  const [text, setText] = useState("");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [payInvoice, setPayInvoice] = useState<InvoicePayload | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOffset = useKeyboardOffset();

  // Анимация — только для сообщений, появившихся в текущей сессии.
  const initialIdsRef = useRef<Set<string> | null>(null);
  if (initialIdsRef.current === null) {
    initialIdsRef.current = new Set(messages.map((m) => m.id));
  }

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 5 * 22 + 12)}px`;
  }, [text]);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0;
  const overLimit = text.length > MAX_LEN;

  const send = () => {
    if (!canSend || overLimit) return;
    haptic("light");
    onSend(trimmed);
    setText("");
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const groups = useMemo(() => {
    const out: { day: string; items: InstructorMsg[] }[] = [];
    for (const m of messages) {
      const day = formatDay(m.createdAt);
      const last = out[out.length - 1];
      if (!last || last.day !== day) out.push({ day, items: [m] });
      else last.items.push(m);
    }
    return out;
  }, [messages]);

  // Клавиатура — уменьшаем высоту сцены на её оффсет.
  const scenicHeight =
    keyboardOffset > 0 ? `calc(${height} - ${keyboardOffset}px)` : height;

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden bg-[#0a0a0a]"
      style={{ height: scenicHeight }}
    >
      {header}
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4"
        style={{
          backgroundImage: "radial-gradient(#1a1a1a 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          paddingBottom: 16,
        }}
      >
        <div className="mx-auto flex max-w-[640px] flex-col gap-6">
          {groups.map((g, gi) => (
            <div key={gi} className="flex flex-col gap-4">
              <div className="flex justify-center">
                <span className="rounded-full bg-white/[0.06] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/60">
                  {g.day}
                </span>
              </div>

              {g.items.map((m, mi) => {
                const isNew = !initialIdsRef.current?.has(m.id);

                if (m.senderRole === "system") {
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex justify-center",
                        isNew && "vip-message-live",
                      )}
                    >
                      <span className="rounded-full bg-white/[0.06] px-3 py-1 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-white/70">
                        {m.text}
                      </span>
                    </div>
                  );
                }

                const isMine = m.senderRole === myRole;
                const prev = mi > 0 ? g.items[mi - 1] : null;
                const showAvatar =
                  !isMine && (!prev || prev.senderRole === myRole || prev.senderRole === "system");
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-end gap-2",
                      isMine ? "justify-end" : "justify-start",
                    )}
                  >
                    {!isMine && (
                      <div
                        className={cn(
                          "shrink-0",
                          showAvatar ? "opacity-100" : "invisible",
                        )}
                      >
                        <Avatar label={peerLabel} size={44} />
                      </div>
                    )}
                    <div
                      className={cn(
                        "flex max-w-[78%] flex-col",
                        isMine ? "items-end" : "items-start",
                        isNew && "vip-message-live",
                        isNew && (isMine ? "vip-message-live--right" : "vip-message-live--left"),
                      )}
                    >
                      {m.invoice ? (
                        <InvoiceCard
                          invoice={m.invoice}
                          viewer={myRole}
                          onPay={
                            myRole === "student" && onPayInvoice
                              ? () => setPayInvoice(m.invoice!)
                              : undefined
                          }
                        />
                      ) : (
                        <div
                          className={cn(
                            "relative select-text rounded-2xl px-3 py-2",
                            isMine ? "rounded-br-md" : "rounded-bl-md",
                          )}
                          style={{ backgroundColor: isMine ? "#B6FF3C" : "#ffffff" }}
                        >
                          {m.text && (
                            <p className="whitespace-pre-wrap break-words font-display text-[14px] font-bold leading-snug tracking-tight text-black">
                              {m.text}
                            </p>
                          )}
                        </div>
                      )}
                      <span className="mt-1 px-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="mt-16 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Напиши {peerLabel} первое сообщение
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] bg-black/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 px-3 py-2.5"
        >
          {onSendInvoice && (
            <button
              type="button"
              onClick={() => {
                haptic("light");
                setInvoiceOpen(true);
              }}
              aria-label="Выставить счёт"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#B6FF3C]/40 bg-[#B6FF3C]/10 text-[#B6FF3C] transition-transform active:scale-95"
            >
              <Receipt size={18} strokeWidth={2.25} />
            </button>
          )}
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-white/[0.08] bg-black/60 pl-3 pr-1 py-1 focus-within:border-[#B6FF3C]/60 focus-within:shadow-[0_0_0_3px_rgba(182,255,60,0.10)]">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={`Написать ${peerLabel}…`}
              className="min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-[22px] text-foreground placeholder:text-muted-foreground/60 outline-none"
              style={{ maxHeight: 5 * 22 + 12 }}
            />
            {text.length >= 1600 && (
              <span
                className={cn(
                  "mb-1.5 shrink-0 self-end font-mono text-[10px] tabular-nums",
                  overLimit ? "text-destructive" : "text-muted-foreground/60",
                )}
                aria-live="polite"
              >
                {MAX_LEN - text.length}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSend || overLimit}
            aria-label="Отправить"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#B6FF3C] text-black transition-transform active:scale-95 disabled:opacity-40"
          >
            <Send size={18} strokeWidth={2} className="-translate-x-[1px]" />
          </button>
        </form>
      </div>

      {onSendInvoice && (
        <InvoiceComposer
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          onSubmit={(draft) => onSendInvoice(draft)}
        />
      )}
      {onPayInvoice && (
        <PayInvoiceSheet
          open={!!payInvoice}
          onOpenChange={(v) => {
            if (!v) setPayInvoice(null);
          }}
          amountTotal={payInvoice ? invoiceTotalForStudent(payInvoice.amount) : 0}
          onSubmit={(payer) => {
            if (payInvoice) onPayInvoice(payInvoice.id, payer);
            setPayInvoice(null);
          }}
        />
      )}
    </div>
  );
}

function InvoiceCard({
  invoice,
  viewer,
  onPay,
}: {
  invoice: InvoicePayload;
  viewer: "instructor" | "student";
  onPay?: () => void;
}) {
  const paid = invoice.status === "paid";
  const total = invoiceTotalForStudent(invoice.amount);
  const shown = viewer === "student" ? total : invoice.amount;
  const when = new Date(invoice.dateTime).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="w-[280px] max-w-full overflow-hidden rounded-2xl border border-[#B6FF3C]/30 bg-white text-black shadow-[0_8px_24px_-12px_rgba(182,255,60,0.35)]">
      <div className="flex items-center justify-between bg-[#B6FF3C] px-3 py-1.5">
        <span className="font-display text-[11px] font-black uppercase tracking-widest text-black">
          Счёт
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/70">
          {paid ? "Оплачено" : "К оплате"}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-3 py-3">
        <div className="font-display text-[22px] font-black leading-none tracking-tight text-black">
          {shown.toLocaleString("ru-RU")} ₽
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black/60">
          <span>{invoice.duration}</span>
          <span>{when}</span>
        </div>
        <p className="font-display text-[13px] font-bold leading-snug tracking-tight text-black/80">
          {invoice.description}
        </p>
        {viewer === "student" && !paid && onPay && (
          <button
            type="button"
            onClick={onPay}
            className="mt-1 rounded-xl bg-black px-3 py-2 font-display text-[13px] font-black uppercase tracking-tight text-[#B6FF3C] transition-transform active:scale-95"
          >
            Оплатить {total.toLocaleString("ru-RU")} ₽
          </button>
        )}
        {viewer === "instructor" && !paid && (
          <div className="mt-1 rounded-xl bg-black/5 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-black/50">
            Ожидает оплаты
          </div>
        )}
        {paid && (
          <div className="mt-1 rounded-xl bg-black/90 px-3 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[#B6FF3C]">
            Оплачено ✓
          </div>
        )}
      </div>
    </div>
  );
}
