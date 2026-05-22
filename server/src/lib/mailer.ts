import nodemailer, { type Transporter } from "nodemailer";

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type MailFrom = {
  raw: string;
  name: string;
  email: string;
};

let cached: Transporter | null = null;

const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 10_000);
const SMTP_GREETING_TIMEOUT_MS = Number(process.env.SMTP_GREETING_TIMEOUT_MS ?? 10_000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS ?? 15_000);
const SMTP_SEND_TIMEOUT_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS ?? 15_000);
const MAIL_HTTP_TIMEOUT_MS = Number(process.env.MAIL_HTTP_TIMEOUT_MS ?? 15_000);

function getMailProvider(): "auto" | "smtp" | "resend" | "unisender" {
  const provider = (process.env.MAIL_PROVIDER ?? "auto").trim().toLowerCase();
  if (provider === "smtp" || provider === "resend" || provider === "unisender") return provider;
  return "auto";
}

function getMailFrom(): MailFrom {
  const raw = process.env.MAIL_FROM ?? '"HELLHOUND Racing" <no-reply@hhr.pro>';
  const match = raw.match(/^(?:"?([^<"]+)"?\s*)?<([^>]+)>$/);

  if (match) {
    return {
      raw,
      name: match[1]?.trim() || "HELLHOUND Racing",
      email: match[2].trim(),
    };
  }

  return {
    raw,
    name: "HELLHOUND Racing",
    email: raw.trim(),
  };
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`[mailer] HTTP send timeout after ${timeoutMs}ms`)), timeoutMs);
  timer.unref?.();
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

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

async function sendViaSmtp(opts: MailOptions, from: MailFrom): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    throw new Error("[mailer] SMTP is not configured");
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      transport.sendMail({ from: from.raw, ...opts }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`[mailer] SMTP send timeout after ${SMTP_SEND_TIMEOUT_MS}ms`));
        }, SMTP_SEND_TIMEOUT_MS);
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sendViaResend(opts: MailOptions, from: MailFrom): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("[mailer] RESEND_API_KEY is not configured");
  }

  const { signal, cleanup } = withTimeoutSignal(MAIL_HTTP_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: from.raw,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[mailer] Resend error ${res.status}: ${body}`);
    }
  } finally {
    cleanup();
  }
}

async function sendViaUnisender(opts: MailOptions, from: MailFrom): Promise<void> {
  const apiKey = process.env.UNISENDER_API_KEY;
  if (!apiKey) {
    throw new Error("[mailer] UNISENDER_API_KEY is not configured");
  }

  const baseUrl = (process.env.UNISENDER_BASE_URL ?? "https://goapi.unisender.ru/ru/transactional/api/v1").replace(/\/$/, "");
  const { signal, cleanup } = withTimeoutSignal(MAIL_HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/email/send.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        message: {
          recipients: [{ email: opts.to }],
          subject: opts.subject,
          body: {
            html: opts.html,
            plaintext: opts.text,
          },
          from_email: from.email,
          from_name: from.name,
        },
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`[mailer] Unisender error ${res.status}: ${body}`);
    }
  } finally {
    cleanup();
  }
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const from = getMailFrom();
  const provider = getMailProvider();

  try {
    if (provider === "resend") {
      await sendViaResend(opts, from);
      return;
    }

    if (provider === "unisender") {
      await sendViaUnisender(opts, from);
      return;
    }

    if (provider === "smtp") {
      await sendViaSmtp(opts, from);
      return;
    }

    if (process.env.UNISENDER_API_KEY) {
      await sendViaUnisender(opts, from);
      return;
    }

    if (process.env.RESEND_API_KEY) {
      await sendViaResend(opts, from);
      return;
    }

    if (getTransport()) {
      await sendViaSmtp(opts, from);
      return;
    }

    console.warn("[mailer] mail provider is not configured, письмо в лог:\n", { from: from.raw, ...opts });
  } catch (error) {
    if (provider === "auto" && getTransport()) {
      console.warn("[mailer] HTTP provider failed, fallback to SMTP", error);
      await sendViaSmtp(opts, from);
      return;
    }
    throw error;
  }
}
