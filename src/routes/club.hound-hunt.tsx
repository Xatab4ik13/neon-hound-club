// HELL HUNT — одна страница, состояние берётся из времени старта:
//   betting/locked → лендинг с приёмом билетов
//   live           → шоу стартует само, без кнопок
//   replay         → сутки после старта: итоги + можно посмотреть запись
//   idle           → ждём новую дату из админки, снова лендинг

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HuntLanding } from "@/components/club/hound-hunt/HuntLanding";
import { HuntShow } from "@/components/club/hound-hunt/HuntShow";
import { useHuntConfig } from "@/components/club/hound-hunt/hh-config";
import { useHuntPhase } from "@/components/club/hound-hunt/hh-phase";

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
  const { cfg } = useHuntConfig();
  const { phase } = useHuntPhase(cfg.startsAt);
  /** Реплей запускается только по кнопке — иначе шоу крутилось бы сутки. */
  const [replayOpen, setReplayOpen] = useState(false);

  /**
   * Репетиция: `?preview=1` открывает шоу в любой фазе (для админа перед
   * стартом). Ничего не пишет на бек — победители считаются локально.
   */
  const preview =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).has("preview");

  // Новая охота (сменилась дата старта) — закрываем прошлую запись.
  useEffect(() => {
    setReplayOpen(false);
  }, [cfg.startsAt]);

  if (preview) return <HuntShow mode="live" />;
  if (phase === "live") return <HuntShow mode="live" />;
  if (phase === "replay" && replayOpen) return <HuntShow mode="replay" />;


  return (
    <div className="relative overflow-x-hidden">
      <HuntLanding onEnterShow={() => setReplayOpen(true)} />
    </div>
  );
}
