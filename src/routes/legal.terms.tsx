import { createFileRoute } from "@tanstack/react-router";
import { TermsContent } from "@/components/legal/content/TermsContent";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Пользовательское соглашение — HELLHOUND Racing Club" },
      { name: "description", content: "Условия использования сервиса HELLHOUND Racing Club." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell eyebrow="Документы" title="Пользовательское соглашение" updatedAt={LEGAL.registeredAt}>
      <TermsContent />
    </LegalShell>
  );
}
