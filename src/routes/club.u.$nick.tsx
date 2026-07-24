import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  PlumpArrowLeft as ArrowLeft,
  Bike,
  Calendar,
  PlumpMap as MapPin,
  Trophy,
  Award,
} from "@/components/ui/icons";
import { RANKS, getRankSpan, type RankId } from "@/data/ranks";
import { getUser, type PublicUser } from "@/data/users";
import { PlaqueBackground } from "./club";
import { usePublicProfile, type PublicProfile } from "@/lib/garage-api";
import { PlumpNum } from "@/components/brand/PlumpNum";
import tplSilver from "@/assets/hellpass/tpl-silver.png";
import tplGold from "@/assets/hellpass/tpl-gold.png";
import tplPlatinum from "@/assets/hellpass/tpl-platinum.png";

const HELLPASS_PREVIEW: Array<{ src: string; months: number; tint: string }> = [
  { src: tplSilver, months: 2, tint: "#B6FF3C" },
  { src: tplGold, months: 8, tint: "#FF8A1E" },
  { src: tplPlatinum, months: 9, tint: "#F000C0" },
];


type BikeCard = {
  brand: string;
  model: string;
  year: number | null;
  nickname: string | null;
  photo: string | null;
};

type ProfileView = PublicUser & {
  bikes: BikeCard[];
};

