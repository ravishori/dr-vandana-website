import nodemailer from "nodemailer";

import { getAppointmentEmailConfig } from "@/config/appointment-email";
import { doctorPortalConfig } from "@/config/doctor-portal";
import { escapeHtml } from "@/lib/email/html-escape";
import { reportException } from "@/lib/observability/error-handler";
import type { Conversation } from "@/types/communications";

export type CommunicationsEmailResult =
  | { ok: true; messageId?: string }
  | {
      ok: false;
      reason: "not_configured" | "provider_error";
      correlationId?: string;
    };

export type CommunicationsEmailSender = {
  sendDoctorNewEnquiryNotification(input: {
    conversation: Conversation;
  }): Promise<CommunicationsEmailResult>;
  sendUserReply(input: {
    conversation: Conversation;
    replyBody: string;
    inReplyTo?: string | null;
    references?: string | null;
  }): Promise<CommunicationsEmailResult>;
};

function buildMessageId(domain: string): string {
  const id = crypto.randomUUID().replaceAll("-", "");
  return `<drv-comm-${id}@${domain}>`;
}

function extractDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "localhost";
}

/**
 * Doctor notification for a new enquiry.
 * Includes name, subject, and portal link only — never full clinical text.
 */
export async function sendDoctorNewEnquiryNotification(input: {
  conversation: Conversation;
}): Promise<CommunicationsEmailResult> {
  const configResult = getAppointmentEmailConfig();
  if (!configResult.ok) {
    const reported = await reportException({
      source: "CONFIGURATION",
      code: "SMTP_CONFIGURATION_ERROR",
      severity: "CRITICAL",
      message: "Communications notification SMTP configuration is incomplete.",
      operation: "sendDoctorNewEnquiryNotification",
      route: "/doctor/communications",
    });
    return {
      ok: false,
      reason: "not_configured",
      correlationId: reported.correlationId,
    };
  }

  const { config } = configResult;
  const link = `${doctorPortalConfig.appBaseUrl}/doctor/communications/${input.conversation.id}`;
  const subject = `New website enquiry: ${input.conversation.subject}`;
  const text = [
    "A new website enquiry was received.",
    "",
    `Name: ${input.conversation.userName}`,
    `Subject: ${input.conversation.subject}`,
    `Open in portal: ${link}`,
    "",
    "Full enquiry details are available in the doctor communications portal.",
    "This is not an EHR notification and does not include clinical notes.",
  ].join("\n");
  const html = `
    <p>A new website enquiry was received.</p>
    <p><strong>Name:</strong> ${escapeHtml(input.conversation.userName)}<br/>
    <strong>Subject:</strong> ${escapeHtml(input.conversation.subject)}</p>
    <p><a href="${escapeHtml(link)}">Open in communications portal</a></p>
    <p><em>Full enquiry details are available in the portal. This is not an EHR notification.</em></p>
  `.trim();

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: config.toEmail,
      subject,
      text,
      html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    const reported = await reportException({
      error,
      source: "EMAIL",
      code: "SMTP_DELIVERY_FAILED",
      severity: "ERROR",
      message: "Doctor enquiry notification email failed.",
      operation: "sendDoctorNewEnquiryNotification",
      route: "/doctor/communications",
    });
    return {
      ok: false,
      reason: "provider_error",
      correlationId: reported.correlationId,
    };
  }
}

export async function sendUserReplyEmail(input: {
  conversation: Conversation;
  replyBody: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<CommunicationsEmailResult> {
  const configResult = getAppointmentEmailConfig();
  if (!configResult.ok) {
    const reported = await reportException({
      source: "CONFIGURATION",
      code: "SMTP_CONFIGURATION_ERROR",
      severity: "CRITICAL",
      message: "Communications reply SMTP configuration is incomplete.",
      operation: "sendUserReplyEmail",
      route: "/doctor/communications",
    });
    return {
      ok: false,
      reason: "not_configured",
      correlationId: reported.correlationId,
    };
  }

  const { config } = configResult;
  const domain = extractDomain(config.fromEmail);
  const messageId = buildMessageId(domain);
  const subject = input.conversation.subject.startsWith("Re:")
    ? input.conversation.subject
    : `Re: ${input.conversation.subject}`;

  const text = [
    input.replyBody,
    "",
    "—",
    "This message was sent in reply to your website enquiry.",
    "This website is not an emergency service or electronic health record.",
  ].join("\n");

  const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #2b332c;">
      <p>${escapeHtml(input.replyBody).replaceAll("\n", "<br/>")}</p>
      <hr/>
      <p style="font-size: 0.9em; color: #626e65;">
        This message was sent in reply to your website enquiry.
        This website is not an emergency service or electronic health record.
      </p>
    </div>
  `.trim();

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      requireTLS: config.port === 587,
      auth: { user: config.user, pass: config.password },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    const headers: Record<string, string> = {
      "Message-ID": messageId,
    };
    if (input.inReplyTo) {
      headers["In-Reply-To"] = input.inReplyTo;
    }
    if (input.references) {
      headers.References = input.references;
    }

    await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: input.conversation.userEmail,
      subject,
      text,
      html,
      replyTo: config.toEmail,
      headers,
    });

    return { ok: true, messageId };
  } catch (error) {
    const reported = await reportException({
      error,
      source: "EMAIL",
      code: "SMTP_DELIVERY_FAILED",
      severity: "ERROR",
      message: "User reply email delivery failed.",
      operation: "sendUserReplyEmail",
      route: "/doctor/communications",
    });
    return {
      ok: false,
      reason: "provider_error",
      correlationId: reported.correlationId,
    };
  }
}

export function createDefaultCommunicationsEmailSender(): CommunicationsEmailSender {
  return {
    sendDoctorNewEnquiryNotification,
    sendUserReply: sendUserReplyEmail,
  };
}

let emailSenderOverride: CommunicationsEmailSender | null = null;

export function setCommunicationsEmailSenderForTests(
  sender: CommunicationsEmailSender | null,
): void {
  emailSenderOverride = sender;
}

export function getCommunicationsEmailSender(): CommunicationsEmailSender {
  return emailSenderOverride ?? createDefaultCommunicationsEmailSender();
}
