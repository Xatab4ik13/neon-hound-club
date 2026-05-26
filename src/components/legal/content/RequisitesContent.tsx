import { LEGAL } from "@/data/legal";

/** Контент «Реквизиты». Используется и в публичной, и в клубовой версии. */
export function RequisitesContent() {
  return (
    <>
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
        <li><strong>Юридический адрес:</strong> {LEGAL.address}</li>
      </ul>

      <h2>Контакты</h2>
      <p>
        Email для официальных обращений:{" "}
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
      </p>
      <p>
        Оперативная поддержка по заказам, возвратам и обработке персональных
        данных — Telegram:{" "}
        <a href={LEGAL.contactTelegram} target="_blank" rel="noreferrer">@hell666hound</a>.
      </p>
    </>
  );
}
