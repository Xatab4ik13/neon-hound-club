export type BloggerMoneyOrder = {
  subtotalRub: number;
  discountRub: number;
  digitalGrossRub: number;
  preorderGrossRub?: number;
};

function netShare(row: BloggerMoneyOrder, grossRub: number): number {
  if (row.subtotalRub <= 0 || grossRub <= 0) return 0;
  const allocatedDiscount = Math.round(row.discountRub * (grossRub / row.subtotalRub));
  return Math.max(0, grossRub - allocatedDiscount);
}

/** Доля блогера: 60% оплаченных digital/virtual позиций после их доли скидки заказа. */
export function calculateBloggerMoneyRub(rows: BloggerMoneyOrder[]): number {
  const net = rows.reduce((t, r) => t + netShare(r, r.digitalGrossRub), 0);
  return Math.round(net * 0.6);
}

/** Предзаказы: полная оплаченная сумма позиций-предзаказов (после скидки), без доставки. */
export function calculatePreorderRub(rows: BloggerMoneyOrder[]): number {
  return rows.reduce((t, r) => t + netShare(r, r.preorderGrossRub ?? 0), 0);
}
