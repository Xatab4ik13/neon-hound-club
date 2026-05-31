// HTML-шаблон письма «Заказ принят». Тот же чёрно-розовый стиль, что и verify.
// Используется бекендом после успешной оплаты заказа в магазине.
//
// Бекенд (будет позже):
//   import { orderConfirmedTemplate } from "./email-templates/order-confirmed";
//   const { subject, html, text } = orderConfirmedTemplate({
//     nick: user.nick,
//     orderNumber: order.publicNumber,   // напр. "HHR-2026-000123"
//     orderUrl: `https://hhr.pro/club/orders#${order.id}`,
//     items: [
//       { title: "Hoodie HELLHOUND Black", qty: 1, sumRub: 5900 },
//       { title: "Race Cap",               qty: 2, sumRub: 3800 },
//     ],
//     totalRub: 9700,
//     ticketsBonus: 12,                   // сколько билетов начислено за этот заказ (0 — не показывать блок)
//   });
//   await sendMail({ to: user.email, subject, html, text });

export type OrderItem = {
  title: string;
  qty: number;
  sumRub: number;
};

export type DigitalItem = {
  title: string;
  url: string;
  fileName?: string | null;
};

export function orderConfirmedTemplate(opts: {
  nick: string;
  orderNumber: string;
  orderUrl: string;
  items: OrderItem[];
  totalRub: number;
  ticketsBonus?: number;
  /** Если передан непустой массив — письмо рендерится в "цифровом" виде:
   *  убираем фразу про СДЭК/трек, добавляем блок со ссылками на скачивание. */
  digitalItems?: DigitalItem[];
}) {
  const { nick, orderNumber, orderUrl, items, totalRub, ticketsBonus = 0, digitalItems = [] } = opts;
  const subject = `Заказ ${orderNumber} принят — HELLHOUND Racing`;
  const isDigital = digitalItems.length > 0;

  const text = [
    `Привет, ${nick}.`,
    ``,
    `Заказ ${orderNumber} принят и оплачен.`,
    ``,
    ...items.map((i) => `· ${i.title} × ${i.qty} — ${formatRub(i.sumRub)}`),
    ``,
    `Итого: ${formatRub(totalRub)}`,
    ticketsBonus > 0 ? `Начислено билетов: +${ticketsBonus}` : ``,
    ``,
    ...(isDigital
      ? [
          `Скачать:`,
          ...digitalItems.map((d) => `· ${d.title} — ${d.url}`),
          ``,
        ]
      : [`Статус и трек-номер появятся здесь:`, orderUrl, ``]),
    `HELLHOUND Racing`,
  ]
    .filter(Boolean)
    .join("\n");

  const itemsRows = items
    .map(
      (i) => `
        <tr>
          <td style="padding:10px 0;font-size:14px;color:#ededed;border-bottom:1px solid #1f1f1f;">
            ${escapeHtml(i.title)}
            <span style="color:#777;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:12px;">  × ${i.qty}</span>
          </td>
          <td align="right" style="padding:10px 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;color:#fff;border-bottom:1px solid #1f1f1f;white-space:nowrap;">
            ${formatRub(i.sumRub)}
          </td>
        </tr>`,
    )
    .join("");

  const digitalLinksBlock = isDigital
    ? `
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f1a14;border:1px solid #2dff95;">
            <tr><td style="padding:14px 18px;">
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#2dff95;text-transform:uppercase;margin-bottom:8px;">
                Скачать
              </div>
              ${digitalItems
                .map(
                  (d) => `
                <div style="margin:0 0 8px;">
                  <a href="${d.url}" target="_blank" style="color:#fff;font-size:14px;text-decoration:underline;">
                    ${escapeHtml(d.title)}${d.fileName ? ` <span style="color:#777;font-size:12px;">(${escapeHtml(d.fileName)})</span>` : ""}
                  </a>
                </div>`,
                )
                .join("")}
              <div style="font-size:12px;color:#999;margin-top:8px;">
                Ссылки действуют постоянно. Также доступны в личном кабинете.
              </div>
            </td></tr>
          </table>
        </td></tr>`
    : "";

  const ticketsBlock =
    ticketsBonus > 0
      ? `
        <tr><td style="padding:0 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a0a14;border:1px solid #ff2d95;">
            <tr><td style="padding:14px 18px;">
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#ff2d95;text-transform:uppercase;margin-bottom:4px;">
                Бонус
              </div>
              <div style="font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:20px;color:#fff;text-transform:uppercase;">
                +${ticketsBonus} билет${pluralTickets(ticketsBonus)}
              </div>
              <div style="font-size:12px;color:#999;margin-top:4px;">
                Зачислены в твой баланс. Можно тратить на розыгрыши.
              </div>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ededed;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#111;border:1px solid #1f1f1f;">

        <tr><td style="padding:32px 32px 8px;">
          <div style="font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:28px;letter-spacing:0.04em;color:#fff;text-transform:uppercase;">
            HELL<span style="color:#ff2d95;">HOUND</span> RACING
          </div>
          <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.22em;color:#777;text-transform:uppercase;margin-top:6px;">
            Заказ ${escapeHtml(orderNumber)}
          </div>
        </td></tr>

        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0 0 12px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:32px;line-height:1.05;color:#fff;text-transform:uppercase;letter-spacing:-0.01em;">
            ${escapeHtml(nick)}, заказ принят
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#bdbdbd;">
            ${
              isDigital
                ? "Оплата прошла. Файлы доступны для скачивания ниже и в личном кабинете."
                : "Оплата прошла, мы начали собирать твой заказ. Как только передадим в СДЭК — пришлём трек-номер."
            }
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${itemsRows}
            <tr>
              <td style="padding:16px 0 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#777;text-transform:uppercase;">
                Итого
              </td>
              <td align="right" style="padding:16px 0 0;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:22px;color:#fff;white-space:nowrap;">
                ${formatRub(totalRub)}
              </td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td bgcolor="#ff2d95" style="background:#ff2d95;">
              <a href="${orderUrl}" target="_blank"
                 style="display:inline-block;padding:18px 36px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:16px;letter-spacing:0.14em;color:#fff;text-decoration:none;text-transform:uppercase;">
                Открыть заказ
              </a>
            </td></tr>
          </table>
        </td></tr>

        ${ticketsBlock}

        <tr><td style="padding:20px 32px 28px;border-top:1px solid #1f1f1f;">
          <p style="margin:0 0 8px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#666;text-transform:uppercase;">
            Что дальше
          </p>
          <p style="margin:0;font-size:13px;line-height:1.55;color:#999;">
            Статус, трек-номер СДЭК и история заказов — в личном кабинете на
            <a href="https://hhr.pro/club/orders" style="color:#ff2d95;text-decoration:none;">hhr.pro/club/orders</a>.
          </p>
        </td></tr>
      </table>

      <p style="margin:20px 0 0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:10px;letter-spacing:0.22em;color:#555;text-transform:uppercase;">
        HELLHOUND Racing · hhr.pro
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function pluralTickets(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "а";
  return "ов";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
