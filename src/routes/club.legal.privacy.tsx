import { createFileRoute } from "@tanstack/react-router";
import { ClubLegalShell } from "@/components/legal/ClubLegalShell";
import { PrivacyContent } from "@/components/legal/content/PrivacyContent";

export const Route = createFileRoute("/club/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Политика ПДн — HELLHOUND" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClubPrivacyPage,
});

function ClubPrivacyPage() {
  return (
    <ClubLegalShell eyebrow="Документы · 152-ФЗ" title="Политика обработки персональных данных">
      <PrivacyContent basePath="/club/legal" />
    </ClubLegalShell>
  );
}
