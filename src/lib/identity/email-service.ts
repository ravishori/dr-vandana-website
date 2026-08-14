import nodemailer from "nodemailer";

import { getSmtpTransportConfig } from "@/config/appointment-email";
import { escapeHtml } from "@/lib/email/html-escape";
import { logStructured } from "@/lib/observability/logger";

export type IdentityEmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailSendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "provider_error" | "test_only" };

export type EmailService = {
  send: (message: IdentityEmailMessage) => Promise<EmailSendResult>;
};

export function createMemoryEmailService(): EmailService & {
  messages: IdentityEmailMessage[];
} {
  const messages: IdentityEmailMessage[] = [];
  return {
    messages,
    async send(message) {
      messages.push(message);
      return { ok: true };
    },
  };
}

export function createSmtpEmailService(): EmailService {
  return {
    async send(message) {
      const smtp = getSmtpTransportConfig();
      if (!smtp.ok) {
        logStructured("ERROR", {
          operation: "identityEmailSend",
          errorType: "smtp_not_configured",
        });
        return { ok: false, reason: "not_configured" };
      }
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
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });
        return { ok: true };
      } catch {
        logStructured("ERROR", {
          operation: "identityEmailSend",
          errorType: "smtp_provider_error",
        });
        return { ok: false, reason: "provider_error" };
      }
    },
  };
}

export function verificationEmailContent(params: {
  appBaseUrl: string;
  token: string;
}): IdentityEmailMessage {
  const verifyUrl = `${params.appBaseUrl.replace(/\/$/, "")}/patient/verify-email?token=${encodeURIComponent(params.token)}`;
  const text = [
    "Please verify your email to continue creating your account.",
    "",
    `Open this link: ${verifyUrl}`,
    "",
    "If you did not request an account, you can ignore this message.",
  ].join("\n");
  const html = `<p>Please verify your email to continue creating your account.</p><p><a href="${escapeHtml(verifyUrl)}">Verify email</a></p><p>If you did not request an account, you can ignore this message.</p>`;
  return {
    to: "",
    subject: "Verify your email",
    text,
    html,
  };
}

export function passwordResetEmailContent(params: {
  appBaseUrl: string;
  token: string;
}): IdentityEmailMessage {
  const resetUrl = `${params.appBaseUrl.replace(/\/$/, "")}/patient/reset-password?token=${encodeURIComponent(params.token)}`;
  const text = [
    "A password reset was requested for this email.",
    "",
    `Open this link to choose a new password: ${resetUrl}`,
    "",
    "If you did not request this, you can ignore this message.",
  ].join("\n");
  const html = `<p>A password reset was requested for this email.</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request this, you can ignore this message.</p>`;
  return {
    to: "",
    subject: "Password reset",
    text,
    html,
  };
}
