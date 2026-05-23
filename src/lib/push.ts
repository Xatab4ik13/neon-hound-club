// PWA push helper. Регистрирует минимальный SW и подписывает на пуши.
// Безопасно: в iframe / на lovable-preview хостах SW не регистрируется —
// чтобы не ломать редактор.

import { apiFetch } from "@/lib/api";

// Публичный VAPID-ключ. Не секрет — генерируется в паре с приватным на бэке.
// При смене ключа надо обновить и здесь, и в env бэка (VAPID_PUBLIC_KEY).
export const VAPID_PUBLIC_KEY =
  "BJxzCeOtUX6ZnmDD5EE-3ex9oJBn0nqpkA7tmKp_6pvU-3q1dJjSmXCNChsB3jLNNOEHM_H4XfcxnGpdexncJoU";

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isLovablePreview(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  if (h.includes("id-preview--") || h.includes("lovableproject.com")) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  return false;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerPushSW(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported() || isLovablePreview()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    console.warn("[push] sw register failed", e);
    return null;
  }
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  return Notification.permission;
}

export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "Браузер не поддерживает пуши." };
  if (isLovablePreview()) return { ok: false, reason: "Откройте установленное приложение или продакшен-домен." };

  const reg = await registerPushSW();
  if (!reg) return { ok: false, reason: "Не удалось зарегистрировать service worker." };

  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Уведомления запрещены." };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await apiFetch("/api/v1/push/subscribe", {
    method: "POST",
    body: JSON.stringify(sub.toJSON()),
  });

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await apiFetch("/api/v1/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
    } catch {
      /* ignore */
    }
    await sub.unsubscribe();
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || isLovablePreview()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  return (await reg?.pushManager.getSubscription()) ?? null;
}
