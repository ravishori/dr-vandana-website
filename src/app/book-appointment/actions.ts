"use server";

import { headers } from "next/headers";

import { appointmentEnquiryPage } from "@/data/appointment-enquiry";
import {
  checkAppointmentRateLimit,
  getClientIpFromHeaders,
  isHoneypotTriggered,
} from "@/lib/appointment-abuse";
import { createEnquiryConversation } from "@/lib/communications/service";
import { sendAppointmentEnquiryEmail } from "@/lib/email/appointment-enquiry";
import { reportException } from "@/lib/observability/error-handler";
import {
  appointmentEnquirySchema,
  flattenAppointmentFieldErrors,
  normalizeAppointmentInput,
} from "@/lib/appointment-schema";
import type {
  AppointmentActionResult,
  AppointmentEnquirySubmission,
  AppointmentFormValues,
} from "@/types/appointment-enquiry";

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFormValues(
  input: AppointmentEnquirySubmission,
): AppointmentFormValues {
  return {
    fullName: input.fullName,
    ageGroup: input.ageGroup,
    consultationMode: input.consultationMode,
    contactMethod: input.contactMethod,
    contactValue: input.contactValue,
    preferredDay: input.preferredDay,
    preferredTime: input.preferredTime,
    briefReason: input.briefReason,
    privacyAccepted: input.privacyAccepted,
  };
}

/**
 * Authoritative enquiry boundary:
 * sanity → honeypot → rate limit → normalize → Zod/config →
 * persist conversation → best-effort SMTP → result.
 *
 * Persistence failure fails the enquiry.
 * SMTP failure after successful persistence still returns success.
 */
export async function submitAppointmentEnquiry(
  input: AppointmentEnquirySubmission,
): Promise<AppointmentActionResult> {
  try {
    if (!isObjectRecord(input)) {
      return {
        success: false,
        message: appointmentEnquiryPage.abuseRejectedMessage,
      };
    }

    if (isHoneypotTriggered(input.website)) {
      return {
        success: false,
        message: appointmentEnquiryPage.abuseRejectedMessage,
      };
    }

    const headerStore = await headers();
    const clientIp = getClientIpFromHeaders(headerStore);
    const rateLimit = await checkAppointmentRateLimit(clientIp);

    if (!rateLimit.allowed) {
      if (
        rateLimit.reason === "misconfigured" ||
        rateLimit.reason === "store_unavailable"
      ) {
        await reportException({
          source: "CONFIGURATION",
          code:
            rateLimit.reason === "misconfigured"
              ? "RATE_LIMIT_MISCONFIGURED"
              : "RATE_LIMIT_STORE_UNAVAILABLE",
          severity: "CRITICAL",
          message:
            "Appointment rate limiting is unavailable or misconfigured in production.",
          operation: "submitAppointmentEnquiry",
          route: "/book-appointment",
        });
        return {
          success: false,
          message: appointmentEnquiryPage.deliveryFailedMessage,
        };
      }

      return {
        success: false,
        message: appointmentEnquiryPage.rateLimitedMessage,
      };
    }

    const formValues = toFormValues(input);
    const normalized = normalizeAppointmentInput(formValues);
    const parsed = appointmentEnquirySchema.safeParse(normalized);

    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted fields.",
        fieldErrors: flattenAppointmentFieldErrors(parsed.error),
      };
    }

    try {
      await createEnquiryConversation({
        fullName: parsed.data.fullName,
        contactMethod: parsed.data.contactMethod ?? "unknown",
        contactValue: parsed.data.contactValue ?? "",
        preferredDay: parsed.data.preferredDay,
        preferredTime: parsed.data.preferredTime,
        consultationMode: parsed.data.consultationMode,
        ageGroup: parsed.data.ageGroup,
        briefReason: parsed.data.briefReason ?? "",
      });
    } catch (error) {
      await reportException({
        error,
        source: "SERVER_ACTION",
        code: "COMMUNICATIONS_PERSIST_FAILED",
        severity: "ERROR",
        message: "Failed to persist appointment enquiry conversation.",
        operation: "submitAppointmentEnquiry",
        route: "/book-appointment",
      });
      return {
        success: false,
        message: appointmentEnquiryPage.persistenceFailedMessage,
      };
    }

    const delivery = await sendAppointmentEnquiryEmail(parsed.data);

    if (!delivery.ok) {
      await reportException({
        source: "EMAIL",
        code: "SMTP_DELIVERY_FAILED_AFTER_PERSIST",
        severity: "ERROR",
        message:
          "Appointment enquiry persisted but SMTP delivery failed (best-effort).",
        operation: "submitAppointmentEnquiry",
        route: "/book-appointment",
      });
      return {
        success: true,
        message: appointmentEnquiryPage.enquiryReceivedMessage,
      };
    }

    return {
      success: true,
      message: appointmentEnquiryPage.enquirySubmittedMessage,
    };
  } catch (error) {
    const reported = await reportException({
      error,
      source: "SERVER_ACTION",
      code: "APP_UNEXPECTED_ERROR",
      severity: "ERROR",
      message: "Unexpected failure while processing appointment enquiry.",
      operation: "submitAppointmentEnquiry",
      route: "/book-appointment",
    });

    return {
      success: false,
      message: `${appointmentEnquiryPage.unexpectedSubmissionError} Reference: ${reported.correlationId}.`,
    };
  }
}
