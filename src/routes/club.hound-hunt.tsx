// HELL HUNT — одна страница, состояние берётся из времени старта:
//   betting/locked → лендинг с приёмом билетов
//   live           → шоу стартует само, без кнопок
//   replay         → сутки после старта: итоги + можно посмотреть запись
//   idle           → ждём новую дату из админки, снова лендинг
// Доступ только из PWA: вся вёрстка и анимации рассчитаны на приложение.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HuntLanding } from "@/components/club/hound-hunt/HuntLanding";
import { HuntShow } from "@/components/club/hound-hunt/HuntShow";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { useHuntConfig } from "@/components/club/hound-hunt/hh-config";
import { useHuntPhase } from "@/components/club/hound-hunt/hh-phase";
import { isStandalonePWA } from "@/lib/is-pwa";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/club/hound-hunt")({
  head: () => ({
    meta: [
      { title: "HELL HUNT — клуб HELLHOUND" },
      { name: "description", content: "Шоу-розыгрыш для владельцев Hell Pass Platinum." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HoundHuntRoute,
});

function HoundHuntRoute() {
  const isMobile = useIsMobile();
  const { cfg } = useHuntConfig();
  const { phase } = useHuntPhase(cfg.startsAt);
  const [pwa, setPwa] = useState<boolean | null>(null);
  /** Реплей запускается только по кнопке — иначе шоу крутилось бы сутки. */
  const [replayOpen, setReplayOpen] = useState(false);

  useEffect(() => {
    setPwa(isStandalonePWA());
  }, []);

  // Новая охота (сменилась дата старта) — закрываем прошлую запись.
  useEffect(() => {
    setReplayOpen(false);
  }, [cfg.startsAt]);

  if (!isMobile) return <NotInApp desktop />;
  if (pwa === null) return <div className="min-h-[100svh] bg-background" />;
  if (!pwa) return <NotInApp />;

  if (phase === "live") return <HuntShow mode="live" />;
  if (phase === "replay" && replayOpen) return <HuntShow mode="replay" />;

  return (
    <div className="relative overflow-x-hidden">
      <HuntLanding onEnterShow={() => setReplayOpen(true)} />
    </div>
  );
}

/** Заглушка: охота живёт только в установленном приложении на телефоне. */
function NotInApp({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center gap-5 overflow-hidden bg-black px-8 text-center">
      <EmberField className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <h1 className="font-display text-2xl uppercase tracking-tight text-white">Hell Hunt</h1>
        <p className="max-w-xs text-sm leading-relaxed text-white/50">
          {desktop
            ? "Охота идёт только в приложении на телефоне. Открой клуб с мобильного или установи приложение."
            : "Охота доступна только в установленном приложении. Добавь клуб на главный экран и заходи оттуда."}
        </p>
        <Link
          to="/club"
          className="rounded-full border border-white/15 px-5 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70"
        >
          В клуб
        </Link>
      </div>
    </div>
  );
}
