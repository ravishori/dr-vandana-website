import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { EMAIL_SUBJECT } from "@/lib/notifications/constants";
import {
  missingTemplateVariables,
  renderNotificationTemplate,
  type NotificationTemplateVariables,
} from "@/lib/notifications/templates";

const VARS: NotificationTemplateVariables = {
  patientName: "Asha",
  appointmentTypeName: "Test consultation",
  appointmentDate: "17 August 2026",
  appointmentTime: "10:00",
  timezone: "Asia/Kolkata",
  appointmentPublicId: "APT-TEST12",
  practiceName: "Dr. Vandana Rajiv Chaudhary",
  proposedDate: "18 August 2026",
  proposedTime: "11:00",
};

const FORBIDDEN =
  /otp|password|mfa|session token|diagnos|symptom|clinical note|assessment|treatment plan|depression|anxiety therapy|psychological assessment/i;

describe("notification templates", () => {
  it("uses a privacy-safe subject for every email", () => {
    const rendered = renderNotificationTemplate("appointment_confirmed", VARS);
    assert.equal(rendered.ok, true);
    if (!rendered.ok) {
      return;
    }
    assert.equal(rendered.email.subject, EMAIL_SUBJECT);
    assert.doesNotMatch(rendered.email.subject, FORBIDDEN);
    assert.doesNotMatch(rendered.email.subject, /confirmed|rejected|cancelled/i);
  });

  it("does not describe a request as confirmed", () => {
    const rendered = renderNotificationTemplate("appointment_requested", VARS);
    assert.equal(rendered.ok, true);
    if (!rendered.ok) {
      return;
    }
    assert.match(rendered.email.text, /has been recorded/);
    assert.doesNotMatch(rendered.email.text, /has been confirmed/);
    assert.doesNotMatch(rendered.email.text, FORBIDDEN);
  });

  it("uses operational psychologist request copy", () => {
    const rendered = renderNotificationTemplate(
      "appointment_requested_psychologist",
      VARS,
    );
    assert.equal(rendered.ok, true);
    if (!rendered.ok) {
      return;
    }
    assert.match(rendered.email.text, /New appointment request received/);
    assert.doesNotMatch(rendered.email.text, FORBIDDEN);
  });

  it("keeps rejection copy neutral and omits notes", () => {
    const rendered = renderNotificationTemplate("appointment_rejected", VARS);
    assert.equal(rendered.ok, true);
    if (!rendered.ok) {
      return;
    }
    assert.match(rendered.email.text, /could not be accepted/);
    assert.doesNotMatch(rendered.email.text, /because|note|reason/i);
  });

  it("records a safe failure when a required variable is missing", () => {
    assert.deepEqual(
      missingTemplateVariables("appointment_confirmed", {
        patientName: "Asha",
      }),
      ["appointmentTypeName", "appointmentDate", "appointmentTime", "timezone", "appointmentPublicId"],
    );
    const rendered = renderNotificationTemplate("appointment_confirmed", {
      ...VARS,
      appointmentDate: "",
    });
    assert.equal(rendered.ok, false);
    if (rendered.ok) {
      return;
    }
    assert.equal(rendered.code, "MISSING_VARIABLE");
  });

  it("does not embed provider secrets in template source", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/notifications/templates.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /TWILIO_AUTH_TOKEN|SMTP_PASSWORD|ACxxxxxxxx/);
  });
});
