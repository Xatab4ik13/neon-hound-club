import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "@/components/ui/icons";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/telegram")({
  head: () => ({ meta: [{ title: "Телеграм бот — Админ" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminTelegramPage,
});

type Summary = { paidOrders: number; buyers: number; tickets: number; ticketsRub: number; shirtsRub: number; shippingRub: number; totalRub: number; shirtsQty: number };
type Shirt = { name: string; size: string; qty: number; price: number };
type Order = {
  id: string; status: string; phone: string; telegramUserId: number | null; telegramUsername: string | null; telegramName: string | null;
  recipientName: string | null; tickets: number; ticketsRub: number; shirts: Shirt[]; shirtsRub: number; shippingRub: number; totalRub: number;
  cdekCityName: string | null; cdekPvzCode: string | null; cdekPvzAddress: string | null; paidAt: string | null; createdAt: string;
};

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;
const dt = (s: string) => new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
type Tab = "buyers" | "preorders" | "all";

function AdminTelegramPage() {
  const [tab, setTab] = useState<Tab>("buyers");
  const summary = useQuery({ queryKey: ["admin", "tg", "summary"], queryFn: () => apiFetch<Summary>("/api/v1/admin/tg/summary"), refetchInterval: 30_000 });
  const orders = useQuery({
    queryKey: ["admin", "tg", "orders", tab === "all" ? "all" : "paid"],
    queryFn: () => apiFetch<{ items: Order[] }>(`/api/v1/admin/tg/orders?status=${tab === "all" ? "all" : "paid"}`),
    refetchInterval: 30_000,
  });

  // Покупатели: сводка по номеру телефона
  const buyers = useMemo(() => {
    const m = new Map<string, { phone: string; tg: string; tickets: number; totalRub: number; orders: number; last: string }>();
    for (const o of orders.data?.items ?? []) {
      const b = m.get(o.phone) ?? { phone: o.phone, tg: "", tickets: 0, totalRub: 0, orders: 0, last: o.createdAt };
      b.tg ||= [o.telegramName, o.telegramUsername && `@${o.telegramUsername}`].filter(Boolean).join(" ");
      b.tickets += o.tickets; b.totalRub += o.totalRub; b.orders += 1;
      if (o.createdAt > b.last) b.last = o.createdAt;
      m.set(o.phone, b);
    }
    return [...m.values()].sort((a, b) => b.tickets - a.tickets);
  }, [orders.data]);
  const preorders = (orders.data?.items ?? []).filter((o) => o.shirts.length > 0);

  const s = summary.data;
  const cards = [
    { label: "Выручка", value: s ? rub(s.totalRub) : "—" },
    { label: "Билетов продано", value: s ? s.tickets.toLocaleString("ru-RU") : "—", sub: s ? rub(s.ticketsRub) : "" },
    { label: "Футболок", value: s ? String(s.shirtsQty) : "—", sub: s ? rub(s.shirtsRub) : "" },
    { label: "Покупателей", value: s ? String(s.buyers) : "—", sub: s ? `${s.paidOrders} оплат` : "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-black uppercase">Телеграм бот</h1>
        <button onClick={() => { summary.refetch(); orders.refetch(); }} className="rounded-xl border border-border p-2 text-foreground" aria-label="Обновить">
          {orders.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </div>


      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-2xl font-black text-foreground">{c.value}</div>
            {c.sub && <div className="text-sm text-muted-foreground">{c.sub}</div>}
          </div>
        ))}
      </div>
      {s && s.shippingRub > 0 && <div className="text-sm text-muted-foreground">Из выручки доставка СДЭК: {rub(s.shippingRub)}</div>}

      <div className="flex gap-2">
        {([["buyers", "Кто сколько купил"], ["preorders", "Предзаказы"], ["all", "Все заказы"]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("rounded-full px-4 py-1.5 text-sm", tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{l}</button>
        ))}
      </div>

      {orders.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            {tab === "buyers" && (<>
              <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">Телефон</th><th className="p-3">Telegram</th><th className="p-3">Билетов</th><th className="p-3">Сумма</th><th className="p-3">Оплат</th><th className="p-3">Последняя</th></tr></thead>
              <tbody>{buyers.map((b) => (
                <tr key={b.phone} className="border-t border-border"><td className="p-3 font-mono">{b.phone}</td><td className="p-3">{b.tg || "—"}</td><td className="p-3 font-bold">{b.tickets}</td><td className="p-3">{rub(b.totalRub)}</td><td className="p-3">{b.orders}</td><td className="p-3 text-muted-foreground">{dt(b.last)}</td></tr>
              ))}</tbody>
            </>)}
            {tab === "preorders" && (<>
              <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">Дата</th><th className="p-3">Получатель</th><th className="p-3">Телефон</th><th className="p-3">Футболки</th><th className="p-3">Пункт выдачи</th><th className="p-3">Доставка</th></tr></thead>
              <tbody>{preorders.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="p-3 text-muted-foreground">{dt(o.paidAt ?? o.createdAt)}</td>
                  <td className="p-3">{o.recipientName}<div className="text-xs text-muted-foreground">{o.telegramUsername ? `@${o.telegramUsername}` : ""}</div></td>
                  <td className="p-3 font-mono">{o.phone}</td>
                  <td className="p-3">{o.shirts.map((x, i) => <div key={i}>«{x.name}» {x.size} × {x.qty}</div>)}</td>
                  <td className="p-3">{o.cdekCityName}, {o.cdekPvzAddress}<div className="text-xs text-muted-foreground">{o.cdekPvzCode}</div></td>
                  <td className="p-3">{rub(o.shippingRub)}</td>
                </tr>
              ))}</tbody>
            </>)}
            {tab === "all" && (<>
              <thead className="bg-muted/40 text-left text-muted-foreground"><tr><th className="p-3">Дата</th><th className="p-3">Статус</th><th className="p-3">Телефон</th><th className="p-3">Билеты</th><th className="p-3">Футболки</th><th className="p-3">Итого</th></tr></thead>
              <tbody>{(orders.data?.items ?? []).map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{dt(o.createdAt)}</td>
                  <td className="p-3">{o.status === "paid" ? "Оплачен" : o.status === "failed" ? "Не прошёл" : "Ждёт оплаты"}</td>
                  <td className="p-3 font-mono">{o.phone}</td><td className="p-3">{o.tickets || "—"}</td>
                  <td className="p-3">{o.shirts.reduce((n, x) => n + x.qty, 0) || "—"}</td><td className="p-3 font-bold">{rub(o.totalRub)}</td>
                </tr>
              ))}</tbody>
            </>)}
          </table>
          {(orders.data?.items ?? []).length === 0 && <div className="p-6 text-center text-muted-foreground">Пока нет оплат</div>}
        </div>
      )}
    </div>
  );
}
