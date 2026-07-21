// HTML-шаблон письма верификации. Чёрный фон, primary-акцент = #f000c0 (бренд-розовый).
// Стили инлайн — иначе Gmail/Mail.ru их вырежут.

export function verifyEmailTemplate(opts: { nick: string; verifyUrl: string }) {
  const { nick, verifyUrl } = opts;
  const subject = "Подтверди email — HELLHOUND Racing";

  const text = [
    `Привет, ${nick}.`,
    ``,
    `Подтверди email, чтобы войти в HELLHOUND Racing Club:`,
    verifyUrl,
    ``,
    `Ссылка живёт 24 часа. Если это был не ты — просто удали это письмо.`,
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
            Подтверждение email
          </div>
        </td></tr>

        <tr><td style="padding:24px 32px 8px;">
          <h1 style="margin:0 0 12px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:32px;line-height:1.05;color:#fff;text-transform:uppercase;letter-spacing:-0.01em;">
            Привет, ${escapeHtml(nick)}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#bdbdbd;">
            Чтобы войти в HELLHOUND Racing Club, подтверди свой email — жми кнопку ниже.
          </p>
        </td></tr>

        <tr><td style="padding:0 32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr><td bgcolor="#f000c0" style="background:#f000c0;">
              <a href="${verifyUrl}" target="_blank"
                 style="display:inline-block;padding:18px 36px;font-family:'Arial Black',Impact,sans-serif;font-style:italic;font-weight:900;font-size:16px;letter-spacing:0.14em;color:#fff;text-decoration:none;text-transform:uppercase;">
                Подтвердить email
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 8px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.16em;color:#666;text-transform:uppercase;">
            Или открой ссылку
          </p>
          <p style="margin:0;word-break:break-all;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:12px;color:#999;">
            <a href="${verifyUrl}" style="color:#f000c0;text-decoration:none;">${verifyUrl}</a>
          </p>
        </td></tr>

        <tr><td style="padding:20px 32px 28px;border-top:1px solid #1f1f1f;">
          <p style="margin:0;font-size:12px;line-height:1.55;color:#777;">
            Ссылка живёт <strong style="color:#bdbdbd;">24 часа</strong>. Если это был не ты — просто удали это письмо, аккаунт без подтверждения не активируется.
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
