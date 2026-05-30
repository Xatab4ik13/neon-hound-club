/**
 * Навигация в платёжный flow.
 *
 * Для mobile/PWA самый надёжный вариант — синхронный submit обычной HTML-формы
 * в backend endpoint, который уже сам делает 303 redirect на страницу банка.
 * Тогда браузер видит это как настоящий top-level navigation, а не JS-редирект
 * после await, который мобильные движки часто душат.
 */

export type PaymentRedirectHandle = {
  commit: (url: string) => void;
  cancel: () => void;
};

export function beginPaymentRedirect(): PaymentRedirectHandle {
  return {
    commit: (url: string) => {
      if (typeof window === "undefined") return;
      window.location.href = url;
    },
    cancel: () => {},
  };
}

export function commitPaymentRedirect(paymentUrl: string) {
  if (typeof window === "undefined") return;
  window.location.href = paymentUrl;
}

export function submitPaymentRedirectForm(action: string, fields: Record<string, string>) {
  if (typeof document === "undefined") return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
