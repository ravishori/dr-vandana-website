import { appointmentConfig } from "@/data/appointment-enquiry";
import { escapeHtml } from "@/lib/email/html-escape";
import type { AppointmentEnquiryParsed } from "@/lib/appointment-schema";
import type { ConfigOption } from "@/types/appointment-enquiry";
import { siteConfig } from "@/config/site";

export type AppointmentEnquiryEmailContent = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

function labelFor<T extends string>(
  options: readonly ConfigOption<T>[],
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  return options.find((option) => option.value === value)?.label ?? value;
}

function displayOrOmitted(value: string | undefined): string {
  return value && value.trim().length > 0 ? value : "Not provided";
}

/**
 * Build HTML + plain-text enquiry email content from validated payload only.
 * User-controlled values are HTML-escaped. Subject excludes brief reason.
 */
export function buildAppointmentEnquiryEmail(
  enquiry: AppointmentEnquiryParsed,
): AppointmentEnquiryEmailContent {
  const ageGroupLabel = labelFor(appointmentConfig.ageGroups, enquiry.ageGroup);
  const consultationModeLabel = labelFor(
    appointmentConfig.consultationModes,
    enquiry.consultationMode,
  );
  const contactMethodLabel = labelFor(
    appointmentConfig.contactMethods,
    enquiry.contactMethod,
  );
  const preferredDayLabel = labelFor(
    appointmentConfig.preferredDays,
    enquiry.preferredDay,
  );
  const preferredTimeLabel = labelFor(
    appointmentConfig.preferredTimes,
    enquiry.preferredTime,
  );

  const rows: Array<{ label: string; value: string }> = [
    { label: "Name", value: enquiry.fullName },
    { label: "Age group", value: displayOrOmitted(ageGroupLabel) },
  ];

  if (enquiry.consultationMode) {
    rows.push({
      label: "Preferred consultation mode",
      value: displayOrOmitted(consultationModeLabel),
    });
  }

  if (enquiry.contactMethod) {
    rows.push({
      label: "Preferred contact method",
      value: displayOrOmitted(contactMethodLabel),
    });
    rows.push({
      label: "Contact information",
      value: displayOrOmitted(enquiry.contactValue),
    });
  }

  if (enquiry.preferredDay) {
    rows.push({
      label: "Preferred day",
      value: displayOrOmitted(preferredDayLabel),
    });
  }

  if (enquiry.preferredTime) {
    rows.push({
      label: "Preferred time",
      value: displayOrOmitted(preferredTimeLabel),
    });
  }

  rows.push({
    label: "Brief reason",
    value: displayOrOmitted(enquiry.briefReason),
  });
  rows.push({
    label: "Privacy acknowledgement",
    value: "Confirmed",
  });

  const subject = `New Appointment Enquiry — ${siteConfig.professionalName}`;

  const textLines = [
    "Appointment Enquiry",
    "",
    "A new appointment enquiry has been submitted through the website.",
    "",
    ...rows.flatMap((row) => [`${row.label}:`, row.value, ""]),
    "This message is an appointment enquiry submitted through the website. It does not confirm an appointment or consultation time. The practice will respond separately regarding availability.",
    "",
    "Please handle this enquiry with appropriate confidentiality. Do not forward unnecessary copies.",
  ];

  const htmlRows = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 0;vertical-align:top;width:220px;color:#626E65;font-size:14px;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 0;vertical-align:top;color:#2B332C;font-size:14px;">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FBF9F5;color:#2B332C;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:#5A7361;">Appointment Enquiry</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#2B332C;">
        A new appointment enquiry has been submitted through the website.
      </p>
      <table role="presentation" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #88A090;border-radius:8px;padding:16px;">
        <tbody>
          ${htmlRows}
        </tbody>
      </table>
      <p style="margin:20px 0 8px;font-size:13px;line-height:1.5;color:#626E65;">
        This message is an appointment enquiry submitted through the website. It does not confirm an appointment or consultation time. The practice will respond separately regarding availability.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#626E65;">
        Please handle this enquiry with appropriate confidentiality. Do not forward unnecessary copies.
      </p>
    </div>
  </body>
</html>`;

  const replyTo =
    enquiry.contactMethod === "email" && enquiry.contactValue
      ? enquiry.contactValue
      : undefined;

  return {
    subject,
    html,
    text: textLines.join("\n"),
    replyTo,
  };
}
