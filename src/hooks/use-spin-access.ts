// Доступ к HellSpin: только из установленной PWA и только с включёнными пушами.
import { useCallback, useEffect, useState } from "react";
import { isStandalone } from "@/hooks/use-install-prompt";
import { getPushSubscription, isPushSupported, subscribeToPush } from "@/lib/push";

export type SpinAccess = {
  installed: boolean;
  pushEnabled: boolean;
  granted: boolean;
  checking: boolean;
  pushSupported: boolean;
  enablePush: () => Promise<{ ok: boolean; reason?: string }>;
  /** Перепроверить статус вручную (кнопки «Проверить»). */
  recheck: () => Promise<{ installed: boolean; pushEnabled: boolean }>;
};

export function useSpinAccess(): SpinAccess {
  const [installed, setInstalled] = useState(() => isStandalone());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [checking, setChecking] = useState(true);

  const refreshPush = useCallback(async () => {
    if (typeof window === "undefined" || !isPushSupported()) {
      setPushEnabled(false);
      setChecking(false);
      return;
    }
    try {
      const sub = await getPushSubscription();
      setPushEnabled(Notification.permission === "granted" && !!sub);
    } catch {
      setPushEnabled(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onChange = () => setInstalled(isStandalone());
    mq?.addEventListener?.("change", onChange);
    window.addEventListener("appinstalled", onChange);
    void refreshPush();
    const onVisible = () => {
      onChange();
      void refreshPush();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mq?.removeEventListener?.("change", onChange);
      window.removeEventListener("appinstalled", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshPush]);

  const enablePush = useCallback(async () => {
    const res = await subscribeToPush();
    await refreshPush();
    return res;
  }, [refreshPush]);

  const recheck = useCallback(async () => {
    const nowInstalled = isStandalone();
    setInstalled(nowInstalled);
    let nowPush = false;
    if (typeof window !== "undefined" && isPushSupported()) {
      try {
        const sub = await getPushSubscription();
        nowPush = Notification.permission === "granted" && !!sub;
      } catch {
        nowPush = false;
      }
    }
    setPushEnabled(nowPush);
    setChecking(false);
    return { installed: nowInstalled, pushEnabled: nowPush };
  }, []);

  return {
    installed,
    pushEnabled,
    granted: installed && pushEnabled,
    checking,
    pushSupported: isPushSupported(),
    enablePush,
    recheck,
  };
}
