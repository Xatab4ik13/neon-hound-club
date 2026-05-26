import { createFileRoute } from "@tanstack/react-router";
import { ClubLegalShell } from "@/components/legal/ClubLegalShell";
import { RequisitesContent } from "@/components/legal/content/RequisitesContent";

export const Route = createFileRoute("/club/legal/requisites")({
  head: () => ({
    meta: [
      { title: "Реквизиты — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubRequisitesPage,
});

function ClubRequisitesPage() {
  return (
    <ClubLegalShell eyebrow="Юридическая информация" title="Реквизиты">
      <RequisitesContent />
    </ClubLegalShell>
  );
}
