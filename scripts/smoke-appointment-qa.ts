import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isHoneypotTriggered } from "../src/lib/appointment-abuse";
import {
  appointmentEnquirySchema,
  normalizeAppointmentInput,
} from "../src/lib/appointment-schema";
import { buildAppointmentEnquiryEmail } from "../src/lib/email/appointment-enquiry-template";
import type { AppointmentFormValues } from "../src/types/appointment-enquiry";

function loadEnvLocal(): void {
  const path = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional for schema-only checks
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log("PASS", message);
}

function base(overrides: Partial<AppointmentFormValues> = {}): AppointmentFormValues {
  return {
    fullName: "Test Appointment Enquiry",
    ageGroup: "26_40",
    consultationMode: "",
    contactMethod: "whatsapp",
    contactValue: "9876543210",
    preferredDay: "monday",
    preferredTime: "morning",
    briefReason: "This is a test enquiry for website email verification.",
    privacyAccepted: true,
    ...overrides,
  };
}

function parse(values: AppointmentFormValues) {
  return appointmentEnquirySchema.safeParse(normalizeAppointmentInput(values));
}

async function main() {
  loadEnvLocal();

  assert(parse(base()).success, "valid payload accepted");
  assert(!parse(base({ fullName: "" })).success, "empty name rejected");
  assert(!parse(base({ fullName: "   " })).success, "whitespace name rejected");
  assert(parse(base({ fullName: "अनिता शर्मा" })).success, "unicode name accepted");
  assert(!parse(base({ ageGroup: "" })).success, "missing age group rejected");
  assert(
    !parse(base({ ageGroup: "not_a_group" as AppointmentFormValues["ageGroup"] })).success,
    "invalid age group rejected",
  );
  assert(
    !parse(base({ consultationMode: "online" })).success,
    "disabled consultation mode rejected",
  );
  assert(
    !parse(base({ contactMethod: "email", contactValue: "a@b.com" })).success,
    "disabled email contact method rejected",
  );
  assert(
    !parse(base({ contactMethod: "phone", contactValue: "9876543210" })).success,
    "disabled phone contact method rejected",
  );
  assert(
    parse(base({ contactMethod: "whatsapp", contactValue: "9876543210" })).success,
    "enabled WhatsApp contact method accepted",
  );
  assert(
    !parse(base({ contactMethod: "", contactValue: "" })).success,
    "missing WhatsApp contact rejected when method enabled",
  );
  assert(
    !parse(base({ briefReason: "x".repeat(301) })).success,
    "reason over 300 rejected",
  );
  assert(parse(base({ briefReason: "x".repeat(300) })).success, "reason 300 accepted");
  assert(!parse(base({ privacyAccepted: false })).success, "privacy false rejected");
  assert(!isHoneypotTriggered(""), "empty honeypot allowed");
  assert(isHoneypotTriggered("bot"), "populated honeypot blocked");

  const evil = ["<", "script", ">", 'alert("x")', "</", "script", ">"].join("");
  const email = buildAppointmentEnquiryEmail({
    fullName: evil,
    ageGroup: "26_40",
    briefReason: '<img src=x onerror=alert(1)>',
    privacyAccepted: true,
  });
  assert(email.html.includes("&lt;script&gt;"), "html escapes script");
  assert(email.html.includes("&lt;img"), "html escapes img payload");
  assert(!email.subject.toLowerCase().includes("onerror"), "subject excludes reason");

  console.log("Appointment QA smoke matrix passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
