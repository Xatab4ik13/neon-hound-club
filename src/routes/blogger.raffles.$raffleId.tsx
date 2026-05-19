// Рандомайзер для стрима. Колесо фортуны, сектора по весу билетов.
// Каждый прокрут: 1) выбираем случайный билет с равномерным шансом из пула
// всех потраченных билетов → сектор-победитель уже виден, 2) крутим колесо
// до сектора этого победителя, 3) после остановки списываем один билет
// (его выигравший билет выбывает) и фиксируем победителя приза.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Play, RotateCcw, Trophy } from "lucide-react";
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

// Палитра секторов
const PALETTE = [
  "#ff2d4a", "#ff8a3d", "#ffd166", "#9bff7d", "#3dd5ff",
  "#7d8aff", "#c87dff", "#ff7dc8", "#ffaf3d", "#3dffaf",
];

function BloggerRaffleDetailPage() {
  const { raffleId } = Route.useParams();
  const raffles = useRaffles();
  const navigate = useNavigate();
  const raffle = raffles.find((r) => r.id === raffleId);

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);

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

  const startSpin = () => {
    if (!canSpin || !availablePrize) return;

    // 1) Честный выбор: случайный билет из всех потраченных
    const r = Math.floor(Math.random() * totalT);
    let cum = 0;
    let winnerSlug = raffle.participants[0]?.slug ?? "";
    for (const p of raffle.participants) {
      cum += p.tickets;
      if (r < cum) {
        winnerSlug = p.slug;
        break;
      }
    }

    // 2) Угол сектора победителя (центр)
    const sectors = buildSectors(raffle.participants, totalT);
    const sec = sectors.find((s) => s.slug === winnerSlug)!;
    const centerDeg = (sec.startDeg + sec.endDeg) / 2;

    // Стрелка указывает наверх (-90°). Сектор должен прийти к -90°.
    // Поворачиваем колесо так, чтобы (rotation + centerDeg) ≡ -90 (mod 360),
    // плюс несколько полных оборотов для драмы.
    const desired = -90 - centerDeg;
    const currentMod = ((rotation % 360) + 360) % 360;
    const desiredMod = ((desired % 360) + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta <= 0) delta += 360;
    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6–8 оборотов
    const next = rotation + fullSpins * 360 + delta;

    setSpinning(true);
    setWinner(null);
    setRecorded(false);
    setRotation(next);

    // 5.5s — длительность спина (совпадает с transition)
    window.setTimeout(() => {
      setSpinning(false);
      setWinner(winnerSlug);
    }, 5600);
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
    // если приз закончился — сбросить выбор
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
          {raffle.participants.length.toLocaleString("ru-RU")} участников · {totalT.toLocaleString("ru-RU")} билетов в пуле
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Колесо */}
          <div className="flex flex-col items-center">
            <PrizeBanner prize={availablePrize} winner={winner} />
            <Wheel
              participants={raffle.participants}
              total={totalT}
              rotation={rotation}
              spinning={spinning}
            />

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
                <button
                  type="button"
                  onClick={confirmAndContinue}
                  className="inline-flex items-center gap-2 border border-primary bg-primary px-6 py-3 font-display text-lg font-black italic uppercase tracking-tight text-primary-foreground"
                >
                  <Trophy className="h-5 w-5" /> Зафиксировать
                </button>
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

// ───────── Wheel ─────────

type Sector = {
  slug: string;
  tickets: number;
  startDeg: number;
  endDeg: number;
  color: string;
};

function buildSectors(participants: RaffleParticipant[], total: number): Sector[] {
  // Сортируем по убыванию билетов — самые крупные секторы первыми (красивее на колесе)
  const sorted = [...participants].sort((a, b) => b.tickets - a.tickets);
  let acc = 0;
  return sorted.map((p, i) => {
    const frac = p.tickets / total;
    const startDeg = acc * 360;
    acc += frac;
    const endDeg = acc * 360;
    return { slug: p.slug, tickets: p.tickets, startDeg, endDeg, color: PALETTE[i % PALETTE.length] };
  });
}

