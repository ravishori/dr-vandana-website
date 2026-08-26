import nodemailer from "nodemailer";

import { getAppointmentEmailConfig } from "@/config/appointment-email";
import { questionPortalConfig } from "@/config/question-portal";
import { escapeHtml } from "@/lib/email/html-escape";
import { reportException } from "@/lib/observability/error-handler";
import type { QuestionSubmissionRecord } from "@/types/question-portal";

export type QuestionEmailResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "provider_error" | "missing_recipient" };

function transporterFromConfig() {
  const configResult = getAppointmentEmailConfig();
  if (!configResult.ok) {
    return null;
  }
  const { config } = configResult;
  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: {
        user: config.user,
        pass: config.password,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  };
}

export async function sendNewQuestionNotification(
  record: QuestionSubmissionRecord,
): Promise<QuestionEmailResult> {
  const ready = transporterFromConfig();
  const toEmail = questionPortalConfig.notificationEmail;
  if (!ready || !toEmail) {
    const reported = await reportException({
      source: "CONFIGURATION",
      code: "SMTP_CONFIGURATION_ERROR",
      severity: "ERROR",
      message: "Question notification email is not configured.",
      operation: "sendNewQuestionNotification",
      route: "/ask-a-question",
    });
    return {
      ok: false,
      reason: "not_configured",
      ...(reported.correlationId ? {} : {}),
    };
  }

  const dashboardUrl = `${questionPortalConfig.appBaseUrl}/psychologist/questions/${record.publicReferenceId}`;
  const submitted = new Date(record.createdAt).toUTCString();
  const category = record.category ?? "Not specified";
  const subject = `New psychology question ${record.publicReferenceId}`;
  const text = [
    "New psychology question received.",
    "",
    `Reference: ${record.publicReferenceId}`,
    `Category: ${category}`,
    `Submitted: ${submitted}`,
    "",
    "Please sign in to the secure Psychologist Portal to review the submission.",
    dashboardUrl,
    "",
    "The question content is not included in this email.",
  ].join("\n");
  const html = `
    <p>New psychology question received.</p>
    <p>Please sign in to the secure Psychologist Portal to review the submission.</p>
    <ul>
      <li>Reference: ${escapeHtml(record.publicReferenceId)}</li>
      <li>Category: ${escapeHtml(category)}</li>
      <li>Submitted: ${escapeHtml(submitted)}</li>
    </ul>
    <p><a href="${escapeHtml(dashboardUrl)}">Open Psychologist Portal</a></p>
    <p>The question content is not included in this email.</p>
  `;

  try {
    await ready.transporter.sendMail({
      from: `${ready.config.fromName} <${ready.config.fromEmail}>`,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (error) {
    await reportException({
      error,
      source: "EMAIL",
      code: "SMTP_DELIVERY_FAILED",
      severity: "ERROR",
      message: "Question notification email delivery failed.",
      operation: "sendNewQuestionNotification",
      route: "/ask-a-question",
    });
    return { ok: false, reason: "provider_error" };
  }
}

export async function sendQuestionResponseEmail(
  record: QuestionSubmissionRecord,
): Promise<QuestionEmailResult> {
  if (!record.email || !record.psychologistResponse?.trim()) {
    return { ok: false, reason: "missing_recipient" };
  }
  const ready = transporterFromConfig();
  if (!ready) {
    return { ok: false, reason: "not_configured" };
  }

  const subject = `Response to your psychology question ${record.publicReferenceId}`;
  const greeting = record.name ? `Hello ${record.name},` : "Hello,";
  const text = [
    greeting,
    "",
    "Thank you for writing to Dr. Vandana Rajiv Chaudhary's practice.",
    "The following is a professional informational response. It is not a diagnosis, treatment plan, or a substitute for a consultation.",
    "",
    record.psychologistResponse.trim(),
    "",
    `Reference: ${record.publicReferenceId}`,
    "",
    "If you need urgent help, please contact local emergency services. This email is not an emergency service.",
  ].join("\n");
  const html = `
    <p>${escapeHtml(greeting)}</p>
    <p>Thank you for writing to Dr. Vandana Rajiv Chaudhary's practice. The following is a professional informational response. It is not a diagnosis, treatment plan, or a substitute for a consultation.</p>
    <p>${escapeHtml(record.psychologistResponse.trim()).replaceAll("\n", "<br />")}</p>
    <p>Reference: ${escapeHtml(record.publicReferenceId)}</p>
    <p>If you need urgent help, please contact local emergency services. This email is not an emergency service.</p>
  `;

  try {
    await ready.transporter.sendMail({
      from: `${ready.config.fromName} <${ready.config.fromEmail}>`,
      to: record.email,
      subject,
      text,
      html,
    });
    return { ok: true };
  } catch (error) {
    await reportException({
      error,
      source: "EMAIL",
      code: "SMTP_DELIVERY_FAILED",
      severity: "ERROR",
      message: "Question response email delivery failed.",
      operation: "sendQuestionResponseEmail",
      route: "/psychologist",
    });
    return { ok: false, reason: "provider_error" };
  }
}
