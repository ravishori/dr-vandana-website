/**
 * Server-only appointment email / SMTP configuration.
 * Import only from Server Actions / email modules — never from Client Components.
 *
 * Store secrets in `.env.local` (gitignored). Never use NEXT_PUBLIC_*.
 *
 * SMTP transport (canonical + Gmail-friendly aliases):
 * - SMTP_HOST or SMTP_SERVER (alias)
 * - SMTP_PORT
 * - SMTP_USER or SMTP_EMAIL (alias)
 * - SMTP_PASSWORD (Gmail App Password when using smtp.gmail.com — never the account password)
 * - SMTP_FROM_EMAIL or SMTP_EMAIL (alias)
 * - SMTP_FROM_NAME (optional)
 *
 * Appointment delivery destination:
 * - APPOINTMENT_TO_EMAIL
 *
 * Never log or commit SMTP_PASSWORD.
 */

export type SmtpTransportConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
};

export type AppointmentEmailEnvConfig = SmtpTransportConfig & {
  toEmail: string;
};

export type SmtpConfigResult =
  | { ok: true; config: SmtpTransportConfig }
  | { ok: false; reason: "missing_config" };

export type AppointmentEmailConfigResult =
  | { ok: true; config: AppointmentEmailEnvConfig }
  | { ok: false; reason: "missing_config" };

function readNonEmptyEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Accept bare email or "Name <email@domain>" and return the address. */
function extractEmailAddress(value: string): string | undefined {
  const angle = value.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? value).trim();
  return looksLikeEmail(candidate) ? candidate : undefined;
}

/**
 * Configuration presence check only. Never returns or logs secret values.
 */
export function getSmtpConfigurationStatus():
  | { status: "SMTP CONFIGURED" }
  | { status: "SMTP NOT CONFIGURED" } {
  return getSmtpTransportConfig().ok
    ? { status: "SMTP CONFIGURED" }
    : { status: "SMTP NOT CONFIGURED" };
}

export function getSmtpTransportConfig(): SmtpConfigResult {
  const host = readNonEmptyEnv("SMTP_HOST") ?? readNonEmptyEnv("SMTP_SERVER");
  const portRaw = readNonEmptyEnv("SMTP_PORT");
  const user = readNonEmptyEnv("SMTP_USER") ?? readNonEmptyEnv("SMTP_EMAIL");
  const password = readNonEmptyEnv("SMTP_PASSWORD");
  const fromRaw =
    readNonEmptyEnv("SMTP_FROM_EMAIL") ??
    readNonEmptyEnv("SMTP_EMAIL") ??
    user;
  const fromName =
    readNonEmptyEnv("SMTP_FROM_NAME") ??
    "Dr. Vandana Rajiv Chaudhary Website";

  const port = portRaw ? Number.parseInt(portRaw, 10) : Number.NaN;
  const fromEmail = fromRaw ? extractEmailAddress(fromRaw) : undefined;

  if (
    !host ||
    !Number.isFinite(port) ||
    port <= 0 ||
    !user ||
    !password ||
    !fromEmail
  ) {
    return { ok: false, reason: "missing_config" };
  }

  return {
    ok: true,
    config: {
      host,
      port,
      user,
      password,
      fromEmail,
      fromName,
    },
  };
}

export function getAppointmentEmailConfig(): AppointmentEmailConfigResult {
  const smtp = getSmtpTransportConfig();
  const toEmail = readNonEmptyEnv("APPOINTMENT_TO_EMAIL");

  if (!smtp.ok || !toEmail || !looksLikeEmail(toEmail)) {
    return { ok: false, reason: "missing_config" };
  }

  return {
    ok: true,
    config: {
      ...smtp.config,
      toEmail,
    },
  };
}