function Wheel({
  participants,
  total,
  rotation,
  spinning,
}: {
  participants: RaffleParticipant[];
  total: number;
  rotation: number;
  spinning: boolean;
}) {
  const sectors = useMemo(() => buildSectors(participants, total), [participants, total]);
  const size = 460;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const labelR = r * 0.66;

  return (
    <div className="relative" style={{ width: size, maxWidth: "100%" }}>
      {/* Стрелка-указатель сверху */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
        style={{
          width: 0,
          height: 0,
          borderLeft: "18px solid transparent",
          borderRight: "18px solid transparent",
          borderTop: "28px solid #ff2d4a",
          filter: "drop-shadow(0 4px 8px rgba(255,45,74,0.5))",
        }}
      />
      {/* Центр */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full bg-black ring-4 ring-primary/40"
          style={{ boxShadow: "0 0 24px rgba(255,45,74,0.5)" }}
        >
          <span
            className="font-display text-2xl font-black italic uppercase"
            style={{
              background: "linear-gradient(135deg, #ff2d4a, #ffd166)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            HH
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={spinning ? "wheel-spinning" : ""}
        style={{
          width: "100%",
          height: "auto",
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "transform 5.5s cubic-bezier(0.17, 0.67, 0.13, 1.0)" : "none",
        }}
      >
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(255,45,74,0.25)" />
          </radialGradient>
        </defs>
        {sectors.map((s, i) => {
          const path = arcPath(cx, cy, r - 4, s.startDeg, s.endDeg);
          const mid = (s.startDeg + s.endDeg) / 2;
          const lx = cx + labelR * Math.cos(((mid - 90) * Math.PI) / 180);
          const ly = cy + labelR * Math.sin(((mid - 90) * Math.PI) / 180);
          const arcDeg = s.endDeg - s.startDeg;
          const showLabel = arcDeg > 6; // не пишем имена на мелких секторах
          const user = PUBLIC_USERS[s.slug];
          return (
            <g key={s.slug + i}>
              <path d={path} fill={s.color} stroke="#0a0a0a" strokeWidth={1.5} opacity={0.92} />
              {showLabel && (
                <text
                  x={lx}
                  y={ly}
                  fill="#0a0a0a"
                  fontFamily="system-ui, sans-serif"
                  fontSize={arcDeg > 18 ? 13 : 10}
                  fontWeight={900}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${mid}, ${lx}, ${ly})`}
                  style={{ pointerEvents: "none" }}
                >
                  {(user?.nick ?? s.slug).slice(0, 12)}
                </text>
              )}
            </g>
          );
        })}
        {/* Внешний обод */}
        <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="#ff2d4a" strokeWidth={3} opacity={0.6} />
        <circle cx={cx} cy={cy} r={r - 2} fill="url(#wheelGlow)" />
      </svg>
    </div>
  );
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // SVG arc от startDeg до endDeg (0° = вверх, по часовой)
  const toXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(startDeg);
  const [ex, ey] = toXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  // Если ровно один сектор (360°) — рисуем как почти-полный круг через две дуги
  if (endDeg - startDeg >= 359.99) {
    return `M ${cx} ${cy} m -${r}, 0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`;
  }
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
}

// ───────── Side widgets ─────────

function PrizeBanner({ prize, winner }: { prize: RafflePrize | null; winner: string | null }) {
  return (
    <div className="mb-5 w-full max-w-[460px] border border-primary/30 bg-primary/[0.05] px-5 py-3 text-center">
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
      className="mt-6 w-full max-w-[460px] border border-primary/50 bg-gradient-to-br from-primary/[0.12] to-primary/[0.02] p-5 text-center"
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
                style={{ color: rank.accent, borderColor: rank.accentSoft }}
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
