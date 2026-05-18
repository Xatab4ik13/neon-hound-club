import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/cdek")({
  component: () => (
    <StubPage
      title="СДЭК"
      description="Накладные и отслеживание"
      note="В разработке. Этап 2: интеграция CDEK API — создание накладной из заказа, печать PDF, авто-получение трек-номера, статусы доставки в карточке заказа. Понадобится ключ API от СДЭК."
    />
  ),
});
