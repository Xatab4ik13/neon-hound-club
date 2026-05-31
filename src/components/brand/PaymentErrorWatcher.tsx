/**
 * Глобальный watcher параметра ?payment_error= в URL.
 * Если бек редиректнул юзера куда-либо (cart, login, hell-pass, checkout)
 * с этим параметром — показываем явный тост и чистим параметр из URL,
 * чтобы тост не висел вечно.
 *
 * Это нужно, чтобы НИКОГДА не было "молчаливого возврата" после клика "Оплатить".
 * На /club/checkout ошибка ещё и отдельно нарисована в карточке внутри страницы,
 * это сделано там же специально и здесь не дублируется (тост всё равно один).
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { hhToast } from "@/lib/hh-toast";

export function PaymentErrorWatcher() {
  const { location } = useRouterState();
  const search = location.search as Record<string, unknown>;
  const err = typeof search?.payment_error === "string" ? search.payment_error : null;

  useEffect(() => {
    if (!err) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line no-console
    console.error("[payment_error]", err);
    hhToast.error("Ошибка оплаты", { meta: err, duration: 15000 });
    // Чистим параметр из URL без перезагрузки, чтобы тост не показывался повторно
    // и не оставался при дальнейшей навигации.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment_error");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* ignore */
    }
  }, [err]);

  return null;
}
