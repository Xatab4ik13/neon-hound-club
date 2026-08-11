// Выбор промокода из своих на чекауте.
// Показываем только активные и неиспользованные; товарные помечаем «не подходит»,
// если корзина не равна ровно 1 шт. нужного товара. Применить можно только один.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PlumpTicket } from "@/components/ui/icons";
import { fetchMyPromoCodes, promoQk, type PromoCodeDto } from "@/lib/promo-api";

type CartPos = { productId: string; qty: number };

function eligibility(
  promo: PromoCodeDto,
  cart: CartPos[],
): { ok: boolean; reason?: string } {
  if (!promo.productId) return { ok: true };
  const positions = cart.filter((i) => i.qty > 0);
  if (positions.length !== 1 || positions[0]!.productId !== promo.productId) {
    return {
      ok: false,
      reason: promo.productTitle
        ? `Только на «${promo.productTitle}» — в корзине должен быть только этот товар`
        : "В корзине должен быть только тот товар, на который выписан код",
    };
  }
  if (positions[0]!.qty !== 1) return { ok: false, reason: "Только на 1 шт. товара" };
  return { ok: true };
}

export function PromoPicker({
  cart,
  onPick,
  busy,
}: {
  cart: CartPos[];
  onPick: (code: string) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: promoQk.mine,
    queryFn: fetchMyPromoCodes,
  });

  const available = useMemo(
    () => (data?.items ?? []).filter((p) => p.active && !p.usedAt && !p.expired),
    [data],
  );

  if (isLoading || available.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-primary"
      >
        <PlumpTicket className="h-3.5 w-3.5" />
        Мои промокоды · {available.length}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {available.map((p) => {
            const el = eligibility(p, cart);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!el.ok || busy}
                onClick={() => {
                  onPick(p.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                  el.ok
                    ? "border-white/[0.08] bg-background/60 hover:border-primary/50"
                    : "cursor-not-allowed border-white/[0.05] bg-background/30 opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[12px] font-bold uppercase tracking-wider text-foreground">
                    {p.code}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {el.ok
                      ? p.productId
                        ? `−${p.discountPct}% на «${p.productTitle ?? "товар"}» · билеты не начисляются`
                        : `−${p.discountPct}% на товары`
                      : el.reason}
                  </div>
                </div>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : (
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {el.ok ? "Применить" : "—"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
