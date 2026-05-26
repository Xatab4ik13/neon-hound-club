import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";
import { PrivacyContent } from "@/components/legal/content/PrivacyContent";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Политика обработки персональных данных — HELLHOUND Racing Club" },
      { name: "description", content: "Как сервис HELLHOUND Racing Club обрабатывает персональные данные пользователей." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Документы · 152-ФЗ"
      title="Политика обработки персональных данных"
      updatedAt={LEGAL.registeredAt}
    >
      <PrivacyContent basePath="/legal" />
    </LegalShell>
  );
}
