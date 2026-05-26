import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";
import { PromoRulesContent } from "@/components/legal/content/PromoRulesContent";

export const Route = createFileRoute("/legal/promo-rules")({
  head: () => ({
    meta: [
      {
        title:
          "Правила проведения стимулирующих мероприятий — HELLHOUND Racing Club",
      },
      {
        name: "description",
        content:
          "Полные правила розыгрышей HELLHOUND Racing Club: организатор, способы получения билетов, призовой фонд, НДФЛ, выдача призов.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PromoRulesPage,
});

function PromoRulesPage() {
  return (
    <LegalShell
      eyebrow="Документы"
      title="Правила проведения стимулирующих мероприятий"
      updatedAt={LEGAL.registeredAt}
    >
      <PromoRulesContent basePath="/legal" />
    </LegalShell>
  );
}
