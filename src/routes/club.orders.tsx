import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/club/PageHeader";
import { OrdersList } from "@/components/club/OrdersList";
import { fetchMyOrders, qk } from "@/lib/queries";

export const Route = createFileRoute("/club/orders")({
  head: () => ({
    meta: [
      { title: "Заказы — клуб HELLHOUND" },
      { name: "description", content: "Мои заказы." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { data, isLoading } = useQuery({
    queryKey: qk.shopOrders,
    queryFn: fetchMyOrders,
  });
  const total = data?.items.length ?? 0;
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-5 md:py-8"
      style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
    >
      <PageHeader title="Заказы" subtitle={isLoading ? undefined : `Всего: ${total}`} />
      <OrdersList />
    </main>
  );
}
