import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/hell-ai")({
  component: () => (
    <StubPage
      title="Hell AI"
      description="AI-механик по своему мото"
      note="В разработке. Здесь будут: настройки модели, лимиты вопросов по тирам Pass (20/100/∞), журнал запросов, бан-лист тем, статистика расхода токенов и маржа."
    />
  ),
});
