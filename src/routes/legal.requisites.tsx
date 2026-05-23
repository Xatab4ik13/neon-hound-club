import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/brand/LegalShell";
import { LEGAL } from "@/data/legal";

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
      <p>
        Владелец и администратор сервиса <strong>{LEGAL.brand}</strong> —
        индивидуальный предприниматель, действующий на основании записи в ЕГРИП.
      </p>

      <h2>Реквизиты</h2>
      <ul>
        <li><strong>Полное наименование:</strong> {LEGAL.fullName}</li>
        <li><strong>ОГРНИП:</strong> {LEGAL.ogrnip}</li>
        <li><strong>ИНН:</strong> {LEGAL.inn}</li>
        <li><strong>Дата регистрации:</strong> {LEGAL.registeredAt}</li>
        <li><strong>Регион регистрации:</strong> {LEGAL.region}</li>
      </ul>

      <h2>Контакты</h2>
      <p>
        Все обращения по работе сервиса, заказам, возвратам и обработке
        персональных данных принимаются через Telegram:
        {" "}<a href={LEGAL.contactTelegram} target="_blank" rel="noreferrer">@hell666hound</a>.
      </p>
    </LegalShell>
  );
}
