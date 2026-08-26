import nodemailer from "nodemailer";

import { getAppointmentEmailConfig } from "@/config/appointment-email";
import { buildAppointmentEnquiryEmail } from "@/lib/email/appointment-enquiry-template";
import { reportException } from "@/lib/observability/error-handler";
import type { AppointmentEnquiryParsed } from "@/lib/appointment-schema";

export type AppointmentEmailDeliveryResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "provider_error";
      correlationId?: string;
    };

/**
 * Deliver a validated appointment enquiry via SMTP.
 * One controlled attempt. Never logs payload, credentials, or provider bodies.
 */
export async function sendAppointmentEnquiryEmail(
  enquiry: AppointmentEnquiryParsed,
): Promise<AppointmentEmailDeliveryResult> {
  const configResult = getAppointmentEmailConfig();
  if (!configResult.ok) {
    const reported = await reportException({
      source: "CONFIGURATION",
      code: "SMTP_CONFIGURATION_ERROR",
      severity: "CRITICAL",
      message: "Appointment email SMTP configuration is incomplete.",
      operation: "sendAppointmentEnquiryEmail",
      route: "/book-appointment",
    });
    return {
      ok: false,
      reason: "not_configured",
      correlationId: reported.correlationId,
    };
  }

  const { config } = configResult;
  const content = buildAppointmentEnquiryEmail(enquiry);

  try {
    const transporter = nodemailer.createTransport({
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
    });

    await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: config.toEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(content.replyTo ? { replyTo: content.replyTo } : {}),
    });

    return { ok: true };
  } catch (error) {
    const reported = await reportException({
      error,
      source: "EMAIL",
      code: "SMTP_DELIVERY_FAILED",
      severity: "ERROR",
      message: "Appointment enquiry email delivery failed.",
      operation: "sendAppointmentEnquiryEmail",
      route: "/book-appointment",
    });
    return {
      ok: false,
      reason: "provider_error",
      correlationId: reported.correlationId,
    };
  }
}
