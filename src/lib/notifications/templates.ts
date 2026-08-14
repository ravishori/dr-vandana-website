import { escapeHtml } from "@/lib/email/html-escape";
import {
  EMAIL_SUBJECT,
  PRACTICE_NOTIFICATION_NAME,
  type WhatsAppTemplateKey,
} from "@/lib/notifications/constants";

export type NotificationTemplateVariables = {
  patientName: string;
  appointmentTypeName: string;
  appointmentDate: string;
  appointmentTime: string;
  timezone: string;
  appointmentPublicId: string;
  practiceName: string;
  proposedDate?: string;
  proposedTime?: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const WHATSAPP_REQUIRED: Record<WhatsAppTemplateKey, (keyof NotificationTemplateVariables)[]> = {
  appointment_requested: [
    "patientName",
    "appointmentTypeName",
    "appointmentDate",
    "appointmentTime",
    "timezone",
    "practiceName",
  ],
  appointment_requested_psychologist: [
    "patientName",
    "appointmentTypeName",
    "appointmentDate",
    "appointmentTime",
    "timezone",
    "appointmentPublicId",
  ],
  appointment_confirmed: [
    "patientName",
    "appointmentTypeName",
    "appointmentDate",
    "appointmentTime",
    "timezone",
    "appointmentPublicId",
  ],
  appointment_rejected: ["patientName", "practiceName"],
  appointment_cancelled: [
    "patientName",
    "appointmentDate",
    "appointmentTime",
    "timezone",
    "practiceName",
  ],
  appointment_cancelled_psychologist: [
    "appointmentPublicId",
    "appointmentDate",
    "appointmentTime",
    "timezone",
  ],
  appointment_reschedule_requested: ["patientName", "practiceName"],
  appointment_reschedule_requested_psychologist: [
    "patientName",
    "appointmentPublicId",
    "proposedDate",
    "proposedTime",
    "timezone",
  ],
  appointment_rescheduled: [
    "patientName",
    "appointmentTypeName",
    "appointmentDate",
    "appointmentTime",
    "timezone",
  ],
  appointment_completed: ["patientName", "practiceName"],
  appointment_no_show: ["patientName", "practiceName"],
};

export const WHATSAPP_CONTENT_VARIABLE_ORDER: Record<
  WhatsAppTemplateKey,
  (keyof NotificationTemplateVariables)[]
> = { ...WHATSAPP_REQUIRED };

const EMAIL_BODIES: Record<WhatsAppTemplateKey, (vars: NotificationTemplateVariables) => string> = {
  appointment_requested: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment request has been recorded.",
      "This is not a confirmation.",
      "",
      `Type: ${vars.appointmentTypeName}`,
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
      `Practice: ${vars.practiceName}`,
      vars.appointmentPublicId ? `Reference: ${vars.appointmentPublicId}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  appointment_requested_psychologist: (vars) =>
    [
      "New appointment request received.",
      "",
      `Patient: ${vars.patientName}`,
      `Type: ${vars.appointmentTypeName}`,
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
      `Reference: ${vars.appointmentPublicId}`,
    ].join("\n"),
  appointment_confirmed: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment has been confirmed.",
      "",
      `Type: ${vars.appointmentTypeName}`,
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
      `Reference: ${vars.appointmentPublicId}`,
    ].join("\n"),
  appointment_rejected: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment request could not be accepted.",
      "",
      `Practice: ${vars.practiceName}`,
    ].join("\n"),
  appointment_cancelled: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment has been cancelled.",
      "",
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
      `Practice: ${vars.practiceName}`,
    ].join("\n"),
  appointment_cancelled_psychologist: (vars) =>
    [
      "An appointment has been cancelled.",
      "",
      `Reference: ${vars.appointmentPublicId}`,
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
    ].join("\n"),
  appointment_reschedule_requested: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your request to reschedule has been received.",
      "",
      `Practice: ${vars.practiceName}`,
    ].join("\n"),
  appointment_reschedule_requested_psychologist: (vars) =>
    [
      "An appointment reschedule request requires your attention.",
      "",
      `Patient: ${vars.patientName}`,
      `Reference: ${vars.appointmentPublicId}`,
      vars.proposedDate && vars.proposedTime
        ? `Proposed: ${vars.proposedDate} ${vars.proposedTime} (${vars.timezone})`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  appointment_rescheduled: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment has been rescheduled.",
      "",
      `Type: ${vars.appointmentTypeName}`,
      `When: ${vars.appointmentDate} ${vars.appointmentTime} (${vars.timezone})`,
    ].join("\n"),
  appointment_completed: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment has been marked complete.",
      "",
      `Practice: ${vars.practiceName}`,
    ].join("\n"),
  appointment_no_show: (vars) =>
    [
      `Hello ${vars.patientName},`,
      "",
      "Your appointment was recorded as a no-show.",
      "",
      `Practice: ${vars.practiceName}`,
    ].join("\n"),
};

export type TemplateRenderResult =
  | { ok: true; email: RenderedEmail; whatsappVariables: Record<string, string> }
  | { ok: false; code: "MISSING_TEMPLATE" | "MISSING_VARIABLE" };

export function missingTemplateVariables(
  templateKey: WhatsAppTemplateKey,
  vars: Partial<NotificationTemplateVariables>,
): string[] {
  const required = WHATSAPP_REQUIRED[templateKey];
  if (!required) {
    return ["template"];
  }
  return required.filter((key) => {
    const value = vars[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

export function renderNotificationTemplate(
  templateKey: WhatsAppTemplateKey,
  vars: NotificationTemplateVariables,
): TemplateRenderResult {
  const bodyFn = EMAIL_BODIES[templateKey];
  if (!bodyFn) {
    return { ok: false, code: "MISSING_TEMPLATE" };
  }
  const missing = missingTemplateVariables(templateKey, vars);
  if (missing.length > 0) {
    return { ok: false, code: "MISSING_VARIABLE" };
  }
  const text = bodyFn(vars);
  const html = text
    .split("\n")
    .map((line) => (line.length === 0 ? "<br />" : `<p>${escapeHtml(line)}</p>`))
    .join("");
  const whatsappVariables: Record<string, string> = {};
  for (const key of WHATSAPP_CONTENT_VARIABLE_ORDER[templateKey]) {
    const value = vars[key];
    if (typeof value === "string") {
      whatsappVariables[key] = value;
    }
  }
  return {
    ok: true,
    email: { subject: EMAIL_SUBJECT, text, html },
    whatsappVariables,
  };
}

export function formatPracticeDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(instant);
}

export function formatPracticeTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);
}

export function defaultPracticeName(): string {
  return PRACTICE_NOTIFICATION_NAME;
}

export function numberedContentVariables(
  templateKey: WhatsAppTemplateKey,
  vars: Record<string, string>,
): Record<string, string> {
  const order = WHATSAPP_CONTENT_VARIABLE_ORDER[templateKey] ?? [];
  const numbered: Record<string, string> = {};
  order.forEach((key, index) => {
    numbered[String(index + 1)] = vars[key] ?? "";
  });
  return numbered;
}
