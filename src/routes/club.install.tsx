// Гайд по установке клуба как PWA. Определяем платформу пользователя и
// показываем подходящую инструкцию. После установки веб-приложения у нас
// будут работать пуш-уведомления — это и есть «клуб в кармане».

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Smartphone, Monitor, Apple, Bell } from "lucide-react";

export const Route = createFileRoute("/club/install")({
  head: () => ({
    meta: [
      { title: "Установить приложение — клуб HELLHOUND" },
      {
        name: "description",
        content:
          "Поставь клуб HELLHOUND на главный экран и получай пуш-уведомления о розыгрышах и постах.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InstallPage,
});

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  // iPadOS 13+ маскируется под Mac, но это touch-устройство
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-10">
      <Link
        to="/club/quests"
        className="mb-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />К челленджам
      </Link>

      <header className="mb-8 border border-white/[0.06] bg-card/40 p-6 md:p-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Клуб в кармане
        </div>
        <h1 className="mt-2 font-display text-3xl font-black uppercase italic tracking-tight text-foreground md:text-4xl">
          Установи приложение
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Клуб — это PWA: устанавливается из браузера, без App Store. После
          установки получишь пуш-уведомления о новых розыгрышах, постах и
          ответах в комментариях. Награда: <b className="text-foreground">+200 XP</b> и{" "}
          <b className="text-foreground">1 билет</b>.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-primary">
          <Bell className="h-3 w-3" />
          Уведомления включаются после установки
        </div>
      </header>

      <div className="mb-4 flex gap-2 font-mono text-[10px] uppercase tracking-wider">
        {(
          [
            { id: "ios", label: "iPhone / iPad", icon: Apple },
            { id: "android", label: "Android", icon: Smartphone },
            { id: "desktop", label: "Десктоп", icon: Monitor },
          ] as const
        ).map((tab) => {
          const active = platform === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPlatform(tab.id)}
              className={`flex items-center gap-2 border px-3 py-2 transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-white/[0.06] text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {platform === "ios" && <IosGuide />}
      {platform === "android" && <AndroidGuide />}
      {platform === "desktop" && <DesktopGuide />}
    </main>
  );
}

function Guide({ steps, note }: { steps: string[]; note?: string }) {
  return (
    <section className="border border-white/[0.06] bg-card/40 p-6">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-foreground">
            <span className="grid h-6 w-6 shrink-0 place-items-center border border-primary/40 bg-primary/10 font-mono text-xs font-bold text-primary">
              {i + 1}
            </span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      {note && (
        <p className="mt-4 border-t border-white/[0.06] pt-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {note}
        </p>
      )}
    </section>
  );
}

function IosGuide() {
  return (
    <Guide
      steps={[
        "Открой клуб в Safari (Chrome на iOS не умеет ставить PWA).",
        "Нажми кнопку «Поделиться» внизу экрана — квадрат со стрелкой вверх.",
        "В списке выбери «На экран „Домой“» (Add to Home Screen).",
        "Подтверди — иконка клуба появится на рабочем столе.",
        "Открой клуб с иконки и разреши уведомления, когда спросит.",
      ]}
      note="Только Safari. На iOS 16.4+ уведомления работают, на более старых — нет."
    />
  );
}

function AndroidGuide() {
  return (
    <Guide
      steps={[
        "Открой клуб в Chrome (или другом современном браузере).",
        "Внизу появится плашка «Установить приложение» — нажми её.",
        "Если плашки нет, открой меню браузера (⋮) → «Установить приложение».",
        "Подтверди — иконка появится на рабочем столе.",
        "Запусти с иконки и разреши уведомления.",
      ]}
    />
  );
}

function DesktopGuide() {
  return (
    <Guide
      steps={[
        "Открой клуб в Chrome, Edge или Arc.",
        "В адресной строке справа появится иконка «Установить» (монитор со стрелкой).",
        "Нажми её и подтверди установку.",
        "Клуб откроется в отдельном окне без вкладок — как обычное приложение.",
      ]}
      note="На десктопе уведомления работают, пока браузер запущен в фоне."
    />
  );
}
