// Рандомайзер для стрима. CS:GO-роллер: горизонтальная лента карточек,
// плавно тормозит под центральным маркером. Виртуализованная полоса —
// рендерим ~90 карточек на спин, не зависит от числа участников (10k+ ок).
//
// Логика честности: 1) сэмплируем победителя взвешенно по билетам,
// 2) собираем полосу: 80 случайных взвешенных карточек + карточка победителя
// на индексе 80 + 9 хвостовых для красивого проезда, 3) сдвигаем полосу так,
// чтобы центр карточки победителя пришёл к маркеру (±jitter для живости),
// 4) после остановки списываем билет и фиксируем приз.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { ArrowLeft, Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";
import { playSpin, playWin } from "@/lib/roller-sfx";
import {
  rafflesStore,
  useRaffles,
  totalTickets,
  prizeRemaining,
  type Raffle,
  type RafflePrize,
  type RaffleParticipant,
} from "@/data/raffles-store";
import { PUBLIC_USERS } from "@/data/users";
import { RANKS, type RankId } from "@/data/ranks";
import { HellhoundChip, isHell } from "@/components/club/HellhoundPlaque";

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
const STEP = CARD_W + CARD_GAP; // шаг между центрами карточек
const STRIP_LEN = 90;            // всего карточек на полосе
const WINNER_INDEX = 80;          // индекс победителя в полосе
const SPIN_MS = 6500;

function BloggerRaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const raffles = useRaffles();
  const navigate = useNavigate();
  const raffle = raffles.find((r) => r.id === raffleId);

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [strip, setStrip] = useState<string[]>([]);
  const [offsetPx, setOffsetPx] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  if (!raffle) {
    return (
      <main className="px-4 py-10 md:px-8">
        <p className="text-muted-foreground">Розыгрыш не найден.</p>
        <Link to="/blogger/raffles" className="mt-3 inline-block text-primary underline">
          Назад к списку
        </Link>
      </main>
    );
  }

  const totalT = totalTickets(raffle);
  const prizes = raffle.prizes;
  const availablePrize =
    (selectedPrizeId && prizes.find((p) => p.id === selectedPrizeId && prizeRemaining(p) > 0)) ||
    null;

  const canSpin = !!availablePrize && totalT > 0 && !spinning && !winner;
  const canRespin = !!availablePrize && totalT > 0 && !spinning && !!winner && !recorded;

  const startSpin = () => {
    if (!availablePrize || totalT <= 0 || spinning) return;
    if (winner && recorded) return;

    // 1) Честный выбор победителя по весам билетов
    const winnerSlug = pickWeighted(raffle.participants, totalT);

    // 2) Собираем полосу
    const newStrip: string[] = new Array(STRIP_LEN);
    for (let i = 0; i < STRIP_LEN; i++) {
      newStrip[i] = pickWeighted(raffle.participants, totalT);
    }
    newStrip[WINNER_INDEX] = winnerSlug;
    // защита от случайного повтора рядом (визуально некрасиво)
    if (newStrip[WINNER_INDEX - 1] === winnerSlug && raffle.participants.length > 1) {
      let other = winnerSlug;
      while (other === winnerSlug) other = pickWeighted(raffle.participants, totalT);
      newStrip[WINNER_INDEX - 1] = other;
    }

    setStrip(newStrip);
    setWinner(null);
    setRecorded(false);

    // 3) Стартовая позиция — почти в начале (чуть смещение для динамики)
    setOffsetPx(0);
    setSpinning(false);

    // requestAnimationFrame → задаём конечный offset с transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const containerEl = document.getElementById("roller-viewport");
        const containerW = containerEl?.clientWidth ?? 900;
        const jitter = (Math.random() - 0.5) * (CARD_W - 40); // ±64px
        const winnerCenter = WINNER_INDEX * STEP + CARD_W / 2;
        const target = containerW / 2 - winnerCenter + jitter;
        setSpinning(true);
        setOffsetPx(target);
      });
    });

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(winnerSlug);
    }, SPIN_MS + 80);
  };

  const confirmAndContinue = () => {
    if (!winner || !availablePrize || recorded) return;
    rafflesStore.recordWinner(raffle.id, availablePrize.id, winner);
    rafflesStore.consumeTicket(raffle.id, winner);
    setRecorded(true);
  };

  const resetForNext = () => {
    setWinner(null);
    setRecorded(false);
    setStrip([]);
    setOffsetPx(0);
    const fresh = rafflesStore.getSnapshot().find((x) => x.id === raffle.id);
    if (fresh && availablePrize) {
      const stillAvail = fresh.prizes.find((p) => p.id === availablePrize.id);
      if (!stillAvail || prizeRemaining(stillAvail) === 0) setSelectedPrizeId(null);
    }
  };

  return (
    <main className="relative flex-1 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => navigate({ to: "/blogger/raffles" })}
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Все розыгрыши
        </button>

        <h1 className="font-display text-3xl font-black italic uppercase tracking-tight md:text-4xl">
          {raffle.name}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {raffle.participants.length.toLocaleString("ru-RU")} участников ·{" "}
          {totalT.toLocaleString("ru-RU")} билетов в пуле
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Роллер */}
          <div className="flex min-w-0 flex-col">
            <PrizeBanner prize={availablePrize} winner={winner} />
            <Roller strip={strip} offsetPx={offsetPx} spinning={spinning} winner={winner} />

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {!winner ? (
                <button
                  type="button"
                  onClick={startSpin}
                  disabled={!canSpin}
                  className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary-foreground transition-all hover:shadow-[0_0_28px_-4px_rgba(255,45,74,0.6)] disabled:opacity-30"
                >
                  <Play className="h-5 w-5" />
                  Крутить
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
                    className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary-foreground transition-all hover:shadow-[0_0_28px_-4px_rgba(255,45,74,0.6)]"
                  >
                    <Trophy className="h-5 w-5" /> Зафиксировать
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

            {winner && <WinnerCard slug={winner} prize={availablePrize} recorded={recorded} />}
          </div>

          {/* Призы и история */}
          <aside className="space-y-4">
            <div className="border border-white/[0.08] bg-card/40">
              <div className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Призы
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {prizes.map((p) => {
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
                {prizes.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">Нет призов</li>
                )}
              </ul>
            </div>

            <WinnersLog raffle={raffle} />
          </aside>
        </div>
      </div>
    </main>
  );
}

// ───────── Roller ─────────

function pickWeighted(participants: RaffleParticipant[], total: number): string {
  if (participants.length === 0 || total <= 0) return "";
  const r = Math.random() * total;
  let cum = 0;
  for (const p of participants) {
    cum += p.tickets;
    if (r < cum) return p.slug;
  }
  return participants[participants.length - 1].slug;
}

function Roller({
  strip,
  offsetPx,
  spinning,
  winner,
}: {
  strip: string[];
  offsetPx: number;
  spinning: boolean;
  winner: string | null;
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
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* фоновый scanline-блик */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 1px, transparent 1px 4px)",
        }}
      />

      {/* лента — абсолютная, центрирована по вертикали через flex h-full items-center */}
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
          strip.map((slug, i) => (
            <RollerCard key={i} slug={slug} highlight={!!winner && i === WINNER_INDEX} />
          ))
        )}
      </div>

      {/* центральный маркер — поверх ленты */}
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
  // 12 пустых заглушек, чтобы лента не выглядела пустой до спина
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

