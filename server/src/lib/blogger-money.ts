export type BloggerMoneyOrder = {
  subtotalRub: number;
  discountRub: number;
  digitalGrossRub: number;
};

/** Доля блогера: половина оплаченных digital/virtual позиций после их доли скидки заказа. */
export function calculateBloggerMoneyRub(rows: BloggerMoneyOrder[]): number {
  const digitalNetRub = rows.reduce((total, row) => {
    if (row.subtotalRub <= 0 || row.digitalGrossRub <= 0) return total;
    const allocatedDiscount = Math.round(
      row.discountRub * (row.digitalGrossRub / row.subtotalRub),
    );
    return total + Math.max(0, row.digitalGrossRub - allocatedDiscount);
  }, 0);

  return Math.round(digitalNetRub * 0.5);
}