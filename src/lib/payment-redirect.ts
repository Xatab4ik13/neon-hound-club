export function commitPaymentRedirect(paymentUrl: string) {
  if (typeof window === "undefined") return;

  window.location.assign(paymentUrl);
}