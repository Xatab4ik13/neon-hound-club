export type PaymentRedirectHandle = Window | null;

export function preparePaymentRedirect(): PaymentRedirectHandle {
  return window.open("about:blank", "_blank");
}

export function commitPaymentRedirect(handle: PaymentRedirectHandle, paymentUrl: string) {
  if (typeof window === "undefined") return;

  window.location.assign(paymentUrl);
}

export function cancelPaymentRedirect(handle: PaymentRedirectHandle) {
  try {
    handle?.close();
  } catch {
    // noop
  }
}