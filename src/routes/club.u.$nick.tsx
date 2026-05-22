import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bike, Calendar, MapPin, Trophy } from "lucide-react";
import { BadgeIcon } from "@/components/club/BadgeIcon";
import { BADGES, RARITY } from "@/data/badges";
import { RANKS, getRankSpan, type RankId } from "@/data/ranks";
import { getUser, type PublicUser } from "@/data/users";
import { PlaqueBackground } from "./club";
import { usePublicProfile, type PublicProfile } from "@/lib/garage-api";

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

// Бэк отдаёт реальный rank/xpPct в `p.rank`. Маппим id 1:1.
const DEFAULT_RANK: RankId = "rookie";

function fromServer(p: PublicProfile, fallbackMock: PublicUser | undefined): PublicUser {
  const initials = (p.nick.match(/[A-Za-zА-Яа-я0-9]/g) ?? [p.nick[0] ?? "?"])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const joinedDate = new Date(p.joinedAt);
  const joined = joinedDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const bikeStr = p.primaryBike
    ? `${p.primaryBike.brand} ${p.primaryBike.model}`.trim()
    : undefined;
  const rankId = (RANKS.find((r) => r.id === p.rank.rankId)?.id ?? DEFAULT_RANK) as RankId;
  return {
    slug: p.nick.toLowerCase(),
    nick: p.nick,
    initials,
    rank: rankId,
    xpPct: p.rank.pct,
    role: p.role === "admin" ? "owner" : fallbackMock?.role ?? "rider",
    city: p.city ?? undefined,
    bike: bikeStr,
    joined,
    badgeIds: fallbackMock?.badgeIds ?? [],
    wins: fallbackMock?.wins ?? [],
    avatarUrl: p.avatarUrl ?? undefined,
  };
}

function UserProfilePage() {
  const { nick } = Route.useParams();
  const q = usePublicProfile(nick);
  const mock = getUser(nick);

  if (q.isLoading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center md:px-8">
        <p className="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
          Загружаем профиль…
        </p>
      </main>
    );
  }

  // Если бэк отдал 404 — пробуем mock (для seeded-ников). Если и там пусто — not found.
  const user: PublicUser | null = q.data ? fromServer(q.data, mock) : mock ?? null;
  if (!user) {
    if (q.isError) throw q.error;
    return <NotFoundUser nick={nick} />;
  }
  return <UserView user={user} />;
}

function NotFoundUser({ nick }: { nick: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center md:px-8">
      <h1 className="font-display text-2xl font-black uppercase italic text-foreground">
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

function UserView({ user }: { user: PublicUser }) {
  const rank = RANK_BY_ID[user.rank];
  const rankIdx = RANKS.findIndex((r) => r.id === user.rank);
  const xpMax = getRankSpan(rankIdx);
  const xp = Math.round((user.xpPct / 100) * xpMax);
  const next = RANKS[rankIdx + 1] ?? null;

  const badges = user.badgeIds
    .map((id) => BADGES.find((b) => b.id === id))
    .filter((b): b is (typeof BADGES)[number] => !!b);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link
        to="/club"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-3 w-3" />
        Лента
      </Link>

      {/* Hero / шапка профиля */}
      <section className="relative mb-8 overflow-hidden border border-white/[0.06] bg-card/40 p-6 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            background: `radial-gradient(60% 100% at 0% 0%, ${rank.accentSoft}, transparent 70%)`,
          }}
        />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          {/* avatar в плашке ранга */}
          <div
            className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden md:h-32 md:w-32"
            style={{ boxShadow: `0 0 0 2px ${rank.accentSoft}` }}
          >
            <PlaqueBackground bg={rank.plaqueBg} />
            <div
              aria-hidden
              className="absolute inset-0 z-[1]"
              style={{ border: `2px solid ${rank.accent}`, opacity: 0.9 }}
            />
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.nick}
                className="absolute inset-0 z-[2] h-full w-full object-cover"
              />
            ) : (
              <span
                className="relative z-[2] font-display text-3xl font-black uppercase italic md:text-4xl"
                style={{
                  color: rank.accent,
                  textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                }}
              >
                {user.initials}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-2xl font-black uppercase italic tracking-tight text-foreground md:text-3xl">
                {user.nick}
              </h1>
              {user.role === "owner" && <Tag tone="primary">OWNER</Tag>}
              {user.role === "team" && <Tag tone="primary">TEAM</Tag>}
              <span
                className="border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                style={{ color: rank.accent, borderColor: rank.accentSoft }}
              >
                {rank.label}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
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

            {/* XP / прогресс */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span>Прогресс</span>
                {!next ? (
                  <span className="font-extrabold" style={{ color: rank.accent }}>
                    MAX
                  </span>
                ) : (
                  <span>
                    до{" "}
                    <span className="font-bold" style={{ color: rank.accent }}>
                      {next.label}
                    </span>{" "}
                    ·{" "}
                    <span className="font-bold tabular-nums text-foreground">
                      {xpMax - xp}
                    </span>{" "}
                    XP
                  </span>
                )}
              </div>
              <div className="relative h-2.5 overflow-hidden bg-black/55 ring-1 ring-inset ring-white/10">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${user.xpPct}%`,
                    backgroundColor: rank.accent,
                    boxShadow: `0 0 10px ${rank.accentSoft}`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                <span className="font-bold uppercase tracking-[0.2em]" style={{ color: rank.accent }}>
                  {rank.label}
                </span>
                <span>
                  <span className="font-bold text-foreground">
                    {xp.toLocaleString("ru-RU")}
                  </span>{" "}
                  <span className="opacity-40">/</span>{" "}
                  {xpMax.toLocaleString("ru-RU")} XP
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Значки */}
      <section className="mb-8">
        <SectionTitle title="Значки" right={`${badges.length}`} />
        {badges.length === 0 ? (
          <EmptyHint>Пока без значков.</EmptyHint>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {badges.map((b) => {
              const r = RARITY[b.rarity];
              return (
                <li
                  key={b.id}
                  className="group flex flex-col items-center gap-2 border border-white/[0.06] bg-card/40 p-3 transition-colors hover:border-white/[0.12]"
                  title={`${b.name} — ${b.description}`}
                >
                  <BadgeIcon
                    id={b.id}
                    color={r.color}
                    soft={r.soft}
                    size={56}
                    animated
                    premium={b.rarity === "legendary" || b.rarity === "mythic"}
                  />
                  <span
                    className="truncate text-center font-mono text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: r.color }}
                  >
                    {b.name}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Победы */}
      <section className="mb-8">
        <SectionTitle title="Победы в розыгрышах" right={`${user.wins.length}`} />
        {user.wins.length === 0 ? (
          <EmptyHint>Пока без побед — впереди.</EmptyHint>
        ) : (
          <ul className="space-y-2">
            {user.wins.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 border border-white/[0.06] bg-card/40 px-4 py-3"
              >
                <Trophy className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 truncate text-[14px] text-foreground">{w.title}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {w.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="font-display text-sm font-black uppercase italic tracking-widest text-foreground">
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-white/[0.08] bg-card/20 px-4 py-6 text-center font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function Tag({ tone, children }: { tone: "primary"; children: React.ReactNode }) {
  void tone;
  return (
    <span className="border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}
