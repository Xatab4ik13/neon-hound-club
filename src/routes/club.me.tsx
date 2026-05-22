import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, Calendar, ChevronRight, LogOut, MapPin, Pencil, Settings } from "lucide-react";
import { SettingsModal } from "@/components/club/SettingsModal";
import { BadgeCase } from "@/components/club/BadgeCase";
import { ME } from "@/data/profile";
import { useCurrentRank } from "@/data/rank-state";
import { PlaqueBackground } from "./club";

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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <ProfileHero onSettings={() => setSettingsOpen(true)} />

      <section aria-label="Значки" className="mt-8 md:mt-12">
        <h2 className="mb-4 font-display text-2xl font-black italic uppercase tracking-tight text-foreground md:text-3xl">
          Значки
        </h2>
        <BadgeCase />
      </section>

      <section aria-label="Настройки" className="mt-8 md:mt-12">
        <h2 className="mb-4 font-display text-2xl font-black italic uppercase tracking-tight text-foreground md:text-3xl">
          Настройки
        </h2>
        <div className="space-y-2">
          <ActionRow
            icon={<Settings className="h-5 w-5" />}
            label="Профиль и аккаунт"
            description="Ник, фото, контакты, привязки"
            onClick={() => setSettingsOpen(true)}
          />
          <ActionRow
            icon={<LogOut className="h-5 w-5" />}
            label="Выйти из клуба"
            tone="danger"
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Выйти из клуба?")) {
                // TODO: подключить supabase.auth.signOut
                window.location.href = "/";
              }
            }}
          />
        </div>
      </section>

      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </main>
  );
}

function ProfileHero({ onSettings }: { onSettings: () => void }) {
  const { rank, plaqueBg, xp, xpMax, xpPct, isMax, next } = useCurrentRank();
  const isPaid = !!rank.isPaid;

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
                className="font-display text-4xl font-black italic uppercase md:text-5xl"
                style={{ color: rank.onAccent }}
              >
                {ME.nick.slice(0, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Identity */}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-black italic uppercase tracking-tight text-foreground md:text-4xl">
            {ME.nick}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:justify-start">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {ME.city}
            </span>
            <span className="flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5" />
              {ME.bike}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />в клубе с {ME.joined}
            </span>
          </div>

          {/* Rank badge + XP bar */}
          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <Link
                to="/club/rank"
                className="font-display text-lg font-black italic uppercase tracking-tight transition-opacity hover:opacity-80 md:text-xl"
                style={{ color: rank.accent }}
              >
                {rank.label}
              </Link>
              {isPaid ? (
                <span
                  className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em]"
                  style={{ color: rank.accent }}
                >
                  {rank.priceLabel}
                </span>
              ) : isMax ? (
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
                  · <span className="font-bold tabular-nums text-foreground">{xpMax - xp}</span> XP
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
            className="mt-5 inline-flex items-center gap-2 border border-white/[0.12] bg-black/40 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
            Редактировать профиль
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
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-4 border bg-card/40 px-4 py-4 text-left transition-colors md:px-5 ${
        isDanger
          ? "border-white/[0.06] hover:border-red-500/40 hover:bg-red-500/[0.04]"
          : "border-white/[0.06] hover:border-primary/40 hover:bg-white/[0.03]"
      }`}
    >
      <span
        className={`shrink-0 ${isDanger ? "text-red-400/80 group-hover:text-red-400" : "text-primary"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block font-display text-base font-black italic uppercase tracking-tight md:text-lg ${
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
    </button>
  );
}
