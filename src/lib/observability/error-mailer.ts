import nodemailer from "nodemailer";

import { getSmtpTransportConfig } from "@/config/appointment-email";
import {
  getErrorReportingConfig,
  meetsEmailSeverityThreshold,
} from "@/config/error-reporting";
import type { ErrorEvent } from "@/lib/observability/error-types";
import { logStructured } from "@/lib/observability/logger";
import { escapeHtml } from "@/lib/email/html-escape";

/**
 * Process-local alert cooldown.
 * Not a distributed store — resets per instance/cold start on serverless.
 */
const alertCooldown = new Map<string, number>();

/** Re-entrancy guard: never send an alert about alert delivery itself. */
let isSendingErrorAlert = false;

function cooldownKey(event: ErrorEvent): string {
  return [
    event.code,
    event.source,
    event.route ?? "",
    event.operation ?? "",
  ].join("|");
}

function isCoolingDown(event: ErrorEvent, cooldownSeconds: number): boolean {
  const key = cooldownKey(event);
  const now = Date.now();
  const until = alertCooldown.get(key);
  if (until && until > now) {
    return true;
  }
  alertCooldown.set(key, now + cooldownSeconds * 1000);
  return false;
}

function buildAlertText(event: ErrorEvent): string {
  return [
    "Application Error Alert",
    "",
    `Severity: ${event.severity}`,
    `Source: ${event.source}`,
    `Error Code: ${event.code}`,
    `Timestamp: ${event.timestamp}`,
    `Environment: ${event.environment}`,
    `Route: ${event.route ?? "n/a"}`,
    `Operation: ${event.operation ?? "n/a"}`,
    `Correlation ID: ${event.correlationId}`,
    `Event ID: ${event.eventId}`,
    `Safe Message: ${event.message}`,
    "",
    "Application: Dr. Vandana Rajiv Chaudhary Website",
    "Note: Sensitive user-submitted information has been intentionally excluded.",
  ].join("\n");
}

function buildAlertHtml(event: ErrorEvent): string {
  const rows: Array<[string, string]> = [
    ["Severity", event.severity],
    ["Source", event.source],
    ["Error Code", event.code],
    ["Timestamp", event.timestamp],
    ["Environment", event.environment],
    ["Route", event.route ?? "n/a"],
    ["Operation", event.operation ?? "n/a"],
    ["Correlation ID", event.correlationId],
    ["Event ID", event.eventId],
    ["Safe Message", event.message],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 0;color:#626E65;width:180px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#2B332C;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:Georgia,serif;color:#2B332C;background:#FBF9F5;padding:20px;">
  <h1 style="color:#5A7361;font-size:20px;">Application Error Alert</h1>
  <table role="presentation">${htmlRows}</table>
  <p style="margin-top:16px;color:#626E65;font-size:13px;">Application: Dr. Vandana Rajiv Chaudhary Website</p>
  <p style="color:#626E65;font-size:13px;">Sensitive user-submitted information has been intentionally excluded.</p>
  </body></html>`;
}

export type ErrorAlertResult =
  | { sent: true }
  | { sent: false; reason: "disabled" | "threshold" | "cooldown" | "config" | "failure" | "reentrancy" };

/**
 * Send a privacy-safe admin alert. Never includes appointment/PII/secrets.
 * Failures are logged only — never recursively emailed.
 */
export async function sendErrorAlertEmail(
  event: ErrorEvent,
): Promise<ErrorAlertResult> {
  if (isSendingErrorAlert) {
    return { sent: false, reason: "reentrancy" };
  }

  const reporting = getErrorReportingConfig();
  if (!reporting.emailEnabled) {
    return { sent: false, reason: "disabled" };
  }
  if (!meetsEmailSeverityThreshold(event.severity, reporting.minSeverity)) {
    return { sent: false, reason: "threshold" };
  }
  if (!reporting.notifyEmail) {
    logStructured("WARNING", {
      code: "CONFIG_MISSING",
      message: "ERROR_NOTIFY_EMAIL is not configured.",
      operation: "sendErrorAlertEmail",
      correlationId: event.correlationId,
    });
    return { sent: false, reason: "config" };
  }
  if (isCoolingDown(event, reporting.cooldownSeconds)) {
    logStructured("INFO", {
      code: event.code,
      message: "Error alert suppressed by cooldown.",
      operation: "sendErrorAlertEmail",
      correlationId: event.correlationId,
    });
    return { sent: false, reason: "cooldown" };
  }

  const smtp = getSmtpTransportConfig();
  if (!smtp.ok) {
    logStructured("ERROR", {
      code: "SMTP_CONFIGURATION_ERROR",
      message: "SMTP transport is not configured for error alerts.",
      operation: "sendErrorAlertEmail",
      correlationId: event.correlationId,
    });
    return { sent: false, reason: "config" };
  }

  isSendingErrorAlert = true;
  try {
    const transporter = nodemailer.createTransport({
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
    });

    await transporter.sendMail({
      from: `${smtp.config.fromName} <${smtp.config.fromEmail}>`,
      to: reporting.notifyEmail,
      subject: `[${event.severity}] Dr. Vandana Website — Application Error`,
      text: buildAlertText(event),
      html: buildAlertHtml(event),
    });

    return { sent: true };
  } catch {
    logStructured("ERROR", {
      code: "SMTP_DELIVERY_FAILED",
      message: "Failed to deliver administrative error alert.",
      operation: "sendErrorAlertEmail",
      correlationId: event.correlationId,
      source: "EMAIL",
    });
    return { sent: false, reason: "failure" };
  } finally {
    isSendingErrorAlert = false;
  }
}

/** Test helper — does not run in normal request paths. */
export function resetErrorAlertCooldownForTests(): void {
  alertCooldown.clear();
}
