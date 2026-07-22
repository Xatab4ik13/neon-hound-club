import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlumpArrowLeft as ArrowLeft,
  Calendar,
  Check,
  Minus,
  Plus,
  PlumpTicket,
  Trophy,
  Zap,
} from "@/components/ui/icons";
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
        className="mt-6 inline-flex items-center gap-2 rounded-full border-[3px] border-foreground bg-card px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />к розыгрышам
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
        <div className="skeleton-shimmer h-64 rounded-3xl" />
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

function formatDeadlineShort(iso: string) {
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
  const [stakeBump, setStakeBump] = useState(0);
  const finished = raffle.status === "finished";
  const phoneRequired = isAuthed && !phoneVerified;

  const enterMut = useMutation({
    mutationFn: async () => {
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

  const changeStake = (v: number) => {
    const clamped = Math.max(0, Math.min(maxStake, v));
    if (clamped !== stake) setStakeBump((b) => b + 1);
    setStake(clamped);
  };

  const handleStake = () => {
    if (!isAuthed) {
      navigate({ to: "/login" });
      return;
    }
    if (stake <= 0 || stake * raffle.ticketCost > balance) return;
    enterMut.mutate();
  };

  const maxByBalance = Math.floor(balance / raffle.ticketCost);
  const remainingByLimit =
    raffle.maxEntriesPerUser != null
      ? Math.max(0, raffle.maxEntriesPerUser - raffle.myEntries)
      : Infinity;
  const maxStake = Math.min(maxByBalance, remainingByLimit);

  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-4 md:py-8">
      {/* back link */}
      <Link
        to="/club/raffles"
        className="mb-5 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />к розыгрышам
      </Link>

      {/* flash toast */}
      {flash && (
        <div
          className="fixed left-1/2 top-16 z-[70] -translate-x-1/2 animate-fade-in rounded-2xl border-[3px] border-foreground bg-[#B6FF3C] px-4 py-2 font-display text-[13px] font-black uppercase italic tracking-widest text-black shadow-[4px_4px_0_0_hsl(var(--foreground))]"
        >
          <Check className="mr-1.5 inline h-4 w-4" strokeWidth={3} />
          {flash}
        </div>
      )}

      {/* HERO */}
      <section className="relative mb-9">
        {/* status sticker */}
        <span
          className={`absolute -left-1 -top-3 z-20 inline-flex items-center gap-1.5 -rotate-3 rounded-2xl border-[3px] border-foreground px-3 py-1.5 font-display text-[12px] font-black uppercase italic tracking-tighter text-black shadow-[4px_4px_0_0_hsl(var(--foreground))] ${
            finished ? "bg-[#C6A8FF]" : "bg-[#B6FF3C]"
          }`}
        >
          {!finished && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-black" />}
          {finished ? "Завершён" : "Идёт сейчас"}
        </span>

        <div
          className="relative aspect-[358/288] overflow-hidden rounded-[2rem] border-[3px] border-foreground bg-black shadow-[8px_8px_0_0_#F000C0] animate-fade-in"
        >
          {raffle.imageUrl && (
            <img
              src={raffle.imageUrl}
              alt={raffle.title}
              className="h-full w-full object-cover transition-transform duration-[6000ms] ease-out hover:scale-[1.06]"
            />
          )}
        </div>

        {/* ticket cost sticker */}
        <span className="absolute -bottom-4 -right-2 z-20 inline-flex items-center gap-1 rotate-2 rounded-xl border-[3px] border-foreground bg-[#FFD93D] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-black shadow-[4px_4px_0_0_hsl(var(--foreground))]">
          <PlumpTicket className="h-3.5 w-3.5" />
          <PlumpNum value={raffle.ticketCost} size={11} /> / билет
        </span>
      </section>

      {/* TITLE */}
      <section className="mb-6">
        <h1 className="font-display text-[38px] font-black uppercase italic leading-[0.9] tracking-tight text-foreground md:text-5xl">
          {raffle.title}
        </h1>
        {raffle.prize && (
          <p className="mt-2 font-mono text-[11px] font-bold uppercase tracking-widest text-[#C6A8FF]">
            {raffle.prize}
          </p>
        )}
      </section>

      {/* STATS ROW */}
      <section className="mb-6 grid grid-cols-2 gap-4">
        <StatCard
          label="Мои билеты"
          shadowColor="#FFD93D"
          delayMs={80}
          value={
            <div className="flex items-center gap-2">
              <PlumpNum value={raffle.myEntries} size={38} />
              <span className="grid h-6 w-8 place-items-center rounded-md border-[2px] border-foreground bg-[#FFD93D]">
                <PlumpTicket className="h-3.5 w-3.5 text-black" />
              </span>
            </div>
          }
        />
        <StatCard
          label={finished ? "Всего заявок" : "До закрытия"}
          shadowColor="#3DDBD9"
          delayMs={160}
          value={
            finished ? (
              <PlumpNum value={raffle.totalEntries} size={30} format />
            ) : (
              <div className="text-foreground">
                <Countdown deadlineAt={raffle.endsAt} compact />
              </div>
            )
          }
        />
      </section>

      {/* DEADLINE CHIP */}
      {!finished && (
        <section
          className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-[#3DDBD9] px-4 py-3 text-black animate-fade-in"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest">
            <Calendar className="h-3.5 w-3.5" strokeWidth={2.5} />
            Завершение
          </span>
          <span className="font-display text-[13px] font-black uppercase italic tracking-tight">
            {formatDeadlineShort(raffle.endsAt)}
          </span>
        </section>
      )}

      {/* WINNER */}
      {finished && raffle.winnerNick && (
        <section className="mb-6 flex items-center gap-3 rounded-3xl border-[3px] border-foreground bg-[#B6FF3C] px-4 py-4 text-black shadow-[6px_6px_0_0_hsl(var(--foreground))] animate-fade-in">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-background shadow-[3px_3px_0_0_hsl(var(--foreground))]">
            <Trophy className="h-5 w-5 text-[#B6FF3C]" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-widest">
              Победитель
            </div>
            <div className="truncate font-display text-xl font-black uppercase italic">
              @{raffle.winnerNick}
            </div>
          </div>
        </section>
      )}

      {/* DESCRIPTION */}
      {raffle.description && (
        <section className="mb-6 rounded-3xl bg-card p-5">
          <div className="space-y-3 text-[14px] leading-relaxed text-foreground/85">
            {raffle.description.split(/\n\n+/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* LEGAL */}
      <section className="mb-8 border-t-[2px] border-dashed border-foreground/20 pt-4">
        <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground">
          Стимулирующее мероприятие в порядке ст. 9 ФЗ-38 «О рекламе». Билеты можно
          получить бесплатно за активность в клубе — покупка не обязательна. НДФЛ с
          призов платит организатор. 18+, РФ и СНГ.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <Link
            to="/club/legal/promo-rules"
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#3DDBD9] underline decoration-2 underline-offset-4"
          >
            Полные правила
          </Link>
          <Link
            to="/club/legal/requisites"
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-2 underline-offset-4 hover:text-foreground"
          >
            Организатор
          </Link>
          <Link
            to="/club/legal/privacy"
            className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground underline decoration-2 underline-offset-4 hover:text-foreground"
          >
            Персональные данные
          </Link>
        </div>
      </section>

      {/* spacer for sticky panel */}
      {!finished && isMobile && <div aria-hidden className="h-60" />}

      {/* desktop / non-mobile stake panel inline */}
      {!finished && !isMobile && (
        <StakePanel
          ticketCost={raffle.ticketCost}
          balance={balance}
          stake={stake}
          stakeBump={stakeBump}
          maxStake={maxStake}
          isAuthed={isAuthed}
          phoneRequired={phoneRequired}
          isPending={enterMut.isPending}
          onStakeChange={changeStake}
          onStake={handleStake}
        />
      )}

      {/* mobile sticky */}
      {!finished && isMobile && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 z-[60] px-3"
            style={{
              bottom: "calc(64px + env(safe-area-inset-bottom))",
              paddingLeft: "max(12px, env(safe-area-inset-left))",
              paddingRight: "max(12px, env(safe-area-inset-right))",
            }}
          >
            <div className="mx-auto w-full max-w-3xl animate-in slide-in-from-bottom-4 duration-300">
              <StakePanel
                ticketCost={raffle.ticketCost}
                balance={balance}
                stake={stake}
                stakeBump={stakeBump}
                maxStake={maxStake}
                isAuthed={isAuthed}
                phoneRequired={phoneRequired}
                isPending={enterMut.isPending}
                onStakeChange={changeStake}
                onStake={handleStake}
                sticky
              />
            </div>
          </div>,
          document.body,
        )}
    </main>
  );
}

function StatCard({
  label,
  value,
  shadowColor,
  delayMs,
}: {
  label: string;
  value: React.ReactNode;
  shadowColor: string;
  delayMs: number;
}) {
  return (
    <div
      className="rounded-3xl border-[3px] border-foreground bg-card p-4 animate-fade-in"
      style={{
        boxShadow: `6px 6px 0 0 ${shadowColor}`,
        animationDelay: `${delayMs}ms`,
        animationFillMode: "both",
      }}
    >
      <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function StakePanel({
  ticketCost,
  balance,
  stake,
  stakeBump,
  maxStake,
  isAuthed,
  phoneRequired,
  isPending,
  onStakeChange,
  onStake,
  sticky = false,
}: {
  ticketCost: number;
  balance: number;
  stake: number;
  stakeBump: number;
  maxStake: number;
  isAuthed: boolean;
  phoneRequired: boolean;
  isPending: boolean;
  onStakeChange: (v: number) => void;
  onStake: () => void;
  sticky?: boolean;
}) {
  const presets = [1, 5, maxStake].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i);
  const noBalance = isAuthed && maxStake <= 0 && !phoneRequired;
  const totalCost = stake * ticketCost;
  const ticketWord = pluralRu(ticketCost, ["билет", "билета", "билетов"]);

  // Phone-required blocker
  if (phoneRequired) {
    return (
      <div
        className={`relative rounded-[2rem] p-4 ${
          sticky
            ? "bg-card shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.7)]"
            : "border-[3px] border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            1 заявка — {ticketCost} {ticketWord}
          </div>
          <BalanceChip balance={balance} />
        </div>
        <div className="mt-3 rounded-2xl border-[3px] border-foreground bg-[#FFD93D] p-4 text-black shadow-[3px_3px_0_0_hsl(var(--foreground))]">
          <div className="font-display text-[15px] font-black uppercase italic tracking-tight">
            Нужен номер телефона
          </div>
          <p className="mt-1 text-[12px] leading-relaxed">
            Чтобы участвовать, подтверди номер в профиле. Это защита от мультиаккаунтов — одно участие на человека.
          </p>
          <Link
            to="/club/me"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-foreground bg-background py-2.5 font-display text-[13px] font-black uppercase italic tracking-widest text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
          >
            Указать номер →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-[2rem] p-4 ${
        sticky
          ? "bg-card shadow-[0_-8px_24px_-6px_rgba(0,0,0,0.7)]"
          : "border-[3px] border-foreground bg-card shadow-[6px_6px_0_0_hsl(var(--foreground))]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          1 заявка —{" "}
          <span className="text-foreground">
            {ticketCost} {ticketWord}
          </span>
        </div>
        <BalanceChip balance={balance} />
      </div>

      {/* Stepper */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-[3px] border-foreground bg-background/60 p-2">
        <StepBtn onClick={() => onStakeChange(stake - 1)} disabled={stake <= 0}>
          <Minus className="h-5 w-5" strokeWidth={3} />
        </StepBtn>
        <div
          key={`bump-${stakeBump}`}
          className="flex flex-1 justify-center text-foreground animate-scale-in"
        >
          <PlumpNum value={stake} size={40} />
        </div>
        <StepBtn onClick={() => onStakeChange(stake + 1)} disabled={stake >= maxStake}>
          <Plus className="h-5 w-5" strokeWidth={3} />
        </StepBtn>
      </div>

      {/* Presets */}
      {presets.length > 0 && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {presets.map((v, i) => {
            const isMax = i === presets.length - 1 && v === maxStake && v > 1;
            const active = stake === v;
            return (
              <button
                key={`${v}-${i}`}
                type="button"
                onClick={() => onStakeChange(v)}
                disabled={v > maxStake}
                className={`rounded-xl border-[3px] border-foreground py-1.5 font-display text-[12px] font-black uppercase italic tracking-widest transition-all active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-30 ${
                  active
                    ? "bg-foreground text-background shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                    : isMax
                      ? "bg-[#FFD93D] text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
                      : "bg-card text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] active:shadow-[1px_1px_0_0_hsl(var(--foreground))]"
                }`}
              >
                {isMax ? "MAX" : `×${v}`}
              </button>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={onStake}
        disabled={!isAuthed || stake <= 0 || stake > maxStake || isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-foreground bg-[#B6FF3C] py-3.5 font-display text-[17px] font-black uppercase italic tracking-tight text-black shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <Zap className="h-5 w-5" strokeWidth={2.5} />
        {!isAuthed ? "Войти" : isPending ? "..." : `Поставить · ${totalCost}`}
      </button>

      {noBalance && (
        <Link
          to="/club/tickets"
          className="mt-2.5 block text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[#FFD93D] underline decoration-2 underline-offset-4"
        >
          Билетов не хватает — как их набрать →
        </Link>
      )}
    </div>
  );
}

function BalanceChip({ balance }: { balance: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-[2px] border-foreground bg-[#FFD93D] px-2.5 py-1 text-black shadow-[2px_2px_0_0_hsl(var(--foreground))]">
      <PlumpTicket className="h-3.5 w-3.5" />
      <PlumpNum value={balance} size={12} format />
    </span>
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
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[3px] border-foreground bg-card text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_hsl(var(--foreground))] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