function RollerCard({ slug, highlight }: { slug: string; highlight: boolean }) {
  const u = PUBLIC_USERS[slug];
  const rank = RANK_BY_ID[u?.rank ?? "rookie"];
  const hell = isHell(slug);
  const accent = hell ? "#ff2d4a" : rank.accent;

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
      {/* верхняя цветная полоска ранга */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />

      {/* инициалы */}
      <div className="flex h-full flex-col items-center justify-center gap-2 px-2 pt-2">
        <div
          className="flex h-14 w-14 items-center justify-center"
          style={{
            background: "#0a0a0a",
            boxShadow: `inset 0 0 0 1.5px ${accent}`,
          }}
        >
          <span
            className="font-display text-2xl font-black italic uppercase leading-none"
            style={{ color: accent }}
          >
            {u?.initials ?? "?"}
          </span>
        </div>
        <div className="w-full truncate text-center font-display text-[13px] font-black italic uppercase leading-tight tracking-tight">
          {u?.nick ?? slug}
        </div>
        <div
          className="border px-1.5 py-[1px] font-mono text-[8px] font-bold uppercase tracking-wider"
          style={{
            color: accent,
            borderColor: `${accent}66`,
            background: `${accent}10`,
          }}
        >
          {hell ? "HELLHOUND" : rank.short}
        </div>
      </div>
    </div>
  );
}

// ───────── Side widgets ─────────

function PrizeBanner({ prize, winner }: { prize: RafflePrize | null; winner: string | null }) {
  return (
    <div className="mb-5 w-full border border-primary/30 bg-primary/[0.05] px-5 py-3 text-center">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
        {winner ? "Победитель приза" : prize ? "Разыгрываем" : "Выбери приз справа"}
      </div>
      <div className="mt-1 font-display text-xl font-black italic uppercase tracking-tight">
        {prize?.name ?? "—"}
      </div>
    </div>
  );
}

function WinnerCard({
  slug,
  prize,
  recorded,
}: {
  slug: string;
  prize: RafflePrize | null;
  recorded: boolean;
}) {
  const u = PUBLIC_USERS[slug];
  const rank = RANK_BY_ID[u?.rank ?? "rookie"];
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
          className="flex h-14 w-14 shrink-0 items-center justify-center"
          style={{
            background: "#0a0a0a",
            boxShadow: `inset 0 0 0 2px ${rank.accent}`,
          }}
        >
          <span
            className="font-display text-2xl font-black italic uppercase"
            style={{ color: rank.accent }}
          >
            {u?.initials ?? "?"}
          </span>
        </div>
        <div className="text-left">
          <div className="font-display text-2xl font-black italic uppercase tracking-tight">
            {u?.nick ?? slug}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {isHell(slug) ? (
              <HellhoundChip size="sm" />
            ) : (
              <span
                className="border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                style={{ color: rank.accent, borderColor: `${rank.accent}66` }}
              >
                {rank.short}
              </span>
            )}
            {u?.city && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {u.city}
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

function WinnersLog({ raffle }: { raffle: Raffle }) {
  const all = raffle.prizes.flatMap((p) =>
    (p.winners ?? []).map((slug, i) => ({ key: `${p.id}-${i}`, slug, prize: p.name })),
  );
  if (all.length === 0) return null;
  return (
    <div className="border border-white/[0.08] bg-card/40">
      <div className="border-b border-white/[0.06] px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Победители
      </div>
      <ul className="divide-y divide-white/[0.04]">
        {all.map((w) => {
          const u = PUBLIC_USERS[w.slug];
          return (
            <li key={w.key} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <span className="truncate font-display text-[13px] font-bold uppercase italic">
                {u?.nick ?? w.slug}
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {w.prize}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
