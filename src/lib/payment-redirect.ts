/**
 * Gesture-safe запуск оплаты.
 *
 * Главная проблема мобильных браузеров и PWA: если между тапом юзера и
 * window.open / window.location произошёл await (запрос к бэку, мутация,
 * ре-рендер) — браузер считает, что переход НЕ инициирован юзером, и
 * блокирует его. На desktop это часто прощается, на мобиле/PWA — нет.
 *
 * Решение: открываем окно ПУСТЫМ синхронно в самом обработчике клика
 * (`beginPaymentRedirect`), а после получения URL подставляем его
 * (`handle.commit(url)`). Если окно не удалось открыть (popup блок,
 * standalone PWA) — фолбэк на навигацию в текущем окне.
 */

export type PaymentRedirectHandle = {
  /** Подставить реальный URL в уже открытое окно. Вызывать после await. */
  commit: (url: string) => void;
  /** Закрыть окно (ошибка/отмена). */
  cancel: () => void;
};

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  // iOS
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  // Android / desktop PWA
  const displayStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return iosStandalone || displayStandalone;
}

/**
 * Вызывать СИНХРОННО внутри обработчика тапа, ДО любых await/мутаций.
 */
export function beginPaymentRedirect(): PaymentRedirectHandle {
  if (typeof window === "undefined") {
    return { commit: () => {}, cancel: () => {} };
  }

  // В PWA standalone window.open часто блокируется или открывает системный
  // браузер — это рвёт UX. В этом случае сразу идём на навигацию в текущем
  // окне (она по-прежнему gesture-safe, если её вызвать в onClick без await).
  if (isStandalonePwa()) {
    return {
      commit: (url: string) => {
        window.location.href = url;
      },
      cancel: () => {},
    };
  }

  // Обычный браузер (mobile/desktop): открываем пустую вкладку синхронно.
  let popup: Window | null = null;
  try {
    popup = window.open("about:blank", "_blank");
  } catch {
    popup = null;
  }

  if (!popup) {
    // Блокировщик. Фолбэк — навигация в текущем окне.
    return {
      commit: (url: string) => {
        window.location.href = url;
      },
      cancel: () => {},
    };
  }

  // Чтобы юзер сразу видел, что идёт оплата.
  try {
    popup.document.write(
      '<!doctype html><title>Оплата…</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0a0a0a;color:#fff;font:14px -apple-system,system-ui,sans-serif;display:grid;place-items:center}</style><div>Открываем платёжную форму…</div>',
    );
  } catch {
    /* ignore */
  }

  return {
    commit: (url: string) => {
      try {
        popup!.location.href = url;
      } catch {
        window.location.href = url;
      }
    },
    cancel: () => {
      try {
        popup!.close();
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Legacy fallback — используется только когда у нас нет handle.
 * НЕ gesture-safe на мобиле/PWA, избегай.
 */
export function commitPaymentRedirect(paymentUrl: string) {
  if (typeof window === "undefined") return;
  window.location.href = paymentUrl;
}
