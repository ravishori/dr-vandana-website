/**
 * Staging Preview SMTP AUTH verification (transporter.verify only).
 * Uses server-side SMTP env exclusively — callers cannot supply host/credentials.
 * Never logs or returns secret values. Never calls sendMail.
 */

import nodemailer from "nodemailer";

import {
  getSmtpTransportConfig,
  type SmtpConfigResult,
} from "@/config/appointment-email";
import { logStructured } from "@/lib/observability/logger";

export type SmtpVerifyStatus =
  | "SMTP_AUTH_PASS"
  | "SMTP_AUTH_FAIL"
  | "SMTP_NOT_CONFIGURED"
  | "SMTP_VERIFY_ERROR";

export type SmtpVerifyResult = {
  ok: boolean;
  status: SmtpVerifyStatus;
  provider: "smtp";
  transport: "STARTTLS" | "TLS" | "UNKNOWN";
};

export type SmtpVerifyTransportFactory = typeof nodemailer.createTransport;

export type SmtpVerifyDeps = {
  getConfig?: () => SmtpConfigResult;
  createTransport?: SmtpVerifyTransportFactory;
};

function resolveTransportLabel(port: number): SmtpVerifyResult["transport"] {
  if (port === 587) {
    return "STARTTLS";
  }
  if (port === 465) {
    return "TLS";
  }
  return "UNKNOWN";
}

/**
 * Strip anything that could echo credentials or connection strings.
 */
export function sanitizeSmtpVerifyErrorMessage(raw: unknown): string {
  const text =
    raw instanceof Error
      ? raw.message
      : typeof raw === "string"
        ? raw
        : "smtp_verify_failed";
  return text
    .replace(/\b[a-z]{4}\s+[a-z]{4}\s+[a-z]{4}\s+[a-z]{4}\b/gi, "[REDACTED]")
    .replace(/pass(?:word)?["'\s:=]+[^\s"']+/gi, "pass=[REDACTED]")
    .replace(/smtp:\/\/[^\s]+/gi, "[REDACTED_URL]")
    .slice(0, 120);
}

/**
 * Authenticate to the configured SMTP server without sending mail.
 * Host/port/user/password always come from server env via getSmtpTransportConfig.
 */
export async function verifyConfiguredSmtpAuth(
  deps: SmtpVerifyDeps = {},
): Promise<SmtpVerifyResult> {
  const getConfig = deps.getConfig ?? getSmtpTransportConfig;
  const createTransport = deps.createTransport ?? nodemailer.createTransport;

  const smtp = getConfig();
  if (!smtp.ok) {
    logStructured("WARNING", {
      operation: "smtpVerify",
      outcome: "SMTP_NOT_CONFIGURED",
    });
    return {
      ok: false,
      status: "SMTP_NOT_CONFIGURED",
      provider: "smtp",
      transport: "UNKNOWN",
    };
  }

  const transport = resolveTransportLabel(smtp.config.port);

  try {
    const transporter = createTransport({
      host: smtp.config.host,
      port: smtp.config.port,
      secure: smtp.config.port === 465,
      requireTLS: smtp.config.port === 587,
      auth: {
        user: smtp.config.user,
        pass: smtp.config.password,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: {
        rejectUnauthorized: true,
        servername: smtp.config.host,
      },
    });

    // AUTH + TLS handshake only — never sendMail.
    await transporter.verify();

    logStructured("INFO", {
      operation: "smtpVerify",
      outcome: "SMTP_AUTH_PASS",
      transport,
    });

    return {
      ok: true,
      status: "SMTP_AUTH_PASS",
      provider: "smtp",
      transport,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    const isAuthFailure =
      code === "EAUTH" ||
      /invalid login|authentication failed|username and password/i.test(
        sanitizeSmtpVerifyErrorMessage(error),
      );

    logStructured("WARNING", {
      operation: "smtpVerify",
      outcome: isAuthFailure ? "SMTP_AUTH_FAIL" : "SMTP_VERIFY_ERROR",
      errorCode: code || "unknown",
    });

    return {
      ok: false,
      status: isAuthFailure ? "SMTP_AUTH_FAIL" : "SMTP_VERIFY_ERROR",
      provider: "smtp",
      transport,
    };
  }
}

/**
 * Reject request bodies that attempt to inject SMTP parameters.
 * Empty body / empty object are allowed.
 */
export function assertSmtpVerifyRequestBodySafe(raw: unknown): {
  ok: true;
} | { ok: false; reason: "injection_attempt" | "invalid_json" } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "injection_attempt" };
  }
  const keys = Object.keys(raw as Record<string, unknown>);
  if (keys.length === 0) {
    return { ok: true };
  }
  const forbidden = new Set([
    "host",
    "port",
    "user",
    "username",
    "password",
    "pass",
    "to",
    "recipient",
    "from",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_SERVER",
    "SMTP_EMAIL",
  ]);
  if (keys.some((key) => forbidden.has(key) || forbidden.has(key.toLowerCase()))) {
    return { ok: false, reason: "injection_attempt" };
  }
  // Any non-empty body is rejected — this endpoint accepts no caller parameters.
  return { ok: false, reason: "injection_attempt" };
}
