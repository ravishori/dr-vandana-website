/**
 * Server-only appointment email / SMTP configuration.
 * Import only from Server Actions / email modules — never from Client Components.
 *
 * Store secrets in `.env.local` (gitignored). Never use NEXT_PUBLIC_*.
 *
 * SMTP transport:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASSWORD
 * - SMTP_FROM_EMAIL
 * - SMTP_FROM_NAME (optional)
 *
 * Appointment delivery destination:
 * - APPOINTMENT_TO_EMAIL
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

export function getSmtpTransportConfig(): SmtpConfigResult {
  const host = readNonEmptyEnv("SMTP_HOST");
  const portRaw = readNonEmptyEnv("SMTP_PORT");
  const user = readNonEmptyEnv("SMTP_USER");
  const password = readNonEmptyEnv("SMTP_PASSWORD");
  const fromRaw = readNonEmptyEnv("SMTP_FROM_EMAIL");
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
