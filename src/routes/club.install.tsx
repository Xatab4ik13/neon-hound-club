// Гайд по установке клуба как PWA в iOS-стиле.
// Показываем только iPhone/iPad и Android. На Android, если браузер
// поддерживает beforeinstallprompt — даём настоящую кнопку «Установить».
// Если не поддерживает (или уже установлено) — короткая инструкция.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Apple, Bell, BellOff, Check, Download, Share, Smartphone, Sparkles, Ticket } from "lucide-react";
import { PageHeader } from "@/components/club/PageHeader";
import {
  getPushPermission,
  getPushSubscription,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";

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

type Platform = "ios" | "android";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "android";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return "android";
}

// beforeinstallprompt: в стандартных типах его нет, описываем минимально.
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("android");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());

    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(!!standalone);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installNow() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  return (
    <main
      className="mx-auto w-full max-w-md px-4 py-5"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Установить" subtitle="Клуб в кармане" />

      {/* Reward hero card — единый iOS-стиль как на /club/invite */}
      <section className="mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card/60 to-black px-5 py-6">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <Bell className="h-3.5 w-3.5" />
          Пуши и быстрый доступ
        </div>
        <div className="mt-2 font-display text-[26px] font-black italic uppercase leading-tight tracking-tight text-foreground">
          Поставь клуб на&nbsp;экран
        </div>
        <p className="mt-2 text-[14px] leading-snug text-muted-foreground">
          Без App Store — открывается как обычное приложение, присылает пуши о
          новых розыгрышах, постах и ответах.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Reward icon={<Sparkles className="h-3.5 w-3.5" />} text="+200 XP" />
          <Reward icon={<Ticket className="h-3.5 w-3.5" />} text="+1 билет" />
        </div>
      </section>

      {/* Platform switcher — iOS segmented control */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.06] bg-card/40 p-1">
        <SegBtn
          active={platform === "ios"}
          onClick={() => setPlatform("ios")}
          icon={<Apple className="h-4 w-4" />}
          label="iPhone / iPad"
        />
        <SegBtn
          active={platform === "android"}
          onClick={() => setPlatform("android")}
          icon={<Smartphone className="h-4 w-4" />}
          label="Android"
        />
      </div>

      {installed && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <Check className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-foreground">
              Уже установлено
            </div>
            <div className="text-[12px] text-muted-foreground">
              Ты открыл клуб из приложения — награда уже зачислена.
            </div>
          </div>
        </div>
      )}

      {platform === "android" && !installed && (
        <AndroidInstall canInstall={!!deferred} onInstall={installNow} />
      )}

      {platform === "ios" && <IosGuide />}

      <PushBlock />
    </main>
  );
}

function PushBlock() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(isPushSupported());
    void getPushPermission().then(setPermission);
    void getPushSubscription().then((s) => setSubscribed(!!s));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    const res = await subscribeToPush();
    setBusy(false);
    if (!res.ok) {
      setError(res.reason ?? "Не удалось включить уведомления.");
      return;
    }
    setSubscribed(true);
    setPermission("granted");
  }

  async function disable() {
    setBusy(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setBusy(false);
  }

  if (!supported) {
    return (
      <section className="mb-5 rounded-2xl border border-white/[0.06] bg-card/40 p-4 text-[13px] text-muted-foreground">
        Этот браузер не умеет пуш-уведомления. Открой клуб в установленном
        приложении (домашний экран) — там пуши работают.
      </section>
    );
  }

  return (
    <section className="mb-5 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
        <Bell className="h-3.5 w-3.5" />
        Пуш-уведомления
      </div>
      <p className="mb-4 text-[13px] leading-snug text-muted-foreground">
        Узнавай первым про новые розыгрыши, посты в ленте и поступившие товары.
        Без спама — только важное.
      </p>
      {subscribed ? (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-3 font-mono text-[12px] font-bold uppercase tracking-wider text-foreground active:scale-[0.98] disabled:opacity-50"
        >
          <BellOff className="h-4 w-4" />
          Отключить уведомления
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy || permission === "denied"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-[14px] font-black uppercase italic tracking-wider text-primary-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Bell className="h-4 w-4" />
          {permission === "denied" ? "Уведомления заблокированы" : "Включить уведомления"}
        </button>
      )}
      {permission === "denied" && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Разреши уведомления в настройках сайта в браузере, а затем вернись.
        </p>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-red-300">{error}</p>
      )}
    </section>
  );
}

function Reward({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
      <span className="text-primary">{icon}</span>
      {text}
    </span>
  );
}

function SegBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors active:scale-[0.98] ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AndroidInstall({
  canInstall,
  onInstall,
}: {
  canInstall: boolean;
  onInstall: () => void;
}) {
  return (
    <>
      <section className="mb-5 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
        <button
          type="button"
          onClick={onInstall}
          disabled={!canInstall}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-display text-[15px] font-black uppercase italic tracking-wider text-primary-foreground transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Установить приложение
        </button>
        <p className="mt-3 text-center text-[12px] leading-snug text-muted-foreground">
          {canInstall
            ? "Жми кнопку — Android спросит разрешение и сам поставит иконку на главный экран."
            : "Открой эту страницу в Chrome — там появится кнопка автоматической установки. На других браузерах используй пункт «Установить» в меню."}
        </p>
      </section>

      <Steps
        title="Если кнопка не сработала"
        steps={[
          "Открой меню браузера (⋮ в правом верхнем углу).",
          "Выбери «Установить приложение» или «Добавить на главный экран».",
          "Подтверди — иконка появится на рабочем столе.",
          "Запусти с иконки и разреши уведомления.",
        ]}
      />
    </>
  );
}

function IosGuide() {
  return (
    <>
      <Steps
        title="Установка"
        steps={[
          "Открой клуб в Safari (Chrome на iOS не умеет ставить PWA).",
          <>
            Нажми кнопку{" "}
            <span className="inline-flex translate-y-[1px] items-center gap-1 align-middle text-primary">
              <Share className="h-3.5 w-3.5" />
              «Поделиться»
            </span>{" "}
            внизу экрана.
          </>,
          'В списке выбери «На экран „Домой"» (Add to Home Screen).',
          "Подтверди — иконка клуба появится на рабочем столе.",
          "Открой клуб с иконки и разреши уведомления, когда спросит.",
        ]}
        footer="Только Safari. На iOS 16.4 и новее уведомления работают, на старых — нет."
      />
    </>
  );
}

function Steps({
  title,
  steps,
  footer,
}: {
  title: string;
  steps: React.ReactNode[];
  footer?: string;
}) {
  return (
    <section className="mb-5">
      <h3 className="mb-1.5 px-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <ol className="overflow-hidden rounded-2xl border border-white/[0.06] bg-card/40 divide-y divide-white/[0.05]">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3.5">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">
              {i + 1}
            </span>
            <span className="pt-0.5 text-[14px] leading-snug text-foreground/90">
              {s}
            </span>
          </li>
        ))}
      </ol>
      {footer && (
        <p className="mt-1.5 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
          {footer}
        </p>
      )}
    </section>
  );
}
