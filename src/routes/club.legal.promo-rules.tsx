import { createFileRoute } from "@tanstack/react-router";
import { ClubLegalShell } from "@/components/legal/ClubLegalShell";
import { PromoRulesContent } from "@/components/legal/content/PromoRulesContent";

export const Route = createFileRoute("/club/legal/promo-rules")({
  head: () => ({
    meta: [
      { title: "Правила розыгрышей — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubPromoRulesPage,
});

function ClubPromoRulesPage() {
  return (
    <ClubLegalShell
      eyebrow="Документы"
      title="Правила проведения стимулирующих мероприятий"
    >
      <PromoRulesContent basePath="/club/legal" />
    </ClubLegalShell>
  );
}
