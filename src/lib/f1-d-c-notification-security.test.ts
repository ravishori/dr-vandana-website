/**
 * F1-D-C — Notification & outbox security hardening regressions.
 * Proves recipient integrity, authorization binding, and enumeration absence.
 * Does not send real email/WhatsApp. Does not create a notification inbox.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import { cancelAppointment } from "@/lib/appointments/lifecycle";
import {
  appointmentNotificationDeliveries,
  appointmentNotificationOutbox,
  appointments,
} from "@/lib/appointments/schema";
import {
  createBookingTestWorld,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { generateUuid } from "@/lib/identity/crypto";
import { users } from "@/lib/identity/schema";
import { TEST_NOTIFICATION_SETTINGS } from "@/lib/notifications/constants";
import { createStaticConsentReader } from "@/lib/notifications/consent";
import {
  processNotificationBatch,
  type NotificationDispatcherDeps,
} from "@/lib/notifications/dispatcher";
import { createRecordingEmailSender } from "@/lib/notifications/email-adapter";
import { renderNotificationTemplate } from "@/lib/notifications/templates";
import { createTestWhatsAppService } from "@/lib/notifications/whatsapp";
import { zonedCivilToUtc } from "@/lib/appointments/timezone";

function ist(day: number, hour: number, minute = 0) {
  return zonedCivilToUtc({
    year: 2026,
    month: 8,
    day,
    hour,
    minute,
    second: 0,
  });
}

const SLOT_1000 = ist(17, 10, 0);
const SLOT_1100 = ist(17, 11, 0);
const SLOT_1200 = ist(17, 12, 0);
const SLOT_1500 = ist(17, 15, 0);
const SLOT_1600 = ist(17, 16, 0);

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listFilesRecursive(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function book(w: BookingTestWorld, start: Date = SLOT_1000) {
  return requestAppointment(w.ctx, {
    principal: w.patientA.principal,
    ipAddress: "203.0.113.50",
    appointmentTypePublicId: w.appointmentTypePublicId,
    requestedStart: start.toISOString(),
    idempotencyKey: generateUuid(),
  });
}

function deps(
  w: BookingTestWorld,
  email = createRecordingEmailSender(),
): NotificationDispatcherDeps {
  return {
    db: w.ctx.db,
    now: w.ctx.now,
    email,
    whatsapp: createTestWhatsAppService(),
    consent: createStaticConsentReader(false),
    settings: { ...TEST_NOTIFICATION_SETTINGS },
    nodeEnv: "test",
    auditCtx: w.ctx,
    whatsappDispatchEnabled: false,
  };
}

describe("F1-D-C notification and outbox security", () => {
  const worlds: BookingTestWorld[] = [];

  afterEach(async () => {
    while (worlds.length > 0) {
      const w = worlds.pop();
      if (w) {
        await w.close();
      }
    }
  });

  async function world() {
    const created = await createBookingTestWorld();
    worlds.push(created);
    return created;
  }

  it("Scenario 1–4 — outbox payload is server-derived and carries no recipient contact", async () => {
    const w = await world();
    const result = await book(w);
    assert.equal(result.ok, true);
    const [row] = await w.ctx.db.select().from(appointmentNotificationOutbox);
    assert.ok(row);
    assert.equal(row.eventKey, "AppointmentRequested");
    const payload = row.payloadNonSensitive as Record<string, unknown>;
    for (const forbidden of [
      "recipientId",
      "recipientUserId",
      "recipientEmail",
      "recipientPhone",
      "email",
      "phone",
      "mobile",
      "to",
      "patientEmail",
      "psychologistEmail",
    ]) {
      assert.equal(payload[forbidden], undefined, forbidden);
    }
    assert.equal(typeof payload.appointmentPublicId, "string");
    assert.doesNotMatch(JSON.stringify(payload), /@|\+91/);
  });

  it("Scenario 2/5 — foreign appointment cancel DENY and creates no cancellation outbox", async () => {
    const w = await world();
    const booked = await book(w);
    assert.equal(booked.ok, true);
    if (!booked.ok) {
      return;
    }
    const before = await w.ctx.db.select().from(appointmentNotificationOutbox);
    const beforeCount = before.length;
    const denied = await cancelAppointment(w.ctx, {
      principal: w.patientB.principal,
      publicId: booked.appointment.publicId,
    });
    assert.equal(denied.ok, false);
    if (denied.ok) {
      return;
    }
    // Privacy-preserving load may return NOT_FOUND instead of FORBIDDEN.
    assert.ok(
      denied.code === "FORBIDDEN" || denied.code === "NOT_FOUND",
      denied.code,
    );
    const after = await w.ctx.db.select().from(appointmentNotificationOutbox);
    assert.equal(after.length, beforeCount);
    assert.equal(
      after.some((row) => row.eventKey === "AppointmentCancelled"),
      false,
    );
    const [apt] = await w.ctx.db
      .select({ status: appointments.status })
      .from(appointments)
      .where(eq(appointments.publicId, booked.appointment.publicId));
    assert.notEqual(apt?.status, "CANCELLED");
  });

  it("authorized cancellation emits AppointmentCancelled without recipient fields", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1500);
    assert.equal(booked.ok, true);
    if (!booked.ok) {
      return;
    }
    const cancelled = await cancelAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
    });
    assert.equal(cancelled.ok, true);
    const rows = await w.ctx.db
      .select()
      .from(appointmentNotificationOutbox)
      .where(eq(appointmentNotificationOutbox.eventKey, "AppointmentCancelled"));
    assert.equal(rows.length, 1);
    const payload = JSON.stringify(rows[0]?.payloadNonSensitive);
    assert.doesNotMatch(payload, /@|\+91/);
    assert.doesNotMatch(payload, /recipientEmail|recipientPhone|recipientUserId/i);
  });

  it("Scenario 3/4 — delivery recipient is loaded from appointment→users, not outbox payload", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1100);
    assert.equal(booked.ok, true);
    const email = createRecordingEmailSender();
    await processNotificationBatch(deps(w, email));
    assert.ok(email.sent.some((item) => item.to === w.patientA.email));
    assert.equal(
      email.sent.some((item) => item.to === w.patientB.email),
      false,
    );
    const dispatcher = readFileSync(
      join(process.cwd(), "src/lib/notifications/dispatcher.ts"),
      "utf8",
    );
    assert.match(dispatcher, /patientUsers\.email/);
    assert.match(dispatcher, /psychologistUsers\.email/);
    assert.match(dispatcher, /appointments\.patientUserId/);
    assert.doesNotMatch(
      dispatcher,
      /payloadNonSensitive\.(email|recipient|to|phone)/,
    );
  });

  it("Scenario 6 — same booking idempotency key does not create duplicate outbox events", async () => {
    const w = await world();
    const key = generateUuid();
    const start = SLOT_1200.toISOString();
    const first = await requestAppointment(w.ctx, {
      principal: w.patientA.principal,
      ipAddress: "203.0.113.50",
      appointmentTypePublicId: w.appointmentTypePublicId,
      requestedStart: start,
      idempotencyKey: key,
    });
    const second = await requestAppointment(w.ctx, {
      principal: w.patientA.principal,
      ipAddress: "203.0.113.50",
      appointmentTypePublicId: w.appointmentTypePublicId,
      requestedStart: start,
      idempotencyKey: key,
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) {
      return;
    }
    assert.equal(second.replayed, true);
    const outbox = await w.ctx.db.select().from(appointmentNotificationOutbox);
    assert.equal(outbox.length, 1);
  });

  it("Scenario 7 — delivery claim uses SKIP LOCKED and CAS finalize (at-least-once documented)", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/notifications/dispatcher.ts"),
      "utf8",
    );
    assert.match(source, /FOR UPDATE SKIP LOCKED/);
    assert.match(source, /status.*PROCESSING/);
    assert.match(source, /lockedAt/);
    assert.match(source, /idempotencyKey:\s*delivery\.id/);
    const schema = readFileSync(
      join(process.cwd(), "src/lib/appointments/schema.ts"),
      "utf8",
    );
    assert.match(schema, /appointment_delivery_outbox_channel_role_uidx/);
    const emailAdapter = readFileSync(
      join(process.cwd(), "src/lib/notifications/email-adapter.ts"),
      "utf8",
    );
    // SMTP path intentionally does not pass provider-level idempotency headers.
    assert.doesNotMatch(emailAdapter, /I-Twilio-Idempotency|Idempotency-Key/);
  });

  it("enumeration — no user-facing notification/outbox retrieval or mutation routes", () => {
    const appRoot = join(process.cwd(), "src/app");
    const files = listFilesRecursive(appRoot).filter((path) =>
      /\.(ts|tsx)$/.test(path),
    );
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      assert.doesNotMatch(
        text,
        /appointmentNotificationOutbox|appointmentNotificationDeliveries|processDueNotifications|processNotificationBatch/,
      );
    }
    const consentAction = readFileSync(
      join(process.cwd(), "src/app/patient/account/actions.ts"),
      "utf8",
    );
    assert.match(consentAction, /userId:\s*session\.userId/);
    assert.doesNotMatch(consentAction, /formData\.get\(["']userId["']\)/);
  });

  it("worker CLI refuses production; does not auto-repair providers", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts/process-notifications.ts"),
      "utf8",
    );
    assert.match(script, /NODE_ENV === "production"/);
    assert.match(script, /process\.exit\(1\)/);
    assert.doesNotMatch(script, /CREATE TABLE|ALTER TABLE|DROP /i);
  });

  it("templates escape untrusted names and never embed auth secrets", () => {
    const rendered = renderNotificationTemplate("appointment_confirmed", {
      patientName: `<script>alert(1)</script>`,
      appointmentTypeName: "Consultation",
      appointmentDate: "2026-08-17",
      appointmentTime: "10:00",
      timezone: "Asia/Kolkata",
      appointmentPublicId: "apt_test",
      practiceName: "Practice",
    });
    assert.equal(rendered.ok, true);
    if (!rendered.ok) {
      return;
    }
    assert.doesNotMatch(rendered.email.html, /<script>alert\(1\)<\/script>/);
    assert.match(rendered.email.html, /&lt;script&gt;/);
    const templates = readFileSync(
      join(process.cwd(), "src/lib/notifications/templates.ts"),
      "utf8",
    );
    assert.doesNotMatch(templates, /password|otp|mfa|session token|diagnos/i);
  });

  it("logging paths avoid addresses and credentials", () => {
    const dispatcher = readFileSync(
      join(process.cwd(), "src/lib/notifications/dispatcher.ts"),
      "utf8",
    );
    assert.match(dispatcher, /logStructured/);
    assert.doesNotMatch(
      dispatcher,
      /logStructured[\s\S]{0,400}(patientEmail|psychologistEmail|toE164|password|Authorization)/,
    );
    const twilio = readFileSync(
      join(process.cwd(), "src/lib/notifications/twilio-whatsapp.ts"),
      "utf8",
    );
    assert.doesNotMatch(twilio, /logStructured[\s\S]{0,400}authToken/);
  });

  it("unverified recipient is skipped; foreign user email is never selected", async () => {
    const w = await world();
    await book(w, SLOT_1600);
    await w.ctx.db
      .update(users)
      .set({ emailVerifiedAt: null })
      .where(eq(users.id, w.patientA.userId));
    const email = createRecordingEmailSender();
    await processNotificationBatch(deps(w, email));
    assert.equal(
      email.sent.some((item) => item.to === w.patientA.email),
      false,
    );
    assert.equal(
      email.sent.some((item) => item.to === w.patientB.email),
      false,
    );
    const deliveries = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries);
    const patientEmail = deliveries.find(
      (row) => row.channel === "EMAIL" && row.recipientRole === "PATIENT",
    );
    assert.equal(patientEmail?.status, "SKIPPED");
  });
});
