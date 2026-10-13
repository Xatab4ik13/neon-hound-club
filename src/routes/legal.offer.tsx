import { createFileRoute } from "@tanstack/react-router";
import { OfferContent } from "@/components/legal/content/OfferContent";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";

export const Route = createFileRoute("/legal/offer")({
  head: () => ({
    meta: [
      { title: "Публичная оферта — HELLHOUND Racing Club" },
      { name: "description", content: "Публичная оферта на продажу мерча и предоставление платных функций сервиса HELLHOUND Racing Club." },
    ],
  }),
  component: OfferPage,
});

function OfferPage() {
  return (
    <LegalShell eyebrow="Документы" title="Публичная оферта" updatedAt={LEGAL.registeredAt}>
      <OfferContent />
    </LegalShell>
  );
}
