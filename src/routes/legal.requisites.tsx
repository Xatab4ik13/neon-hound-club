import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";
import { RequisitesContent } from "@/components/legal/content/RequisitesContent";

export const Route = createFileRoute("/legal/requisites")({
  head: () => ({
    meta: [
      { title: "Реквизиты — HELLHOUND Racing Club" },
      { name: "description", content: "Реквизиты владельца сервиса HELLHOUND Racing Club." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequisitesPage,
});

function RequisitesPage() {
  return (
    <LegalShell eyebrow="Юридическая информация" title="Реквизиты" updatedAt={LEGAL.registeredAt}>
      <RequisitesContent />
    </LegalShell>
  );
}
