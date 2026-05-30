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

function navigateViaForm(url: string) {
  if (typeof document === "undefined") return;

  const form = document.createElement("form");
  form.method = "GET";
  form.action = url;
  form.style.display = "none";
  document.body.appendChild(form);
  form.submit();
}

export function beginPaymentRedirect(): PaymentRedirectHandle {
  return {
    commit: (url: string) => {
      navigateViaForm(url);
    },
    cancel: () => {},
  };
}

export function commitPaymentRedirect(paymentUrl: string) {
  navigateViaForm(paymentUrl);
}

export function submitPaymentRedirectForm(
  action: string,
  fields: Record<string, string>,
  options?: { target?: string },
) {
  if (typeof document === "undefined") return;

  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  if (options?.target) form.target = options.target;
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
