import { useQuery } from "@tanstack/react-query";
import { fetchPaymentMethods, qk } from "@/lib/queries";

/**
 * Какие способы оплаты сейчас сконфигурированы на бэке.
 * Используется на чекауте и Hell Pass, чтобы решить, показывать ли кнопку СБП.
 * Дефолт — { card: true, sbp: false }, чтобы карточная кнопка была сразу.
 */
export function usePaymentMethods() {
  const q = useQuery({
    queryKey: qk.paymentMethods,
    queryFn: fetchPaymentMethods,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
  return {
    card: q.data?.card ?? true,
    sbp: q.data?.sbp ?? false,
    isLoading: q.isLoading,
  };
}
