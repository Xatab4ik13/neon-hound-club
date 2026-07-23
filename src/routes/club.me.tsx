import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  PlumpArrowRight as ChevronRight,
  PlumpImage as ImageIcon,
  LogOut,
  PlumpMap as MapPin,
  PlumpPackage as Package,
  Pencil,
  Settings,
  PlumpTicket as TicketIcon,
  PlumpGarage as BikeIcon,
  PlumpDiamond as GemIcon,
  Trophy,
  Check,
  Lock,
} from "@/components/ui/icons";
import { PlumpNum } from "@/components/brand/PlumpNum";

import { SettingsModal } from "@/components/club/SettingsModal";
import { OrdersList } from "@/components/club/OrdersList";
import { useMyProfile, useBikes } from "@/lib/garage-api";
import { useViewer } from "@/hooks/use-viewer";
import {
  useRankState,
  setCustomPlaqueBg,
  getAvailablePlaqueBgs,
  getPlaqueBgRankIndex,
} from "@/data/rank-state";
import {
  fetchPassMe,
  fetchTicketsBalance,
  fetchMyRaffles,
  fetchMyOrders,
  qk,
  type RankInfo,
} from "@/lib/queries";
import { TIERS, type Tier } from "@/data/hell-pass";
import { RANKS, type PlaqueBg, type RankMeta } from "@/data/ranks";
import { PlaqueBackground } from "./club";
import { IOSListSection, IOSListRow } from "@/components/ios/IOSList";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { IOSConfirm } from "@/components/ios/IOSConfirm";
import { useIsMobile } from "@/hooks/use-mobile";


