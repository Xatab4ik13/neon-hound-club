import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 10_000);
const SMTP_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS ?? 10_000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS ?? 15_000);
const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS ?? 15_000);

function getTransport(): Transporter | null {
  if (cached) return cached;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = (process.env.SMTP_SECURE ?? (port === 465 ? "true" : "false")) === "true";
  cached = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });
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

  await Promise.race([
    transport.sendMail({ from, ...opts }),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[mailer] SMTP send timeout after ${SMTP_SEND_TIMEOUT_MS}ms`));
      }, SMTP_SEND_TIMEOUT_MS);
      timer.unref?.();
    }),
  ]);
}
