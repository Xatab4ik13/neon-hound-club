import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")) === "true";
  cached = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return cached;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const transport = getTransport();
  const from = process.env.MAIL_FROM ?? '"HELLHOUND Racing" <no-reply@hhr.pro>';
  if (!transport) {
    // dev fallback — пишем в лог, не валим запрос
    console.warn("[mailer] SMTP не настроен, письмо в лог:\n", { from, ...opts });
    return;
  }
  await transport.sendMail({ from, ...opts });
}
