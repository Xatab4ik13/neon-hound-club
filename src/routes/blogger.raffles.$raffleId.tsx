// Блогерская рулетка. Полностью на бекенде:
// - GET /board → реальные участники (вес = число entries), призы, зафиксированные победители
// - POST /draw → бекенд возвращает кандидата (без записи), фронт строит ленту и крутит
// - POST /confirm → фиксация в БД; когда все слоты призов разыграны — раффл становится finished
// Блогер может крутить независимо от endsAt — бекенд не проверяет окно для draw/confirm.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PlumpArrowLeft as ArrowLeft, Play, RotateCcw, Trophy, Volume2, VolumeX } from "@/components/ui/icons";
import { hhToast as toast } from "@/lib/hh-toast";
import { playSpin, playWin } from "@/lib/roller-sfx";
import {
  bloggerQk,
  fetchRaffleBoard,
  drawPrizeWinner,
  confirmPrizeWinner,
  type RaffleBoard,
  type RafflePrizeDto,
  type RaffleParticipantDto,
  type DrawResult,
} from "@/lib/blogger-raffles";
import { RANKS, type RankId } from "@/data/ranks";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/blogger/raffles/$raffleId")({
  component: BloggerRaffleDetailPage,
});

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<
  RankId,
  (typeof RANKS)[number]
>;

// Геометрия роллера
const CARD_W = 168;
const CARD_GAP = 10;
const STEP = CARD_W + CARD_GAP;
const STRIP_LEN = 90;
const WINNER_INDEX = 80;
const SPIN_MS = 6500;

type StripCard = {
  userId: string;
  nick: string;
  avatarUrl: string | null;
  rankId: string;
};

function initialsFromNick(nick: string): string {
  return nick.slice(0, 2).toUpperCase();
}

function partToStripCard(p: RaffleParticipantDto): StripCard {
  return { userId: p.userId, nick: p.nick, avatarUrl: p.avatarUrl, rankId: p.rankId };
}
function drawToStripCard(d: DrawResult): StripCard {
  return { userId: d.userId, nick: d.nick, avatarUrl: d.avatarUrl, rankId: d.rankId };
}

function pickWeighted(participants: RaffleParticipantDto[], total: number): RaffleParticipantDto | null {
  if (participants.length === 0 || total <= 0) return null;
  const r = Math.random() * total;
  let cum = 0;
  for (const p of participants) {
    cum += p.tickets;
    if (r < cum) return p;
  }
  return participants[participants.length - 1];
}

function BloggerRaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: bloggerQk.board(raffleId),
    queryFn: () => fetchRaffleBoard(raffleId),
  });

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<StripCard[]>([]);
  const [offsetPx, setOffsetPx] = useState(0);
  const [candidate, setCandidate] = useState<DrawResult | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const drawMu = useMutation({
    mutationFn: ({ prizeId }: { prizeId: string }) => drawPrizeWinner(raffleId, prizeId),
    onError: (e) => {
      const msg = e instanceof ApiError
        ? e.code === "no_entries"
          ? "Нет участников"
          : e.code === "prize_exhausted"
            ? "Все слоты приза разыграны"
            : e.message
        : "Не получилось";
      toast.error(msg);
    },
  });

  const confirmMu = useMutation({
    mutationFn: ({ prizeId, entryId }: { prizeId: string; entryId: string }) =>
      confirmPrizeWinner(raffleId, prizeId, entryId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: bloggerQk.board(raffleId) });
      qc.invalidateQueries({ queryKey: bloggerQk.list });
      if (r.raffleFinished) toast.success("Розыгрыш завершён — все призы разыграны");
      else toast.success("Победитель зафиксирован");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Не получилось зафиксировать");
    },
  });

  const board: RaffleBoard | undefined = data;
  const totalT = useMemo(
    () => (board ? board.participants.reduce((s, p) => s + p.tickets, 0) : 0),
    [board],
  );

  if (isLoading) {
    return (
      <main className="px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="skeleton-shimmer h-8 w-1/3 rounded-lg" />
          <div className="skeleton-shimmer h-64 rounded-2xl" />
          <div className="skeleton-shimmer h-40 rounded-2xl" />
        </div>
      </main>
    );
  }
  if (isError || !board) {
    return (
      <main className="px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Розыгрыш не найден.</p>
        <Link to="/blogger/raffles" className="mt-3 inline-block text-primary underline">
          Назад к списку
        </Link>
      </main>
    );
  }

  const winnersByPrize = new Map<string, number>();
  for (const w of board.winners) {
    winnersByPrize.set(w.prizeId, (winnersByPrize.get(w.prizeId) ?? 0) + 1);
  }
  const prizeRemaining = (p: RafflePrizeDto) => p.qty - (winnersByPrize.get(p.id) ?? 0);

  const availablePrize =
    (selectedPrizeId && board.prizes.find((p) => p.id === selectedPrizeId && prizeRemaining(p) > 0)) ||
    null;

  const canSpin =
    !!availablePrize && totalT > 0 && !spinning && !candidate && !drawMu.isPending;
  const canRespin =
    !!availablePrize && totalT > 0 && !spinning && !!candidate && !confirmMu.isPending;

  const startSpin = async () => {
    if (!availablePrize || totalT <= 0 || spinning) return;

    // 1) Получаем кандидата с бекенда
    let drawn: DrawResult;
    try {
      drawn = await drawMu.mutateAsync({ prizeId: availablePrize.id });
    } catch {
      return;
    }

    // 2) Собираем полосу: 80 случайных взвешенных карточек + карточка победителя на 80 + хвост
    const winnerCard = drawToStripCard(drawn);
    const newStrip: StripCard[] = new Array(STRIP_LEN);
    for (let i = 0; i < STRIP_LEN; i++) {
      const p = pickWeighted(board.participants, totalT);
      newStrip[i] = p ? partToStripCard(p) : winnerCard;
    }
    newStrip[WINNER_INDEX] = winnerCard;
    if (
      board.participants.length > 1 &&
      newStrip[WINNER_INDEX - 1]?.userId === winnerCard.userId
    ) {
      let other = board.participants[0];
      while (other.userId === winnerCard.userId) {
        other = pickWeighted(board.participants, totalT) ?? other;
      }
      newStrip[WINNER_INDEX - 1] = partToStripCard(other);
    }

    setStrip(newStrip);
    setCandidate(null);
    setOffsetPx(0);
    setSpinning(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containerEl = document.getElementById("roller-viewport");
        const containerW = containerEl?.clientWidth ?? 900;
        const jitter = (Math.random() - 0.5) * (CARD_W - 40);
        const winnerCenter = WINNER_INDEX * STEP + CARD_W / 2;
        const target = containerW / 2 - winnerCenter + jitter;
        setSpinning(true);
        setOffsetPx(target);
        if (!mutedRef.current) playSpin(WINNER_INDEX, SPIN_MS);
      });
    });

    window.setTimeout(() => {
      setSpinning(false);
      setCandidate(drawn);
      if (!mutedRef.current) playWin();
    }, SPIN_MS + 80);
  };

  const confirmAndContinue = async () => {
    if (!candidate || !availablePrize) return;
    try {
      await confirmMu.mutateAsync({ prizeId: availablePrize.id, entryId: candidate.entryId });
    } catch {
      return;
    }
  };

  const resetForNext = () => {
    setCandidate(null);
    setStrip([]);
    setOffsetPx(0);
    // если у текущего приза не осталось слотов — снимаем выделение
    const fresh = qc.getQueryData<RaffleBoard>(bloggerQk.board(raffleId));
    if (fresh && availablePrize) {
      const taken =
        fresh.winners.filter((w) => w.prizeId === availablePrize.id).length;
      const totalQty = fresh.prizes.find((p) => p.id === availablePrize.id)?.qty ?? 0;
      if (taken >= totalQty) setSelectedPrizeId(null);
    }
  };

  const finished = board.raffle.status === "finished";
  const recorded = !!candidate && confirmMu.isSuccess;

  return (
    <main className="relative flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate({ to: "/blogger/raffles" })}
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Все розыгрыши
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
              {board.raffle.title}
            </h1>
            <p className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              {(board.participants.length).toLocaleString("ru-RU")} участников ·{" "}
              {(totalT).toLocaleString("ru-RU")} билетов в пуле
              {finished && <span className="ml-2 text-primary">· завершён</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Включить звук" : "Выключить звук"}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-white/[0.08] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col">
            <PrizeBanner prize={availablePrize} candidate={candidate} />
            <Roller strip={strip} offsetPx={offsetPx} spinning={spinning} hasCandidate={!!candidate} />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!candidate ? (
                <button
                  type="button"
                  onClick={startSpin}
                  disabled={!canSpin}
                  className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary-foreground transition-all hover:shadow-[0_0_28px_-4px_rgba(255,45,74,0.6)] disabled:opacity-30"
                >
                  <Play className="h-5 w-5" />
                  {drawMu.isPending ? "…" : "Крутить"}
                </button>
              ) : !recorded ? (
                <>
                  <button
                    type="button"
                    onClick={startSpin}
                    disabled={!canRespin}
                    className="inline-flex items-center gap-2 border border-primary/50 bg-primary/10 px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary transition-all hover:bg-primary/20 disabled:opacity-30"
                  >
                    <RotateCcw className="h-5 w-5" /> Крутить ещё раз
                  </button>
                  <button
                    type="button"
                    onClick={confirmAndContinue}
                    disabled={confirmMu.isPending}
                    className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary-foreground transition-all hover:shadow-[0_0_28px_-4px_rgba(255,45,74,0.6)] disabled:opacity-50"
                  >
                    <Trophy className="h-5 w-5" /> {confirmMu.isPending ? "Фиксируем…" : "Зафиксировать"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={resetForNext}
                  className="inline-flex items-center gap-2 border border-primary/50 bg-primary/10 px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary"
                >
                  <RotateCcw className="h-5 w-5" /> Следующий розыгрыш
                </button>
              )}
            </div>

            {candidate && (
              <WinnerCard candidate={candidate} prize={availablePrize} recorded={recorded} />
            )}
          </div>

          <aside className="space-y-4">
            <div className="border border-white/[0.08] bg-card/40">
              <div className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Призы
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {board.prizes.map((p) => {
                  const remain = prizeRemaining(p);
                  const isSel = selectedPrizeId === p.id;
                  const out = remain === 0;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={out || spinning}
                        onClick={() => setSelectedPrizeId(p.id)}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                          isSel ? "bg-primary/10" : "hover:bg-white/[0.03]"
                        } ${out ? "opacity-40" : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {out ? "разыгран" : `осталось ${remain} из ${p.qty}`}
                          </div>
                        </div>
                        {isSel && (
                          <span className="ml-2 shrink-0 border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                            выбран
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {board.prizes.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Нет призов — добавь их в админке
                  </li>
                )}
              </ul>
            </div>

            <WinnersLog board={board} />
          </aside>
        </div>
      </div>
    </main>
  );
}

// ───────── Roller ─────────

function Roller({
  strip,
  offsetPx,
  spinning,
  hasCandidate,
}: {
  strip: StripCard[];
  offsetPx: number;
  spinning: boolean;
  hasCandidate: boolean;
}) {
  const idle = strip.length === 0;

  return (
    <div
      id="roller-viewport"
      className="relative w-full min-w-0 overflow-hidden border border-white/[0.08] bg-gradient-to-b from-black via-[#0a0a0f] to-black"
      style={{
        height: 180,
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, #000 12%, #000 88%, transparent 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 4px)",
        }}
      />

      <div
        className="absolute inset-y-0 left-0 flex h-full items-center will-change-transform"
        style={{
          gap: CARD_GAP,
          transform: `translate3d(${offsetPx}px, 0, 0)`,
          transition: spinning
            ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.78, 0.18, 1)`
            : "none",
        }}
      >
        {idle ? (
          <RollerIdle />
        ) : (
          strip.map((c, i) => (
            <RollerCard key={i} card={c} highlight={hasCandidate && i === WINNER_INDEX} />
          ))
        )}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-20 -translate-x-1/2"
      >
        <div
          className="h-full w-[2px]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, #ff2d4a 18%, #ffd166 50%, #ff2d4a 82%, transparent 100%)",
            boxShadow: "0 0 18px 2px rgba(255,45,74,0.55), 0 0 36px rgba(255,45,74,0.25)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderTop: "12px solid #ff2d4a",
            filter: "drop-shadow(0 2px 4px rgba(255,45,74,0.55))",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: 0,
            height: 0,
            borderLeft: "9px solid transparent",
            borderRight: "9px solid transparent",
            borderBottom: "12px solid #ff2d4a",
            filter: "drop-shadow(0 -2px 4px rgba(255,45,74,0.55))",
          }}
        />
      </div>
    </div>
  );
}

function RollerIdle() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="shrink-0 border border-white/[0.05] bg-white/[0.015]"
          style={{ width: CARD_W, height: 144 }}
        />
      ))}
    </>
  );
}

function RollerCard({ card, highlight }: { card: StripCard; highlight: boolean }) {
  const rank = RANK_BY_ID[(card.rankId as RankId) ?? "rookie"] ?? RANK_BY_ID.rookie;
  const accent = rank.accent;
  const initials = initialsFromNick(card.nick);

  return (
    <div
      className="relative shrink-0 overflow-hidden bg-gradient-to-b from-[#13131a] to-[#08080c]"
      style={{
        width: CARD_W,
        height: 144,
        border: `1px solid ${accent}33`,
        boxShadow: highlight
          ? `0 0 0 1px ${accent}, 0 0 32px -4px ${accent}cc, inset 0 0 24px -8px ${accent}66`
          : `inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      <div className="flex h-full flex-col items-center justify-center gap-2 px-2 pt-2">
        <div
          className="flex h-14 w-14 items-center justify-center overflow-hidden"
          style={{
            background: "#0a0a0a",
            boxShadow: `inset 0 0 0 1.5px ${accent}`,
          }}
        >
          {card.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.avatarUrl}
              alt={card.nick}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span
              className="font-display text-2xl font-black italic uppercase leading-none"
              style={{ color: accent }}
            >
              {initials}
            </span>
          )}
        </div>
        <div className="w-full truncate text-center font-display text-[13px] font-black italic uppercase leading-tight tracking-tight">
          {card.nick}
        </div>
        <div
          className="border px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-wider"
          style={{
            color: accent,
            borderColor: `${accent}66`,
            background: `${accent}10`,
          }}
        >
          {rank.short}
        </div>
      </div>
    </div>
  );
}

// ───────── Side widgets ─────────

function PrizeBanner({
  prize,
  candidate,
}: {
  prize: RafflePrizeDto | null;
  candidate: DrawResult | null;
}) {
  return (
    <div className="mb-5 w-full border border-primary/30 bg-primary/[0.05] px-5 py-3 text-center">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
        {candidate ? "Победитель приза" : prize ? "Разыгрываем" : "Выбери приз справа"}
      </div>
      <div className="mt-1 font-display text-xl font-black italic uppercase tracking-tight">
        {prize?.name ?? "—"}
      </div>
    </div>
  );
}

function WinnerCard({
  candidate,
  prize,
  recorded,
}: {
  candidate: DrawResult;
  prize: RafflePrizeDto | null;
  recorded: boolean;
}) {
  const rank = RANK_BY_ID[(candidate.rankId as RankId) ?? "rookie"] ?? RANK_BY_ID.rookie;
  const initials = initialsFromNick(candidate.nick);
  return (
    <div
      className="mt-6 w-full border border-primary/50 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02] p-5 text-center animate-scale-in"
      style={{ boxShadow: "0 0 32px -4px rgba(255,45,74,0.45)" }}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
        {recorded ? "Зафиксирован" : "Выпал"}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden"
          style={{
            background: "#0a0a0a",
            boxShadow: `inset 0 0 0 2px ${rank.accent}`,
          }}
        >
          {candidate.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={candidate.avatarUrl} alt={candidate.nick} className="h-full w-full object-cover" />
          ) : (
            <span
              className="font-display text-2xl font-black italic uppercase"
              style={{ color: rank.accent }}
            >
              {initials}
            </span>
          )}
        </div>
        <div className="text-left">
          <div className="font-display text-2xl font-black italic uppercase tracking-tight">
            {candidate.nick}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ color: rank.accent, borderColor: `${rank.accent}66` }}
            >
              {rank.short}
            </span>
            {candidate.city && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {candidate.city}
              </span>
            )}
          </div>
        </div>
      </div>
      {prize && (
        <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          приз: <span className="text-foreground">{prize.name}</span>
        </div>
      )}
    </div>
  );
}

function WinnersLog({ board }: { board: RaffleBoard }) {
  if (board.winners.length === 0) return null;
  const prizeById = new Map(board.prizes.map((p) => [p.id, p]));
  return (
    <div className="border border-white/[0.08] bg-card/40">
      <div className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Победители
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {board.winners.map((w) => (
          <li key={w.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <span className="truncate font-display text-[13px] font-bold uppercase italic">
              {w.nick}
            </span>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {prizeById.get(w.prizeId)?.name ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
