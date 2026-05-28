import type { FastifyBaseLogger } from "fastify";

type ConfigAudit = {
  missingCritical: string[];
  placeholderSecrets: string[];
  disabledFeatures: string[];
};

function getEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

function hasEnv(name: string): boolean {
  return getEnv(name).length > 0;
}

function looksPlaceholder(value: string): boolean {
  if (!value) return false;

  return [
    /^CHANGE_ME/i,
    /^<.+>$/,
    /^dev-only-secret-change-me$/i,
    /^hellhound-secret$/i,
    /^hellhound$/i,
  ].some((pattern) => pattern.test(value));
}

export function auditRuntimeConfig(): ConfigAudit {
  const missingCritical = ["DATABASE_URL", "JWT_SECRET"].filter((name) => !hasEnv(name));

  const placeholderSecrets = [
    "DATABASE_URL",
    "JWT_SECRET",
    "S3_SECRET_KEY",
    "SMTP_PASS",
    "RAIF_SECRET_KEY",
    "OPENROUTER_API_KEY",
    "DADATA_API_KEY",
  ].filter((name) => looksPlaceholder(getEnv(name)));

  const disabledFeatures: string[] = [];

  if (!hasEnv("DADATA_API_KEY")) disabledFeatures.push("dadata");
  if (!hasEnv("OPENROUTER_API_KEY")) disabledFeatures.push("hell_ai");
  if (!hasEnv("RAIF_PUBLIC_ID") || !hasEnv("RAIF_SECRET_KEY")) disabledFeatures.push("payments");
  if (!hasEnv("VAPID_PUBLIC_KEY") || !hasEnv("VAPID_PRIVATE_KEY")) disabledFeatures.push("push");

  const hasMailHttp = hasEnv("UNISENDER_API_KEY") || hasEnv("RESEND_API_KEY");
  const hasSmtp = hasEnv("SMTP_HOST") && hasEnv("SMTP_USER") && hasEnv("SMTP_PASS");
  if (!hasMailHttp && !hasSmtp) disabledFeatures.push("email");

  return { missingCritical, placeholderSecrets, disabledFeatures };
}

export function logRuntimeConfig(logger: FastifyBaseLogger): void {
  const audit = auditRuntimeConfig();

  if (audit.missingCritical.length > 0) {
    logger.error({ missing: audit.missingCritical }, "critical env is missing");
  }

  if (audit.placeholderSecrets.length > 0) {
    logger.warn({ vars: audit.placeholderSecrets }, "placeholder env values detected");
  }

  if (audit.disabledFeatures.length > 0) {
    logger.warn({ features: audit.disabledFeatures }, "optional features are disabled by config");
  }

  if (
    audit.missingCritical.length === 0 &&
    audit.placeholderSecrets.length === 0 &&
    audit.disabledFeatures.length === 0
  ) {
    logger.info("runtime config looks complete");
  }
}