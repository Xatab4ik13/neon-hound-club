import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, PlumpBell, PlumpDownload, PlumpSpin } from "@/components/ui/icons";
import { hhToast as toast } from "@/lib/hh-toast";
import { haptic } from "@/hooks/use-haptic";
import { useInstallPrompt } from "@/hooks/use-install-prompt";
import type { SpinAccess } from "@/hooks/use-spin-access";

/**
 * Плашка-замок для HellSpin. Крутить можно только из установленного приложения
 * и только с включёнными пушами.
 *
 * Спокойный серый вид: чек-лист из двух шагов, у каждого — кнопка действия и
 * кнопка «Проверить» (браузер часто не сообщает об изменениях сам, поэтому
 * статус можно перечитать вручную).
 */
export function SpinAccessGate({ access }: { access: SpinAccess }) {
  const [busy, setBusy] = useState(false);
  const [checkingStep, setCheckingStep] = useState<null | 1 | 2>(null);
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
    else if (outcome === "unavailable") toast.error("Установи через меню браузера — значок ⋮");
  }

  async function recheck(step: 1 | 2) {
    haptic("selection");
    setCheckingStep(step);
    try {
      const res = await access.recheck();
      const ok = step === 1 ? res.installed : res.pushEnabled;
      if (ok) toast.success("Готово");
      else
        toast.error(
          step === 1 ? "Приложение пока не установлено" : "Уведомления пока не включены",
        );
    } finally {
      setCheckingStep(null);
    }
  }

  return (
    <section
      aria-label="Доступ к HellSpin"
      className="mb-5 rounded-3xl border border-white/[0.07] bg-card/50 p-4 md:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/[0.07] bg-white/[0.04] text-muted-foreground">
          <PlumpSpin className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            HellSpin закрыт
          </p>
          <h2 className="font-display text-lg font-black uppercase leading-tight tracking-tight text-foreground md:text-xl">
            Только в приложении
          </h2>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
        Спины крутятся только из установленного приложения с включёнными уведомлениями — так мы
        успеваем сказать тебе о призе. Сделай два шага и нажми «Проверить».
      </p>

      <div className="mt-4 space-y-2">
        <Step
          done={access.installed}
          num={1}
          icon={<PlumpDownload className="h-4 w-4" />}
          title="Установи приложение"
          hint="Добавь клуб на главный экран"
          checking={checkingStep === 1}
          onRecheck={() => void recheck(1)}
          action={
            install.canPrompt ? (
              <ActionBtn onClick={doInstall}>Установить</ActionBtn>
            ) : (
              <Link
                to="/club/install"
                className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.1]"
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
          checking={checkingStep === 2}
          onRecheck={() => void recheck(2)}
          action={
            <ActionBtn onClick={enable} disabled={busy}>
              {busy ? "…" : "Включить"}
            </ActionBtn>
          }
        />
      </div>

      {!access.installed && (
        <p className="mt-3 px-1 text-[11px] leading-snug text-muted-foreground/70">
          Кнопка не сработала? Открой меню браузера <span className="font-bold">⋮</span> (правый
          верхний угол) → «Установить приложение» или «Добавить на главный экран».
        </p>
      )}
    </section>
  );
}

function ActionBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 rounded-xl border border-white/[0.1] bg-white/[0.06] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-white/[0.1] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Step({
  done,
  num,
  icon,
  title,
  hint,
  action,
  checking,
  onRecheck,
}: {
  done: boolean;
  num: number;
  icon: React.ReactNode;
  title: string;
  hint: string;
  action: React.ReactNode;
  checking: boolean;
  onRecheck: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${
          done
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-white/[0.08] bg-white/[0.04] text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" strokeWidth={3} /> : icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[13px] font-black uppercase leading-tight tracking-tight text-foreground">
          {num}. {title}
        </span>
        <span className="block truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {done ? "Готово" : hint}
        </span>
      </span>
      {!done && (
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          <button
            type="button"
            onClick={onRecheck}
            disabled={checking}
            className="shrink-0 rounded-xl border border-white/[0.08] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {checking ? "…" : "Проверить"}
          </button>
        </div>
      )}
    </div>
  );
}
