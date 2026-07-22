import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlumpArrowLeft as ArrowLeft, Calendar, Check, Minus, Plus, PlumpTicket, Trophy, Zap } from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";

import { Countdown } from "@/components/club/Countdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { useViewer } from "@/hooks/use-viewer";
import {
  enterRaffle,
  fetchRaffle,
  fetchTicketsBalance,
  qk,
  type RaffleDetail,
} from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { hhToast as toast } from "@/lib/hh-toast";

export const Route = createFileRoute("/club/raffles/$raffleId")({
  head: () => ({
    meta: [
      { title: "Розыгрыш · HELLHOUND" },
      { name: "description", content: "Розыгрыш клуба HELLHOUND Racing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RaffleDetailPage,
});

function NotFound() {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="font-display text-3xl font-black uppercase italic text-foreground">
        Розыгрыш не найден
      </h1>
      <Link
        to="/club/raffles"
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 font-mono text-xs uppercase tracking-wider text-primary active:scale-95"
      >
        <ArrowLeft className="h-3 w-3" />к розыгрышам
      </Link>
    </div>
  );
}

function RaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const { isAuthed, phoneVerified } = useViewer();

  const raffleQ = useQuery({
    queryKey: qk.raffle(raffleId),
    queryFn: () => fetchRaffle(raffleId),
    retry: false,
  });

  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
  });

  if (raffleQ.isLoading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="skeleton-shimmer h-64 rounded-2xl" />
      </main>
    );
  }
  if (raffleQ.isError || !raffleQ.data) return <NotFound />;

  return (
    <RaffleDetailContent
      raffle={raffleQ.data}
      balance={balanceQ.data?.balance ?? 0}
      isAuthed={isAuthed}
      phoneVerified={phoneVerified}
    />
  );
}

