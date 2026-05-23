import { useEffect, useState } from "react";
import { Bell, BellOff, Download, Share, Plus, Check, AlertCircle } from "lucide-react";
import { IOSSheet } from "@/components/ios/IOSSheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getPushPermission,
  getPushSubscription,
} from "@/lib/push";
import { useInstallPrompt, isStandalone } from "@/hooks/use-install-prompt";
import { haptic } from "@/hooks/use-haptic";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationsSheet({ open, onOpenChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const { canPrompt, installed, isIos, promptInstall } = useInstallPrompt();
  const standalone = installed || isStandalone();

  // Подтянуть состояние подписки при открытии.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const perm = await getPushPermission();
      const sub = await getPushSubscription();
      if (cancelled) return;
      setPermission(perm);
      setEnabled(perm === "granted" && !!sub);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleToggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    haptic("light");
    try {
      if (next) {
        const res = await subscribeToPush();
        if (res.ok) {
          setEnabled(true);
          setPermission("granted");
          haptic("success");
          toast.success("Уведомления включены");
        } else {
          toast.error(res.reason ?? "Не удалось включить");
        }
      } else {
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success("Уведомления выключены");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleInstall = async () => {
    haptic("light");
    const res = await promptInstall();
    if (res === "accepted") toast.success("Приложение установлено");
  };

  const pushSupported = isPushSupported();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 px-0 pb-[max(env(safe-area-inset-bottom),16px)] backdrop-blur-2xl"
      >
        <SheetHeader className="px-5 pb-2">
          <SheetTitle className="font-display text-lg font-black uppercase tracking-tight">
            Уведомления
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-5">
          {/* Push toggle */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground">Пуш-уведомления</span>
                  <Switch
                    checked={enabled}
                    onCheckedChange={handleToggle}
                    disabled={busy || !pushSupported || permission === "denied"}
                  />
                </div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                  Новый мерч, розыгрыши и важные посты. Без спама.
                </p>
              </div>
            </div>

            {!pushSupported && (
              <p className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                Браузер не поддерживает пуши. Установите приложение на экран Домой.
              </p>
            )}
            {pushSupported && permission === "denied" && (
              <p className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                Уведомления запрещены в настройках. Разрешите в настройках сайта/приложения.
              </p>
            )}
            {pushSupported && !standalone && isIos && (
              <p className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
                <AlertCircle className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                На iOS пуши работают только после установки на экран Домой.
              </p>
            )}
          </div>

          {/* Install card */}
          {!standalone && (
            <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/20 text-primary">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground">Установить приложение</div>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    На экран Домой — открывается мгновенно, без браузера.
                  </p>

                  {isIos ? (
                    <ol className="mt-3 space-y-2 text-[13px] text-foreground/90">
                      <li className="flex items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-[11px]">
                          1
                        </span>
                        Нажмите{" "}
                        <Share className="inline h-4 w-4 text-primary" /> «Поделиться» внизу Safari
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-[11px]">
                          2
                        </span>
                        Выберите{" "}
                        <Plus className="inline h-4 w-4 text-primary" /> «На экран „Домой"»
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 font-mono text-[11px]">
                          3
                        </span>
                        Нажмите «Добавить»
                      </li>
                    </ol>
                  ) : canPrompt ? (
                    <Button
                      onClick={handleInstall}
                      className="mt-3 h-10 w-full rounded-xl bg-primary text-primary-foreground active:scale-[0.97]"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Установить
                    </Button>
                  ) : (
                    <p className="mt-3 text-[12px] text-muted-foreground">
                      В меню браузера выберите «Установить приложение» или «Добавить на главный экран».
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {standalone && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-muted-foreground">
              <Check className="h-4 w-4 text-primary" />
              Приложение установлено
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
