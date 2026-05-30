export type PaymentRedirectHandle = Window | null;

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    nav.standalone === true
  );
}

function shouldUseSameWindowRedirect() {
  if (typeof window === "undefined") return false;
  return isStandaloneMode() || window.matchMedia?.("(pointer: coarse)")?.matches === true;
}

export function preparePaymentRedirect(): PaymentRedirectHandle {
  if (typeof window === "undefined" || shouldUseSameWindowRedirect()) {
    return null;
  }

  return window.open("about:blank", "_blank");
}

export function commitPaymentRedirect(handle: PaymentRedirectHandle, paymentUrl: string) {
  if (typeof window === "undefined") return;

  if (handle && !handle.closed) {
    handle.location.href = paymentUrl;
    return;
  }

  window.location.assign(paymentUrl);
}

export function cancelPaymentRedirect(handle: PaymentRedirectHandle) {
  try {
    handle?.close();
  } catch {
    // noop
  }
}