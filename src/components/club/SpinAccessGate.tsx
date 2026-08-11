import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, PlumpBell, PlumpDownload, PlumpSpin } from "@/components/ui/icons";
import { hhToast as toast } from "@/lib/hh-toast";
import { haptic } from "@/hooks/use-haptic";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import type { SpinAccess } from "@/hooks/use-spin-access";

/**
 * Плашка-замок для HellSpin. Крутить можно только из установленного приложения
 * и только с включёнными пушами — иначе показываем два шага.
 */
export function SpinAccessGate({ access }: { access: SpinAccess }) {
  const [busy, setBusy] = useState(false);
  const install = useInstallPrompt();

  async function enable() {
    haptic("selection");
    setBusy(true);
    try {
      const res = await access.enablePush();
      if (res.ok) toast.success("Уведомления включены");
      else toast.error(res.reason ?? "Не удалось включить уведомления");
    } finally {
      setBusy(false);
    }
  }

  async function doInstall() {
    haptic("selection");
    const outcome = await install.promptInstall();
    if (outcome === "dismissed") toast.error("Установка отменена");
    else if (outcome === "unavailable")
      toast.error("Установи через меню браузера — значок ⋮");
  }


  return (
    <section
      aria-label="Доступ к HellSpin"
      className="mb-5 rounded-3xl border-[3px] border-foreground bg-[#FFD93D] p-4 text-black shadow-[8px_8px_0_0_hsl(var(--foreground))] md:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-[3px] border-foreground bg-card shadow-[3px_3px_0_0_hsl(var(--foreground))]">
          <PlumpSpin className="h-6 w-6 text-foreground" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-black/70">
            HellSpin закрыт
          </p>
          <h2 className="font-display text-lg font-black uppercase leading-tight tracking-tight md:text-xl">
            Только в приложении
          </h2>
        </div>
      </div>

      <p className="mt-3 text-[13px] font-semibold leading-snug text-black/80">
        Спины крутятся только из установленного приложения с включёнными уведомлениями — так мы
        успеваем сказать тебе о призе. Сделай два шага и колесо оживёт.
      </p>

      <div className="mt-4 space-y-2.5">
        <Step
          done={access.installed}
          num={1}
          icon={<PlumpDownload className="h-4 w-4" />}
          title="Установи приложение"
          hint="Добавь клуб на главный экран"
          action={
            access.installed ? null : install.canPrompt ? (
              <button
                type="button"
                onClick={doInstall}
                className="shrink-0 rounded-xl border-[3px] border-foreground bg-[#B6FF3C] px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-tight text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              >
                Установить
              </button>
            ) : (
              <Link
                to="/club/install"
                className="shrink-0 rounded-xl border-[3px] border-foreground bg-[#B6FF3C] px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-tight text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
              >
                Как
              </Link>
            )
          }

        />
        <Step
          done={access.pushEnabled}
          num={2}
          icon={<PlumpBell className="h-4 w-4" />}
          title="Включи уведомления"
          hint="Иначе не узнаешь о выигрыше"
          action={
            access.pushEnabled ? null : (
              <button
                type="button"
                onClick={enable}
                disabled={busy}
                className="shrink-0 rounded-xl border-[3px] border-foreground bg-[#B6FF3C] px-3 py-1.5 font-display text-[11px] font-black uppercase tracking-tight text-black shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_hsl(var(--foreground))] disabled:opacity-50"
              >
                {busy ? "…" : "Включить"}
              </button>
            )
          }
        />
      </div>
    </section>
  );
}

function Step({
  done,
  num,
  icon,
  title,
  hint,
  action,
}: {
  done: boolean;
  num: number;
  icon: React.ReactNode;
  title: string;
  hint: string;
  action: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-[3px] border-foreground px-3 py-2.5 shadow-[3px_3px_0_0_hsl(var(--foreground))] ${
        done ? "bg-[#B6FF3C]" : "bg-white"
      }`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border-[2px] border-foreground bg-black/5 text-black">
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[13px] font-black uppercase leading-tight tracking-tight text-black">
          {num}. {title}
        </span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-black/60">
          {done ? "Готово" : hint}
        </span>
      </span>
      {action}
    </div>
  );
}