export const Route = createFileRoute("/club/me")({
  head: () => ({
    meta: [
      { title: `Профиль — клуб HELLHOUND` },
      { name: "description", content: "Личный кабинет райдера HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  // ?settings=1 — открыть SettingsModal на табе «Профиль» (например, при клике
  // «Подтвердить номер» с других страниц).
  validateSearch: (search: Record<string, unknown>): { settings?: "1" } => {
    const v = search.settings;
    return v === "1" || v === 1 ? { settings: "1" } : {};
  },
  component: MePage,
});

// Подписи фонов для выбора. Ключи совпадают с PlaqueBg.
const BG_LABELS: Record<PlaqueBg, string> = {
  rider: "Базовый",
  "pit-diamond": "Алмазы",
  "pit-carbon": "Карбон",
  "pit-hazard": "Хазард",
  "captain-speedlines": "Спидлайны",
  "captain-sweep": "Хром-свип",
  "captain-halftone": "Хэлфтон",
  "alpha-aurora": "Аврора",
  "alpha-grid": "Сетка",
  "alpha-claw": "Коготь",
  "legend-inferno": "Инферно",
  "legend-storm": "Шторм",
  "legend-chrome": "Хром",
  "legend-molten-gold": "Жидкое золото",
  "legend-cyber-rune": "Кибер-руна",
  "legend-holo-prism": "Голо-призма",
};

// Сводим backend-ранг (RankInfo) + кастомный фон → данные для UI плашки.
function deriveRankView(rank: RankInfo | null | undefined, customBg: PlaqueBg | null) {
  const rankIndex = Math.max(0, Math.min(RANKS.length - 1, rank?.rankIndex ?? 0));
  const meta: RankMeta = RANKS[rankIndex];
  const next: RankMeta | null = RANKS[rankIndex + 1] ?? null;
  const allowed = getAvailablePlaqueBgs(rankIndex);
  const plaqueBg: PlaqueBg =
    customBg && allowed.includes(customBg) ? customBg : meta.plaqueBg;
  const isMax = !!rank?.isMax;
  return {
    rank: meta,
    plaqueBg,
    next,
    xp: rank?.inRank ?? 0,
    xpMax: rank?.span ?? 0,
    xpPct: isMax ? 100 : (rank?.pct ?? 0),
    toNext: rank?.toNext ?? 0,
    isMax,
    rankIndex,
  };
}

function MePage() {
  const search = useSearch({ from: "/club/me" });
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(search.settings === "1");
  const [bgSheetOpen, setBgSheetOpen] = useState(false);
  const [ordersSheetOpen, setOrdersSheetOpen] = useState(false);

  // Снимаем ?settings=1 из URL после открытия, чтобы не открывалось повторно при рефреше.
  useEffect(() => {
    if (search.settings === "1") {
      setSettingsOpen(true);
      navigate({ to: "/club/me", search: {}, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.settings]);
  const isMobile = useIsMobile();
  const { isAuthed, signOut } = useViewer();
  const profileQ = useMyProfile(isAuthed);
  const passQ = useQuery({ queryKey: ["pass", "me"], queryFn: fetchPassMe, staleTime: 30_000, retry: false });
  const activeTierSlug = passQ.data?.active?.status === "active" ? passQ.data.active.tier : null;
  const tierInfo: Tier | null = activeTierSlug ? TIERS.find((t) => t.slug === activeTierSlug) ?? null : null;
  const passDaysLeft = passQ.data?.daysLeft ?? null;

  // Статистика
  const balanceQ = useQuery({
    queryKey: qk.ticketsBalance,
    queryFn: fetchTicketsBalance,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const rafflesQ = useQuery({
    queryKey: qk.myRaffles,
    queryFn: fetchMyRaffles,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const ordersQ = useQuery({
    queryKey: qk.shopOrders,
    queryFn: fetchMyOrders,
    enabled: isAuthed,
    staleTime: 30_000,
  });
  const bikesQ = useBikes(isAuthed);
  const totalOrders = ordersQ.data?.items.length ?? 0;

  const [confirmLogout, setConfirmLogout] = useState(false);
  const doLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = "/";
    }
  };
  const handleLogout = () => setConfirmLogout(true);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <ProfileHero onSettings={() => setSettingsOpen(true)} />

      {/* Статистика — 2×2 / 4×1 */}
      <section aria-label="Статистика" className="mt-6 md:mt-10">
        <StatGrid
          items={[
            { label: "Билеты", value: balanceQ.data?.balance ?? 0, icon: TicketIcon },
            {
              label: "Выигрыши",
              value: rafflesQ.data?.items.filter((r) => r.won).length ?? 0,
              icon: Trophy,
            },
            { label: "Заказы", value: totalOrders, icon: Package },
            { label: "Байки", value: bikesQ.data?.length ?? 0, icon: BikeIcon },
          ]}
        />
      </section>

      {/* Hell Pass */}
      <section aria-label="Hell Pass" className="mt-6 md:mt-10">
        {isMobile ? (
          <IOSListSection title="Подписка">
            <PassRow tier={tierInfo} daysLeft={passDaysLeft} />
            <IOSListRow
              icon={<ImageIcon className="h-5 w-5" />}
              label="Фон профиля"
              description="Открытые визуалы по твоему рангу"
              chevron
              onClick={() => setBgSheetOpen(true)}
            />
          </IOSListSection>
        ) : (
          <>
            <h2 className="mb-4 font-display text-2xl font-black  uppercase tracking-tight text-foreground md:text-3xl">
              Подписка
            </h2>
            <div className="space-y-2">
              <PassDesktopRow tier={tierInfo} daysLeft={passDaysLeft} />
              <ActionRow
                icon={<ImageIcon className="h-5 w-5" />}
                label="Фон профиля"
                description="Открытые визуалы по твоему рангу"
                onClick={() => setBgSheetOpen(true)}
              />
            </div>
          </>
        )}
      </section>

      {/* «Ранги и XP» убрано: отдельной страницы пока нет, ранг и XP видны в шапке профиля. */}




      {/* Заказы — последние 3 */}
      <section aria-label="Заказы" className="mt-6 md:mt-10">
        {isMobile ? (
          <h3 className="mb-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Заказы
          </h3>
        ) : (
          <h2 className="mb-4 font-display text-2xl font-black  uppercase tracking-tight text-foreground md:text-3xl">
            Заказы
          </h2>
        )}
        <OrdersList showFilters={false} limit={3} />
        {totalOrders > 3 && (
          <button
            type="button"
            onClick={() => setOrdersSheetOpen(true)}
            className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3.5 text-left transition-colors active:bg-white/[0.05]"
          >
            <span className="text-[15px] font-semibold text-foreground">
              Все заказы
            </span>
            <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider text-muted-foreground">
              {totalOrders}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        )}
      </section>

      <section aria-label="Настройки" className="mt-8 md:mt-12">
        {isMobile ? (
          <>
            <IOSListSection title="Аккаунт">
              <IOSListRow
                icon={<Settings className="h-5 w-5" />}
                label="Настройки профиля"
                description="Ник, фото, адрес, уведомления"
                chevron
                onClick={() => setSettingsOpen(true)}
              />
            </IOSListSection>
            <IOSListSection>
              <IOSListRow
                icon={<LogOut className="h-5 w-5" />}
                label="Выйти из клуба"
                tone="danger"
                onClick={handleLogout}
              />
            </IOSListSection>
          </>
        ) : (
          <>
            <h2 className="mb-4 font-display text-2xl font-black  uppercase tracking-tight text-foreground md:text-3xl">
              Настройки
            </h2>
            <div className="space-y-2">
              <ActionRow
                icon={<Settings className="h-5 w-5" />}
                label="Настройки профиля"
                description="Ник, фото, адрес, уведомления"
                onClick={() => setSettingsOpen(true)}
              />

              <ActionRow
                icon={<LogOut className="h-5 w-5" />}
                label="Выйти из клуба"
                tone="danger"
                onClick={handleLogout}
              />
            </div>
          </>
        )}
      </section>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      <BackgroundPickerSheet open={bgSheetOpen} onOpenChange={setBgSheetOpen} />
      <IOSSheet
        open={ordersSheetOpen}
        onOpenChange={setOrdersSheetOpen}
        title="Все заказы"
        fullHeight
      >
        <OrdersList />
      </IOSSheet>
      <IOSConfirm
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Выйти из клуба?"
        description="Чтобы вернуться, нужно будет войти заново."
        confirmLabel="Выйти"
        destructive
        onConfirm={doLogout}
      />
    </main>
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: number; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[];
}) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {items.map(({ label, value, icon: Icon }) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3.5"
        >
          <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
          <div className="flex min-w-0 flex-col">
            <span className="text-foreground md:scale-110 md:origin-left">
              <PlumpNum value={value} size={26} format />
            </span>

            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {label}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RankLadderCompact({ rankIndex }: { rankIndex: number }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
      {RANKS.map((r, i) => {
        const isPast = i < rankIndex;
        const isActive = i === rankIndex;
        const isFuture = i > rankIndex;
        return (
          <li
            key={r.id}
            className="flex items-center gap-3 px-4 py-3"
            style={
              isActive
                ? { boxShadow: `inset 3px 0 0 0 ${r.accent}` }
                : undefined
            }
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-xs font-black  uppercase"
              style={{
                backgroundColor: isActive || isPast ? r.accent : "rgba(255,255,255,0.04)",
                color: isActive || isPast ? r.onAccent : "rgba(167,167,167,0.6)",
              }}
            >
              {r.short}
            </div>
            <div
              className="min-w-0 flex-1 font-display text-base font-black  uppercase tracking-tight"
              style={{ color: isFuture ? "rgba(167,167,167,0.7)" : r.accent }}
            >
              {r.label}
            </div>
            {isActive && (
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Сейчас
              </span>
            )}
            {isPast && (
              <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                Пройдено
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}


function pluralDays(n: number) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день";
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return "дня";
  return "дней";
}

function PassRow({ tier, daysLeft }: { tier: Tier | null; daysLeft: number | null }) {
  if (!tier) {
    return (
      <IOSListRow
        icon={<GemIcon className="h-5 w-5" />}
        label="Без подписки"
        description="Открой Hell Pass и забери бонусы"
        chevron
        to="/club/hell-pass"
      />
    );
  }
  const desc =
    daysLeft != null
      ? `Осталось ${daysLeft} ${pluralDays(daysLeft)} · ${tier.tagline}`
      : tier.tagline;
  return (
    <IOSListRow
      icon={<GemIcon className="h-5 w-5" style={{ color: tier.color }} />}
      label={
        <span className="flex items-center gap-2">
          Hell Pass
          <span
            className="inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.15em]"
            style={{
              backgroundColor: `color-mix(in oklab, ${tier.color} 18%, transparent)`,
              color: tier.color,
              border: `1px solid color-mix(in oklab, ${tier.color} 40%, transparent)`,
            }}
          >
            {tier.name}
          </span>
        </span>
      }
      description={desc}
      chevron
      to={`/club/hell-pass/${tier.slug}`}
    />
  );
}

function PassDesktopRow({ tier, daysLeft }: { tier: Tier | null; daysLeft: number | null }) {
  if (!tier) {
    return (
      <ActionRow
        icon={<GemIcon className="h-5 w-5" />}
        label="Без подписки"
        description="Открой Hell Pass и забери бонусы"
        to="/club/hell-pass"
      />
    );
  }
  return (
    <Link
      to="/club/hell-pass/$tier"
      params={{ tier: tier.slug }}
      className="group flex w-full items-center gap-4 border border-white/[0.06] bg-card/40 px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-white/[0.03] md:px-5"
    >
      <span className="shrink-0" style={{ color: tier.color }}>
        <GemIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-display text-base font-black  uppercase tracking-tight text-foreground md:text-lg">
            Hell Pass
          </span>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-extrabold uppercase tracking-[0.2em]"
            style={{
              backgroundColor: `color-mix(in oklab, ${tier.color} 18%, transparent)`,
              color: tier.color,
              border: `1px solid color-mix(in oklab, ${tier.color} 40%, transparent)`,
            }}
          >
            {tier.name}
          </span>
          {daysLeft != null && (
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              · осталось {daysLeft} {pluralDays(daysLeft)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {tier.tagline}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function BackgroundPickerSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { customPlaqueBg } = useRankState();
  const profileQ = useMyProfile();
  const view = deriveRankView(profileQ.data?.rank, customPlaqueBg);
  const rankIndex = view.rankIndex;
  const rank = view.rank;
  const available = getAvailablePlaqueBgs(rankIndex);
  // полный список — чтобы показать заблокированные тоже
  const allBgs: PlaqueBg[] = Object.keys(BG_LABELS) as PlaqueBg[];
  const activeBg: PlaqueBg = customPlaqueBg ?? rank.plaqueBg;

  return (
    <IOSSheet open={open} onOpenChange={onOpenChange} title="Фон профиля" fullHeight>
      <div className="space-y-5">
        <p className="px-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Выбери визуал плашки. Новые фоны открываются с прокачкой ранга.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {allBgs.map((bg) => {
            const unlocked = available.includes(bg);
            const isActive = bg === activeBg;
            const requiredRankIdx = getPlaqueBgRankIndex(bg);
            const requiredRank = RANKS[requiredRankIdx];
            return (
              <button
                key={bg}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  if (!unlocked) return;
                  // если выбрали дефолт ранга — сбрасываем кастом
                  setCustomPlaqueBg(bg === rank.plaqueBg ? null : bg);
                }}
                className={`plaque-frozen group relative aspect-[4/3] overflow-hidden rounded-xl border text-left transition-all [contain:paint] ${
                  isActive
                    ? "border-primary ring-2 ring-primary/50"
                    : unlocked
                      ? "border-white/[0.08] hover:border-white/30"
                      : "border-white/[0.05] opacity-55"
                }`}
              >
                <PlaqueBackground bg={bg} />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
                    {BG_LABELS[bg]}
                  </span>
                  {isActive ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  ) : !unlocked ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                    </span>
                  ) : null}
                </div>
                {!unlocked && (
                  <div className="absolute left-2 top-2 rounded-sm bg-black/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {requiredRank.short}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {customPlaqueBg && (
          <button
            type="button"
            onClick={() => setCustomPlaqueBg(null)}
            className="w-full rounded-xl border border-white/[0.08] bg-card/40 px-4 py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            Сбросить к фону ранга
          </button>
        )}
      </div>
    </IOSSheet>
  );
}

function ProfileHero({ onSettings }: { onSettings: () => void }) {
  const { customPlaqueBg } = useRankState();
  const { nick: viewerNick } = useViewer();
  const profileQ = useMyProfile();
  const profile = profileQ.data;
  const { rank, plaqueBg, xp, xpMax, xpPct, isMax, next } = deriveRankView(
    profile?.rank,
    customPlaqueBg,
  );

  const nick = profile?.nick ?? viewerNick ?? "RIDER";
  const city = profile?.city ?? null;
  const joinedDate = profile?.joinedAt ? new Date(profile.joinedAt) : null;
  const joinedLabel = joinedDate
    ? joinedDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    : null;

  return (
    <section
      aria-label="Профиль"
      className="relative overflow-hidden border border-white/[0.06] bg-[#0b0b0b]"
    >
      <PlaqueBackground bg={plaqueBg} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60" />

      <div className="relative flex flex-col items-center gap-5 px-5 py-7 text-center md:flex-row md:items-center md:gap-7 md:p-9 md:text-left">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute -inset-1 rounded-full blur-2xl"
            style={{ backgroundColor: rank.accentSoft, animation: "xp-pulse 3s ease-in-out infinite" }}
          />
          <div
            className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-offset-4 ring-offset-[#0b0b0b] md:h-32 md:w-32"
            style={{ backgroundColor: rank.accent, boxShadow: `0 0 0 4px ${rank.accentSoft}` }}
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={nick}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)",
                    backgroundSize: "5px 5px",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="font-display text-4xl font-black  uppercase md:text-5xl"
                    style={{ color: rank.onAccent }}
                  >
                    {nick.slice(0, 2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-black  uppercase tracking-tight text-foreground md:text-4xl">
            {nick}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:justify-start">
            {city && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {city}
              </span>
            )}
            {profile && profile.bikesCount > 0 && (
              <span className="flex items-center gap-1.5">
                <BikeIcon className="h-3.5 w-3.5" />
                {profile.bikesCount} мото
              </span>
            )}
            {joinedLabel && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />в клубе с {joinedLabel}
              </span>
            )}
          </div>


          {/* Rank badge + XP bar */}
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span
                className="font-display text-lg font-black  uppercase tracking-tight md:text-xl"
                style={{ color: rank.accent }}
              >
                {rank.label}
              </span>

              {isMax ? (

                <span
                  className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: rank.accent }}
                >
                  MAX
                </span>
              ) : next ? (
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  до{" "}
                  <span className="font-bold" style={{ color: rank.accent }}>
                    {next.label}
                  </span>{" "}
                  · <span style={{ color: "hsl(var(--foreground))" }}><PlumpNum value={xpMax - xp} size={12} format /></span> XP
                </span>
              ) : null}
            </div>
            <div className="relative h-3 overflow-hidden rounded-sm bg-black/55 ring-1 ring-inset ring-white/10">
              <div
                className="absolute inset-y-0 left-0 overflow-hidden rounded-sm"
                style={{
                  width: `${xpPct}%`,
                  backgroundColor: rank.accent,
                  boxShadow: `0 0 12px ${rank.accentSoft}, 0 0 24px ${rank.accentSoft}`,
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-y-0 w-1/3"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                    animation: "xp-shimmer 2.8s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onSettings}
            aria-label="Редактировать профиль"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-black/45 text-foreground transition-colors hover:border-primary/60 hover:text-primary md:right-4 md:top-4"
          >
            <Pencil className="h-4 w-4" />
          </button>

        </div>
      </div>
    </section>
  );
}

function ActionRow({
  icon,
  label,
  description,
  onClick,
  to,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  to?: string;
  tone?: "default" | "danger";
}) {
  const isDanger = tone === "danger";
  const cls = `group flex w-full items-center gap-4 border bg-card/40 px-4 py-4 text-left transition-colors md:px-5 ${
    isDanger
      ? "border-white/[0.06] hover:border-red-500/40 hover:bg-red-500/[0.04]"
      : "border-white/[0.06] hover:border-primary/40 hover:bg-white/[0.03]"
  }`;
  const inner = (
    <>
      <span
        className={`shrink-0 ${isDanger ? "text-red-400/80 group-hover:text-red-400" : "text-primary"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-display text-base font-black  uppercase tracking-tight md:text-lg ${
            isDanger ? "text-red-400" : "text-foreground"
          }`}
        >
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight
        className={`h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
          isDanger ? "text-red-400/60" : "text-muted-foreground"
        }`}
      />
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
