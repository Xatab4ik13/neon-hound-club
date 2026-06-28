/**
 * Ленивая загрузка Яндекс.Карт JS API v2.1.
 * Скрипт грузится один раз, повторные вызовы возвращают тот же промис.
 * Ключ берётся из VITE_YANDEX_MAPS_API_KEY (публичный, с привязкой к домену).
 */

declare global {
  interface Window {
    ymaps?: any;
  }
}

let loaderPromise: Promise<any> | null = null;

export function loadYandexMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ymaps: not in browser"));
  }
  if (window.ymaps && typeof window.ymaps.ready === "function") {
    return new Promise((resolve) => window.ymaps!.ready(() => resolve(window.ymaps)));
  }
  if (loaderPromise) return loaderPromise;

  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      lang: "ru_RU",
      load: "package.full",
    });
    if (apiKey) params.set("apikey", apiKey);
    script.src = `https://api-maps.yandex.ru/2.1/?${params.toString()}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error("ymaps: script loaded but window.ymaps undefined"));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("ymaps: failed to load script"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
