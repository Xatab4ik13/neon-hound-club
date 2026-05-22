import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bike,
  Bot,
  ChevronRight,
  Crown,
  Gift,
  LogOut,
  MapPin,
  Pencil,
  Settings,
  ShoppingBag,
  Target,
  Ticket,
  Trophy,
  UserPlus,
} from "lucide-react";
import { SettingsModal } from "@/components/club/SettingsModal";
import { BadgeCase } from "@/components/club/BadgeCase";
import { ME } from "@/data/profile";
import { useCurrentRank } from "@/data/rank-state";
import { TICKET_LEDGER, summarizeLedger } from "@/data/tickets-ledger";
import { PlaqueBackground } from "./club";
import { IOSListSection, IOSListRow } from "@/components/ios/IOSList";

export const Route = createFileRoute("/club/me")({
  head: () => ({
    meta: [
      { title: `Профиль ${ME.nick} — клуб HELLHOUND` },
      { name: "description", content: "Личный кабинет райдера HELLHOUND." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MePage,
});

function MePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const balance = summarizeLedger(TICKET_LEDGER).balance;

  const handleLogout = () => {
    if (typeof window !== "undefined" && window.confirm("Выйти из клуба?")) {
      window.location.href = "/";
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-3 md:px-8 md:pt-8">
      <ProfileHero onSettings={() => setSettingsOpen(true)} />

      <StatsTiles balance={balance} />

      <RankCard />

      <IOSListSection title="Клуб">
        <IOSListRow
          icon={<Crown className="h-5 w-5" />}
          label="Hell Pass"
          description="Подписка и тиры"
          to="/club/hell-pass"
          chevron
        />
        <IOSListRow
          icon={<Ticket className="h-5 w-5" />}
          label="Билеты"
          description="Баланс и история"
          to="/club/tickets"
          value={balance.toLocaleString("ru-RU")}
          chevron
        />
        <IOSListRow
          icon={<Gift className="h-5 w-5" />}
          label="Розыгрыши"
          description="Активные и завершённые"
          to="/club/raffles"
          chevron
        />
        <IOSListRow
          icon={<Target className="h-5 w-5" />}
          label="Квесты"
          description="Задания и награды"
          to="/club/quests"
          chevron
        />
      </IOSListSection>

      <IOSListSection title="Гараж и магазин">
        <IOSListRow
          icon={<Bike className="h-5 w-5" />}
          label="Гараж"
          description="Мото, документы, сервис"
          to="/club/garage"
          chevron
        />
        <IOSListRow
          icon={<Bot className="h-5 w-5" />}
          label="Hell AI"
          description="AI-механик по своему мото"
          to="/club/hell-ai"
          chevron
        />
        <IOSListRow
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Заказы"
          description="Мерч HELLHOUND"
          to="/club/orders"
          value={ME.totals.orders ? String(ME.totals.orders) : undefined}
          chevron
        />
        <IOSListRow
          icon={<UserPlus className="h-5 w-5" />}
          label="Пригласить друга"
          description="Реферальный бонус"
          to="/club/invite"
          chevron
        />
      </IOSListSection>

      <section aria-label="Значки" className="mb-5">
        <h3 className="mb-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Значки
        </h3>
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 p-4">
          <BadgeCase />
        </div>
      </section>

      <IOSListSection title="Аккаунт">
        <IOSListRow
          icon={<Settings className="h-5 w-5" />}
          label="Настройки профиля"
          description="Ник, фото, контакты, привязки"
          onClick={() => setSettingsOpen(true)}
          chevron
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

      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        HELLHOUND CLUB · v1.0
      </p>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}

function ProfileHero({ onSettings }: { onSettings: () => void }) {
  const { rank, plaqueBg } = useCurrentRank();

  return (
    <section
      aria-label="Профиль"
      className="relative mb-5 overflow-hidden rounded-3xl border border-white/[0.06] bg-[#0b0b0b]"
    >
      <PlaqueBackground bg={plaqueBg} />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />

      <div className="relative flex flex-col items-center gap-3 px-5 pb-6 pt-7 text-center">
        <div className="relative shrink-0">
          <div
            aria-hidden
            className="absolute -inset-1 rounded-full blur-2xl"
            style={{
              backgroundColor: rank.accentSoft,
              animation: "xp-pulse 3s ease-in-out infinite",
            }}
          />
          <div
            className="relative h-24 w-24 overflow-hidden rounded-full ring-4 ring-offset-2 ring-offset-[#0b0b0b]"
            style={{
              backgroundColor: rank.accent,
              boxShadow: `0 0 0 3px ${rank.accentSoft}`,
            }}
          >
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
                className="font-display text-3xl font-black italic uppercase"
                style={{ color: rank.onAccent }}
              >
                {ME.nick.slice(0, 2)}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black italic uppercase tracking-tight text-foreground">
            {ME.nick}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {ME.city}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" />
              {ME.bike}
            </span>
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            в клубе с {ME.joined}
          </div>
        </div>

        <button
          type="button"
          onClick={onSettings}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[13px] font-semibold text-foreground backdrop-blur-sm transition-colors active:bg-white/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          Редактировать
        </button>
      </div>
    </section>
  );
}

function StatsTiles({ balance }: { balance: number }) {
  const items = [
    {
      to: "/club/tickets" as const,
      label: "Билеты",
      value: balance.toLocaleString("ru-RU"),
      Icon: Ticket,
    },
    {
      to: "/club/raffles" as const,
      label: "Победы",
      value: String(ME.totals.wins),
      Icon: Trophy,
    },
    {
      to: "/club/orders" as const,
      label: "Заказы",
      value: String(ME.totals.orders),
      Icon: ShoppingBag,
    },
    {
      to: "/club/garage" as const,
      label: "Гараж",
      value: String(ME.totals.bikes),
      Icon: Bike,
    },
  ];
  return (
    <div className="mb-5 grid grid-cols-4 gap-2">
      {items.map(({ to, label, value, Icon }) => (
        <Link
          key={label}
          to={to}
          className="group flex flex-col items-center gap-1 rounded-2xl border border-white/[0.06] bg-card/40 px-2 py-3 text-center transition-colors active:bg-white/[0.04]"
        >
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-mono text-base font-bold tabular-nums text-foreground">
            {value}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </Link>
      ))}
    </div>
  );
}

function RankCard() {
  const { rank, xp, xpMax, xpPct, isMax, next } = useCurrentRank();
  const isPaid = !!rank.isPaid;

  return (
    <Link
      to="/club/rank"
      aria-label="Открыть страницу ранга"
      className="mb-5 block overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 px-4 py-3.5 transition-colors active:bg-white/[0.04]"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
          style={{ backgroundColor: rank.accentSoft, color: rank.accent }}
        >
          <Crown className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="font-display text-base font-black italic uppercase tracking-tight"
              style={{ color: rank.accent }}
            >
              {rank.label}
            </span>
            {isPaid ? (
              <span
                className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em]"
                style={{ color: rank.accent }}
              >
                {rank.priceLabel}
              </span>
            ) : isMax ? (
              <span
                className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em]"
                style={{ color: rank.accent }}
              >
                MAX
              </span>
            ) : next ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <span className="font-bold tabular-nums text-foreground">
                  {xpMax - xp}
                </span>{" "}
                XP до {next.label}
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${xpPct}%`,
                backgroundColor: rank.accent,
                boxShadow: `0 0 8px ${rank.accentSoft}`,
              }}
            />
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
