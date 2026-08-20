// HOUND HUNT — два режима одной страницы: продающий лендинг и само шоу.
// Пока фича в разработке, сверху висит dev-тумблер (HH_DEV_TOGGLE), чтобы
// можно было спускать гончую в любой момент. В прод достаточно выключить флаг.
// Доступ только из PWA: вся вёрстка и анимации рассчитаны на приложение.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { HuntLanding } from "@/components/club/hound-hunt/HuntLanding";
import { HuntShow } from "@/components/club/hound-hunt/HuntShow";
import { EmberField } from "@/components/club/hound-hunt/EmberField";
import { RiderCharacter } from "@/components/club/hound-hunt/RiderCharacter";
import { isStandalonePWA } from "@/lib/is-pwa";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Dev-тумблер режимов. Выключить, когда шоу пойдёт по расписанию. */
const HH_DEV_TOGGLE = true;

export const Route = createFileRoute("/club/hound-hunt")({
  head: () => ({
    meta: [
      { title: "HOUND HUNT — клуб HELLHOUND" },
      { name: "description", content: "Шоу-розыгрыш для владельцев Hell Pass Platinum." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HoundHuntRoute,
});

type Mode = "landing" | "show";

function HoundHuntRoute() {
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<Mode>("landing");
  const [pwa, setPwa] = useState<boolean | null>(null);

  useEffect(() => {
    setPwa(isStandalonePWA());
  }, []);

  if (!isMobile) return <NotInApp desktop />;
  if (pwa === null) return <div className="min-h-[100svh] bg-background" />;
  if (!pwa && !HH_DEV_TOGGLE) return <NotInApp />;

  return (
    <div className="relative overflow-x-hidden">
      {HH_DEV_TOGGLE && <ModeToggle mode={mode} onChange={setMode} />}
      <div className={mode === "landing" ? "visible" : "invisible pointer-events-none"}>
        <HuntLanding onEnterShow={() => setMode("show")} />
      </div>
      <div
        className={cn(
          "absolute inset-x-0 top-0",
          mode === "show" ? "visible" : "invisible pointer-events-none",
        )}
      >
        <HuntShow />
      </div>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[60] flex justify-center">
      <div className="pointer-events-auto flex gap-1 rounded-full border border-border/60 bg-background/80 p-1 backdrop-blur">
        {(["landing", "show"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={cn(
              "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition",
              mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {m === "landing" ? "лендинг" : "шоу"}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Заглушка: охота живёт только в установленном приложении на телефоне. */
function NotInApp({ desktop = false }: { desktop?: boolean }) {
  return (
    <div className="relative flex min-h-[100svh] flex-col items-center justify-center gap-5 overflow-hidden bg-black px-8 text-center">
      <EmberField className="pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-40">
          <RiderCharacter mode="idle" className="h-40 w-40" />
        </div>
        <h1 className="font-display text-2xl uppercase tracking-tight text-white">Hound Hunt</h1>
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
