// HTML-шаблон письма сброса пароля. Стили инлайн — иначе Gmail/Mail.ru их вырежут.

export function resetPasswordTemplate(opts: { nick: string; resetUrl: string }) {
  const { nick, resetUrl } = opts;
  const subject = "Сброс пароля — HELLHOUND Racing";

  const text = [
    `Привет, ${nick}.`,
    ``,
    `Кто-то запросил сброс пароля для твоего аккаунта в HELLHOUND Racing Club.`,
    `Задай новый пароль по ссылке:`,
    resetUrl,
    ``,
    `Ссылка живёт 30 минут. Если это был не ты — просто удали это письмо, пароль останется прежним.`,
    ``,
    `HELLHOUND Racing`,
  ].join("\n");

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
            HELL<span style="color:#f000c0;">HOUND</span> RACING
          </div>
          <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.22em;color:#777;text-transform:uppercase;margin-top:6px;">
            Сброс пароля
          </div>
        </td></tr>

        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0 0 12px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:32px;line-height:1.05;color:#fff;text-transform:uppercase;letter-spacing:-0.01em;">
            Привет, ${escapeHtml(nick)}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#bdbdbd;">
            Ты запросил сброс пароля. Жми кнопку ниже и задай новый.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td bgcolor="#f000c0" style="background:#f000c0;">
              <a href="${resetUrl}" target="_blank"
                 style="display:inline-block;padding:18px 36px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:16px;letter-spacing:0.14em;color:#fff;text-decoration:none;text-transform:uppercase;">
                Задать новый пароль
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#666;text-transform:uppercase;">
            Ссылка живёт 30 минут
          </p>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#777;word-break:break-all;">
            Если кнопка не работает, открой ссылку вручную:<br>
            <a href="${resetUrl}" style="color:#f000c0;text-decoration:underline;">${resetUrl}</a>
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#555;">
            Если это был не ты — просто удали письмо, пароль останется прежним.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