function formatDeadline(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function pluralRu(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const ENTER_ERRORS: Record<string, string> = {
  insufficient_tickets: "Не хватает билетов",
  limit_reached: "Достигнут лимит заявок",
  not_active: "Розыгрыш не активен",
  not_started: "Розыгрыш ещё не начался",
  ended: "Розыгрыш закончился",
  not_found: "Розыгрыш не найден",
  phone_required: "Укажи номер телефона в профиле — без него участвовать нельзя",
  phone_taken: "Этот номер уже привязан к другому аккаунту",
};


function RaffleDetailContent({
  raffle,
  balance,
  isAuthed,
  phoneVerified,
}: {
  raffle: RaffleDetail;
  balance: number;
  isAuthed: boolean;
  phoneVerified: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stake, setStake] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const finished = raffle.status === "finished";
  const phoneRequired = isAuthed && !phoneVerified;

  const enterMut = useMutation({
    mutationFn: async () => {
      // N последовательных заявок (каждая = 1 билет = ticketCost)
      let lastBalance = balance;
      for (let i = 0; i < stake; i++) {
        const r = await enterRaffle(raffle.id);
        lastBalance = r.balance;
      }
      return lastBalance;
    },
    onSuccess: () => {
      setFlash(`Поставлено ×${stake}`);
      setStake(0);
      qc.invalidateQueries({ queryKey: qk.raffle(raffle.id) });
      qc.invalidateQueries({ queryKey: qk.ticketsBalance });
      qc.invalidateQueries({ queryKey: qk.ticketsHistory() });
      qc.invalidateQueries({ queryKey: qk.myRaffles });
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        toast.error(ENTER_ERRORS[e.code] ?? "Не удалось участвовать");
        // phone_required не должен сюда долетать — баннер блокирует кнопку.
        // Но если бэк всё же отдал — мягко ведём в профиль.
        if (e.code === "phone_required") navigate({ to: "/club/me" });
      } else {
        toast.error("Не удалось участвовать");
      }
    },
  });

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 2000);
    return () => clearTimeout(id);
  }, [flash]);

  const handleStake = () => {
    if (!isAuthed) {
      navigate({ to: "/login" });
      return;
    }
    if (stake <= 0 || stake * raffle.ticketCost > balance) return;
    enterMut.mutate();
  };

  // максимум сколько заявок юзер может купить за текущий баланс
  const maxByBalance = Math.floor(balance / raffle.ticketCost);
  // c учётом лимита
  const remainingByLimit =
    raffle.maxEntriesPerUser != null
      ? Math.max(0, raffle.maxEntriesPerUser - raffle.myEntries)
      : Infinity;
  const maxStake = Math.min(maxByBalance, remainingByLimit);

  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-5 md:py-8">
      <Link
        to="/club/raffles"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground active:opacity-60"
      >
        <ArrowLeft className="h-3.5 w-3.5" />к розыгрышам
      </Link>

      {flash && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-black/85 px-4 py-2 font-mono text-[12px] uppercase tracking-wider text-emerald-300 shadow-lg backdrop-blur">
          <Check className="mr-1.5 inline h-3.5 w-3.5" />
          {flash}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-card/40">
        <div className="relative aspect-[16/10] overflow-hidden bg-black">
          {raffle.imageUrl && (
            <img
              src={raffle.imageUrl}
              alt={raffle.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span
            className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider ${
              finished
                ? "bg-white/10 text-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {!finished && <span className="h-1 w-1 animate-pulse rounded-full bg-white" />}
            {finished ? "Завершён" : "Идёт"}
          </span>
        </div>
      </div>

      <section className="mt-5">
        <h1 className="font-display text-3xl font-black uppercase italic leading-tight tracking-tight text-foreground md:text-4xl">
          {raffle.title}
        </h1>
        {raffle.prize && (
          <p className="mt-1.5 text-[14px] text-muted-foreground">{raffle.prize}</p>
        )}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-primary">
          <Calendar className="h-3 w-3" />
          до {formatDeadline(raffle.endsAt)}
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2">
        <StatTile
          label="Мои билеты"
          value={
            <span className="flex items-baseline gap-1.5">
              <PlumpTicket className="h-4 w-4 self-center text-primary" />
              <span className="tabular-nums">{raffle.myEntries}</span>
            </span>
          }
        />
        <StatTile
          label={finished ? "Всего заявок" : "До закрытия"}
          value={
            finished ? (
              <span className="tabular-nums">{raffle.totalEntries}</span>
            ) : (
              <Countdown deadlineAt={raffle.endsAt} compact />
            )
          }
        />
      </section>

      {finished && raffle.winnerNick && (
        <section className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] px-4 py-3">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Победитель
            </div>
            <div className="truncate font-display text-lg font-black italic text-foreground">
              @{raffle.winnerNick}
            </div>
          </div>
        </section>
      )}

      {raffle.description && (
        <section className="mt-6 space-y-3.5 text-[15px] leading-relaxed">
          {raffle.description.split(/\n\n+/).map((p, i) => (
            <p key={i} className="whitespace-pre-line text-foreground/85">
              {p}
            </p>
          ))}
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
        <h2 className="font-display text-[13px] font-black uppercase italic tracking-wider text-foreground">
          Условия участия
        </h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
          Стимулирующее мероприятие в порядке ст. 9 ФЗ-38 «О рекламе». Участие
          возможно без покупок — билеты выдаются за активность в клубе. НДФЛ с
          призов платит организатор. К участию допускаются лица 18+ из РФ и стран
          СНГ.
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
          <Link
            to="/club/legal/promo-rules"
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Полные правила →
          </Link>
          <Link
            to="/club/legal/requisites"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Организатор
          </Link>
          <Link
            to="/club/legal/privacy"
            className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Персональные данные
          </Link>
        </div>
      </section>

      {!finished && isMobile && <div aria-hidden className="h-56" />}

      {!finished && !isMobile && (
        <section className="mt-8 pb-8">
          <div className="rounded-2xl border border-white/[0.08] bg-card/60 p-4 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur-md">
            <StakeControls
              ticketCost={raffle.ticketCost}
              balance={balance}
              stake={stake}
              maxStake={maxStake}
              isAuthed={isAuthed}
              phoneRequired={phoneRequired}
              isPending={enterMut.isPending}
              onStakeChange={(v) => setStake(Math.max(0, Math.min(maxStake, v)))}
              onStake={handleStake}
            />
          </div>
        </section>
      )}

      {!finished && isMobile && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 z-[60] border-t border-white/[0.08] bg-[#0d0d0d]/95 backdrop-blur-xl"
            style={{
              bottom: "calc(64px + env(safe-area-inset-bottom))",
              paddingLeft: "max(16px, env(safe-area-inset-left))",
              paddingRight: "max(16px, env(safe-area-inset-right))",
              paddingTop: 12,
              paddingBottom: 12,
              boxShadow: "0 -8px 24px -12px rgba(0,0,0,0.6)",
            }}
          >
            <div className="mx-auto w-full max-w-3xl">
              <StakeControls
                ticketCost={raffle.ticketCost}
                balance={balance}
                stake={stake}
                maxStake={maxStake}
                isAuthed={isAuthed}
                phoneRequired={phoneRequired}
                isPending={enterMut.isPending}
                onStakeChange={(v) => setStake(Math.max(0, Math.min(maxStake, v)))}
                onStake={handleStake}
                compact
              />
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-black italic tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}

function StakeControls({
  ticketCost,
  balance,
  stake,
  maxStake,
  isAuthed,
  phoneRequired,
  isPending,
  onStakeChange,
  onStake,
  compact = false,
}: {
  ticketCost: number;
  balance: number;
  stake: number;
  maxStake: number;
  isAuthed: boolean;
  phoneRequired: boolean;
  isPending: boolean;
  onStakeChange: (v: number) => void;
  onStake: () => void;
  compact?: boolean;
}) {
  const presets = [1, 5, maxStake].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  const noBalance = isAuthed && maxStake <= 0 && !phoneRequired;
  const totalCost = stake * ticketCost;
  const ticketWord = pluralRu(ticketCost, ["билет", "билета", "билетов"]);

  // Главный блок-стоппер: пока телефон не подтверждён — никаких ставок.
  if (phoneRequired) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            1 заявка — {ticketCost} {ticketWord}
          </div>
          <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-foreground">
            <PlumpTicket className="h-3.5 w-3.5 text-primary" />
            <PlumpNum value={balance} size={11} />

          </div>
        </div>
        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-3">
          <div className="font-display text-[14px] font-black uppercase italic tracking-wider text-amber-200">
            Нужен номер телефона
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-amber-100/80">
            Чтобы участвовать, подтверди номер в профиле. Это защита от мультиаккаунтов — одно участие на человека.
          </p>
          <Link
            to="/club/me"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 font-display text-[13px] font-black uppercase italic tracking-wider text-black active:scale-[0.98]"
          >
            Указать номер →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          1 заявка — {ticketCost} {ticketWord}
        </div>
        <div className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-foreground">
          <PlumpTicket className="h-3.5 w-3.5 text-primary" />
          <PlumpNum value={balance} size={11} />
        </div>
      </div>

      <div className={`mt-2 flex items-center gap-3 ${compact ? "" : "py-1"}`}>
        <StepBtn onClick={() => onStakeChange(stake - 1)} disabled={stake <= 0}>
          <Minus className="h-4 w-4" />
        </StepBtn>
        <div className="flex-1 text-center font-display text-3xl font-black italic leading-none tabular-nums text-foreground">
          {stake}
        </div>
        <StepBtn onClick={() => onStakeChange(stake + 1)} disabled={stake >= maxStake}>
          <Plus className="h-4 w-4" />
        </StepBtn>
      </div>

      {presets.length > 0 && (
        <div className="mt-2 flex gap-1.5">
          {presets.map((v, i) => (
            <button
              key={`${v}-${i}`}
              type="button"
              onClick={() => onStakeChange(v)}
              disabled={v > maxStake}
              className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors active:bg-white/[0.06] disabled:opacity-30"
            >
              {i === presets.length - 1 && v === maxStake && v > 1 ? "MAX" : `×${v}`}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onStake}
        disabled={!isAuthed || stake <= 0 || stake > maxStake || isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[15px] font-black uppercase italic tracking-wider text-primary-foreground transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Zap className="h-4 w-4" />
        {!isAuthed ? "Войти" : isPending ? "..." : `Поставить · ${totalCost}`}
      </button>

      {noBalance && (
        <Link
          to="/club/tickets"
          className="mt-2 block text-center font-mono text-[11px] uppercase tracking-wider text-primary active:opacity-60"
        >
          Билетов не хватает — как их набрать →
        </Link>
      )}
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.02] text-foreground transition-all active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