export const Route = createFileRoute("/club/u/$nick")({
  head: ({ params }) => {
    const user = getUser(params.nick);
    const title = user ? `${user.nick} — клуб HELLHOUND` : `${params.nick} — клуб HELLHOUND`;
    const description = user
      ? `${user.nick} в клубе HELLHOUND Racing${user.city ? `, ${user.city}` : ""}.`
      : "Профиль участника клуба HELLHOUND Racing.";
    const ogImage = `/api/public/og/u/${params.nick.toLowerCase()}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: ogImage },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImage },
      ],
    };
  },

  component: UserProfilePage,

});


const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r])) as Record<
  RankId,
  (typeof RANKS)[number]
>;
const DEFAULT_RANK: RankId = "rookie";

function fromServer(p: PublicProfile): ProfileView {
  const initials = (p.nick.match(/[A-Za-zА-Яа-я0-9]/g) ?? [p.nick[0] ?? "?"])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const joinedDate = new Date(p.joinedAt);
  const joined = joinedDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const rankId = (RANKS.find((r) => r.id === p.rank.rankId)?.id ?? DEFAULT_RANK) as RankId;
  const bikes: BikeCard[] = p.primaryBike ? [p.primaryBike] : [];
  const bikeStr = p.primaryBike
    ? `${p.primaryBike.brand} ${p.primaryBike.model}`.trim()
    : undefined;
  return {
    slug: p.nick.toLowerCase(),
    nick: p.nick,
    initials,
    rank: rankId,
    xpPct: p.rank.pct,
    role: p.role === "admin" ? "owner" : p.role === "blogger" ? "team" : "rider",
    isBlogger: p.role === "blogger",
    city: p.city ?? undefined,
    bike: bikeStr,
    joined,
    badgeIds: [],
    wins: [],
    avatarUrl: p.avatarUrl ?? undefined,
    bikes,
  };
}

function UserProfilePage() {
  const { nick } = Route.useParams();
  const q = usePublicProfile(nick);

  if (q.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center md:px-8">
        <p className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          Загружаем профиль…
        </p>
      </main>
    );
  }

  if (!q.data) {
    if (q.isError) throw q.error;
    return <NotFoundUser nick={nick} />;
  }
  return <UserView user={fromServer(q.data)} />;
}

function NotFoundUser({ nick }: { nick: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center md:px-8">
      <h1 className="font-display text-2xl font-black uppercase  text-foreground">
        Профиль не найден
      </h1>
      <p className="mt-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
        nick: {nick}
      </p>
      <Link
        to="/club"
        className="mt-6 inline-flex items-center gap-2 border border-white/[0.08] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-primary hover:border-primary/60"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        В ленту
      </Link>
    </main>
  );
}

function UserView({ user }: { user: ProfileView }) {
  const rank = RANK_BY_ID[user.rank];
  const rankIdx = RANKS.findIndex((r) => r.id === user.rank);
  const xpMax = getRankSpan(rankIdx);
  const xp = Math.round((user.xpPct / 100) * xpMax);
  const next = RANKS[rankIdx + 1] ?? null;
  const showHellPassPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "hellpass";


  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link
        to="/club"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Лента
      </Link>

      {/* Hero — по центру, круглый аватар в Plump-обводке */}
      <section className="relative mb-6 overflow-hidden border border-white/[0.06] bg-card/40 px-6 py-8 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            background: `radial-gradient(70% 90% at 50% 0%, ${rank.accentSoft}, transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col items-center text-center">
          {/* круглый аватар */}
          <div
            className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full md:h-36 md:w-36"
            style={{
              border: `3px solid ${rank.accent}`,
              boxShadow: `4px 4px 0 0 #000, 0 0 24px ${rank.accentSoft}`,
              background: "#000",
            }}
          >
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <PlaqueBackground bg={rank.plaqueBg} />
            </div>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.nick}
                className="absolute inset-0 z-[2] h-full w-full object-cover"
              />
            ) : (
              <span
                className="relative z-[2] font-display text-4xl font-black uppercase  md:text-5xl"
                style={{
                  color: rank.accent,
                  textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                }}
              >
                {user.initials}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-2xl font-black uppercase  tracking-tight text-foreground md:text-3xl">
            {user.nick}
          </h1>

          <span
            className="mt-2 inline-flex items-center rounded-full border-2 border-black bg-black/40 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider"
            style={{
              color: rank.accent,
              borderColor: rank.accent,
              boxShadow: `3px 3px 0 0 #000`,
            }}
          >
            {rank.label}
          </span>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {user.city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {user.city}
              </span>
            )}
            {user.bike && (
              <span className="flex items-center gap-1.5">
                <Bike className="h-3 w-3" /> {user.bike}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> в клубе с {user.joined}
            </span>
          </div>

          {/* Значки — плашка на всю ширину под аватаркой */}
          <div className="mt-6 w-full">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-[11px] font-black uppercase  tracking-[0.2em] text-muted-foreground">
                Значки
              </span>
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                <PlumpNum
                  value={showHellPassPreview ? 3 : user.badgeIds.length}
                  size={12}
                />
              </span>
            </div>
            {showHellPassPreview ? (
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl px-3 py-3">
                {HELLPASS_PREVIEW.map((b) => (
                  <div
                    key={b.src}
                    className="relative h-16 w-16 drop-shadow-[2px_2px_0_rgba(0,0,0,0.55)]"
                  >
                    <img
                      src={b.src}
                      alt=""
                      loading="lazy"
                      width={144}
                      height={144}
                      className="h-full w-full object-contain"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                      style={{ paddingTop: "18%" }}
                    >
                      <PlumpNum value={b.months} size={22} className="text-black" />
                    </div>
                  </div>
                ))}
              </div>
            ) : user.badgeIds.length === 0 ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-white/80 bg-black/40 px-4 py-5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Award className="h-4 w-4 opacity-60" />
                Пока без значков
              </div>
            ) : user.badgeIds.length === 0 ? (
              <div className="flex items-center justify-center gap-2 border-2 border-dashed border-white/[0.1] bg-black/30 px-4 py-5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Award className="h-4 w-4 opacity-60" />
                Пока без значков
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {user.badgeIds.map((b) => (
                  <span
                    key={b}
                    className="border-2 border-black bg-primary px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-black"
                    style={{ boxShadow: "3px 3px 0 0 #000" }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>


          {/* XP / прогресс — Plump-цифры */}
          <div className="mt-6 w-full text-left">
            <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Прогресс</span>
              {!next ? (
                <span className="font-extrabold" style={{ color: rank.accent }}>
                  MAX
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  до{" "}
                  <span className="font-bold" style={{ color: rank.accent }}>
                    {next.label}
                  </span>
                  <span className="opacity-40">·</span>
                  <PlumpNum value={xpMax - xp} size={11} format />
                  <span className="text-[10px]">XP</span>
                </span>
              )}
            </div>
            <div className="relative h-2 overflow-hidden rounded-full border border-white/[0.08] bg-[oklch(0.18_0.02_357.3)]">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${user.xpPct}%`,
                  background: `linear-gradient(90deg, color-mix(in oklab, ${rank.accent}, #000 25%) 0%, ${rank.accent} 100%)`,
                  boxShadow: `0 0 12px ${rank.accentSoft}`,
                }}
              />
            </div>
            <div className="mt-1.5 flex items-baseline justify-between font-mono text-[11px]">
              <span
                className="font-bold uppercase tracking-[0.2em]"
                style={{ color: rank.accent }}
              >
                {rank.label}
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <PlumpNum value={xp} size={12} format />
                <span className="opacity-40">/</span>
                <PlumpNum value={xpMax} size={12} format />
                <span className="text-[10px]">XP</span>
              </span>
            </div>
          </div>
        </div>
      </section>





      {/* Мотоциклы — карусель */}
      {user.bikes.length > 0 && (
        <section className="mb-8">
          <SectionTitle
            title={user.bikes.length > 1 ? "Мотоциклы" : "Мотоцикл"}
            right={user.bikes.length > 1 ? String(user.bikes.length) : undefined}
          />
          <BikeCarousel bikes={user.bikes} />
        </section>
      )}

      {/* Победы */}
      <section className="mb-8">
        <SectionTitle title="Победы в розыгрышах" right={`${user.wins.length}`} />
        {user.wins.length === 0 ? (
          <div className="flex items-center justify-center gap-2 border-2 border-dashed border-white/[0.1] bg-black/30 px-4 py-6 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-4 w-4 opacity-60" />
            Пока без побед — впереди
          </div>
        ) : (
          <ul className="space-y-2.5">
            {user.wins.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 border-2 border-black bg-card px-4 py-3"
                style={{ boxShadow: "4px 4px 0 0 #000" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black"
                  style={{ background: "#FFD93D", boxShadow: "2px 2px 0 0 #000" }}
                >
                  <Trophy className="h-5 w-5 text-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[14px] font-black uppercase  text-foreground">
                    {w.title}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {w.date}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function BikeCarousel({ bikes }: { bikes: BikeCard[] }) {
  const [idx, setIdx] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };

  const goTo = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {bikes.map((b, i) => (
          <div key={i} className="w-full flex-shrink-0 snap-center pr-3 last:pr-0">
            <BikePlate bike={b} />
          </div>
        ))}
      </div>

      {bikes.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {bikes.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Мотоцикл ${i + 1}`}
              onClick={() => goTo(i)}
              className="h-2 border-2 border-black transition-all"
              style={{
                width: i === idx ? 24 : 8,
                background: i === idx ? "#F000C0" : "#333",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BikePlate({ bike }: { bike: BikeCard }) {
  const name = `${bike.brand} ${bike.model}`.trim();
  return (
    <div
      className="overflow-hidden border-2 border-black bg-card"
      style={{ boxShadow: "5px 5px 0 0 #000" }}
    >
      {bike.photo ? (
        <img
          src={bike.photo}
          alt={name}
          className="aspect-[16/10] w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex aspect-[16/10] w-full items-center justify-center bg-black/40">
          <Bike className="h-10 w-10 text-muted-foreground/40" />
        </div>
      )}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-t-2 border-black px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-display text-base font-black uppercase  text-foreground">
            {name}
          </div>
          {bike.nickname && (
            <div className="truncate font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              «{bike.nickname}»
            </div>
          )}
        </div>
        {bike.year && (
          <span className="inline-flex items-center font-mono text-[11px] tabular-nums uppercase tracking-[0.2em] text-muted-foreground">
            <PlumpNum value={bike.year} size={12} />
          </span>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-display text-sm font-black uppercase  tracking-widest text-foreground">
        {title}
      </h2>
      {right && (
        <span className="font-mono text-[11px] tabular-nums uppercase tracking-[0.2em] text-muted-foreground">
          {right}
        </span>
      )}
    </div>
  );
}
