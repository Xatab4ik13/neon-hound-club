import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/school")({
  component: () => (
    <StubPage
      title="Школа"
      description="Управление контентом школы"
      note="В разработке. Появится, когда определимся с форматом продукта."
    />
  ),
});
