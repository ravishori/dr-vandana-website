import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  rescheduleAppointment,
} from "@/lib/appointments/lifecycle";
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
import { TEST_NOTIFICATION_SETTINGS, type NotificationDispatcherSettings } from "@/lib/notifications/constants";
import { createStaticConsentReader } from "@/lib/notifications/consent";
import {
  claimDeliveries,
  processNotificationBatch,
  type NotificationDispatcherDeps,
} from "@/lib/notifications/dispatcher";
import {
  createRecordingEmailSender,
  createScriptedEmailSender,
  type ClassifiedEmailSender,
} from "@/lib/notifications/email-adapter";
import { createTestWhatsAppService } from "@/lib/notifications/whatsapp";
import { setPatientWhatsAppConsent } from "@/lib/notifications/consent";

const FORBIDDEN =
  /otp|password|mfa|session token|diagnos|symptom|clinical note|assessment|treatment plan|depression counselling|anxiety therapy/i;

function istBook(w: BookingTestWorld) {
  return requestAppointment(w.ctx, {
    principal: w.patientA.principal,
    ipAddress: "203.0.113.50",
    appointmentTypePublicId: w.appointmentTypePublicId,
    requestedStart: "2026-08-17T04:30:00.000Z",
    idempotencyKey: generateUuid(),
  });
}

function deps(
  w: BookingTestWorld,
  overrides: {
    email?: ClassifiedEmailSender;
    whatsapp?: ReturnType<typeof createTestWhatsAppService>;
    whatsappDispatchEnabled?: boolean;
    nodeEnv?: string;
    consentUserIds?: ReadonlySet<string> | boolean;
    settings?: Partial<NotificationDispatcherSettings>;
  } = {},
): NotificationDispatcherDeps {
  return {
    db: w.ctx.db,
    now: w.ctx.now,
    email: overrides.email ?? createRecordingEmailSender(),
    whatsapp: overrides.whatsapp ?? createTestWhatsAppService(),
    consent: createStaticConsentReader(overrides.consentUserIds ?? false),
    settings: { ...TEST_NOTIFICATION_SETTINGS, ...overrides.settings } satisfies NotificationDispatcherSettings,
    nodeEnv: overrides.nodeEnv ?? "test",
    auditCtx: w.ctx,
    whatsappDispatchEnabled: overrides.whatsappDispatchEnabled ?? false,
  };
}

describe("notification dispatcher", () => {
  const worlds: BookingTestWorld[] = [];

  afterEach(async () => {
    while (worlds.length > 0) {
      const world = worlds.pop();
      if (world) {
        await world.close();
      }
    }
  });

  async function world() {
    const created = await createBookingTestWorld();
    worlds.push(created);
    return created;
  }

  it("creates a pending outbox row in the appointment transaction and does not send", async () => {
    const w = await world();
    const emailsBefore = w.email.messages.length;
    const result = await istBook(w);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const outbox = await w.ctx.db.select().from(appointmentNotificationOutbox);
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0]?.status, "PENDING");
    assert.equal(outbox[0]?.eventKey, "AppointmentRequested");
    assert.equal(w.email.messages.length, emailsBefore);
    const payload = JSON.stringify(outbox[0]?.payloadNonSensitive);
    assert.doesNotMatch(payload, FORBIDDEN);
    assert.doesNotMatch(payload, /@example\.test|\+91/);
    const deliveries = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries);
    assert.equal(deliveries.length, 0);
  });

  it("sends privacy-safe email for a recorded request", async () => {
    const w = await world();
    const booked = await istBook(w);
    assert.equal(booked.ok, true);
    const email = createRecordingEmailSender();
    const stats = await processNotificationBatch(deps(w, { email }));
    assert.equal(stats.sent, 2);
    assert.equal(email.sent.length, 2);
    const patient = email.sent.find((item) => item.to === w.patientA.email);
    const psychologist = email.sent.find(
      (item) => item.to === "vandana@example.test",
    );
    assert.ok(patient);
    assert.ok(psychologist);
    assert.equal(patient?.subject, "Appointment update from Dr. Vandana");
    assert.match(patient?.text ?? "", /has been recorded/);
    assert.doesNotMatch(patient?.text ?? "", /has been confirmed/);
    assert.match(psychologist?.text ?? "", /New appointment request received/);
    assert.doesNotMatch(JSON.stringify(email.sent), FORBIDDEN);
    const outbox = await w.ctx.db.select().from(appointmentNotificationOutbox);
    assert.equal(outbox[0]?.status, "SENT");
  });

  it("skips unverified patient email", async () => {
    const w = await world();
    const booked = await istBook(w);
    assert.equal(booked.ok, true);
    await w.ctx.db
      .update(users)
      .set({ emailVerifiedAt: null })
      .where(eq(users.id, w.patientA.userId));
    const email = createRecordingEmailSender();
    await processNotificationBatch(deps(w, { email }));
    assert.equal(email.sent.some((item) => item.to === w.patientA.email), false);
    const deliveries = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries);
    const patientEmail = deliveries.find(
      (row) => row.channel === "EMAIL" && row.recipientRole === "PATIENT",
    );
    assert.equal(patientEmail?.status, "SKIPPED");
    assert.equal(patientEmail?.lastErrorCode, "EMAIL_UNVERIFIED");
  });

  it("does not create WhatsApp deliveries without opt-in, even if Twilio is enabled", async () => {
    const w = await world();
    await istBook(w);
    const whatsapp = createTestWhatsAppService();
    await processNotificationBatch(
      deps(w, {
        whatsapp,
        whatsappDispatchEnabled: true,
        consentUserIds: false,
      }),
    );
    assert.equal(whatsapp.sent.length, 0);
    const deliveries = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries);
    assert.equal(
      deliveries.some((row) => row.channel === "WHATSAPP"),
      false,
    );
  });

  it("sends WhatsApp only after explicit opt-in and stores a provider reference", async () => {
    const w = await world();
    await istBook(w);
    await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: true,
      source: "test",
    });
    const whatsapp = createTestWhatsAppService();
    await processNotificationBatch(
      deps(w, {
        whatsapp,
        whatsappDispatchEnabled: true,
        consentUserIds: new Set([w.patientA.userId]),
      }),
    );
    assert.equal(whatsapp.sent.length, 1);
    assert.equal(whatsapp.sent[0]?.toE164.startsWith("+91"), true);
    assert.equal(whatsapp.sent[0]?.templateKey, "appointment_requested");
    const [delivery] = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries)
      .where(eq(appointmentNotificationDeliveries.channel, "WHATSAPP"));
    assert.equal(delivery.status, "SENT");
    assert.ok(delivery.providerMessageId);
    assert.doesNotMatch(JSON.stringify(whatsapp.sent[0]?.variables), FORBIDDEN);
  });

  it("respects WhatsApp opt-out", async () => {
    const w = await world();
    await istBook(w);
    await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: true,
      source: "test",
    });
    await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: false,
      source: "test",
    });
    const whatsapp = createTestWhatsAppService();
    await processNotificationBatch(
      deps(w, {
        whatsapp,
        whatsappDispatchEnabled: true,
        consentUserIds: false,
      }),
    );
    assert.equal(whatsapp.sent.length, 0);
  });

  it("retries transient email failures with bounded backoff then dead-letters", async () => {
    const w = await world();
    await istBook(w);
    const email = createScriptedEmailSender([
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
      { ok: false, category: "TRANSIENT", code: "RATE_LIMITED" },
      { ok: false, category: "TRANSIENT", code: "PROVIDER_5XX" },
      { ok: false, category: "TRANSIENT", code: "CONNECTION_FAILURE" },
      { ok: false, category: "TRANSIENT", code: "PROVIDER_UNAVAILABLE" },
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
      { ok: false, category: "TRANSIENT", code: "TIMEOUT" },
    ]);
    const dispatcher = deps(w, { email, settings: { maxAttempts: 5, backoffMs: [0, 0, 0, 0, 0] } });
    for (let index = 0; index < 6; index += 1) {
      await processNotificationBatch(dispatcher);
    }
    const deliveries = await w.ctx.db
      .select()
      .from(appointmentNotificationDeliveries)
      .where(eq(appointmentNotificationDeliveries.channel, "EMAIL"));
    assert.equal(deliveries.some((row) => row.status === "DEAD"), true);
    assert.ok((deliveries.find((row) => row.status === "DEAD")?.attemptCount ?? 0) <= 5);
    const [appointment] = await w.ctx.db.select().from(appointments);
    assert.equal(appointment.status, "PENDING");
  });

  it("does not retry permanent provider failures", async () => {
    const w = await world();
    await istBook(w);
    const email = createScriptedEmailSender([
      { ok: false, category: "PERMANENT", code: "INVALID_RECIPIENT" },
      { ok: false, category: "PERMANENT", code: "INVALID_RECIPIENT" },
    ]);
    const dispatcher = deps(w, { email });
    await processNotificationBatch(dispatcher);
    await processNotificationBatch(dispatcher);
    const patient = (
      await w.ctx.db.select().from(appointmentNotificationDeliveries)
    ).find((row) => row.recipientRole === "PATIENT" && row.channel === "EMAIL");
    assert.equal(patient?.status, "DEAD");
    assert.equal(patient?.lastErrorCode, "INVALID_RECIPIENT");
    assert.equal(patient?.attemptCount, 1);
  });

  it("is idempotent across worker restarts after a successful send", async () => {
    const w = await world();
    await istBook(w);
    const email = createRecordingEmailSender();
    const dispatcher = deps(w, { email });
    await processNotificationBatch(dispatcher);
    const first = email.sent.length;
    await processNotificationBatch(dispatcher);
    assert.equal(email.sent.length, first);
  });

  it("lets only one worker claim a delivery", async () => {
    const w = await world();
    await istBook(w);
    const dispatcher = deps(w, { email: createRecordingEmailSender() });
    await processNotificationBatch({
      ...dispatcher,
      settings: { ...dispatcher.settings, batchSize: 0 },
    });
    const first = await claimDeliveries(dispatcher);
    const second = await claimDeliveries(dispatcher);
    assert.ok(first.length > 0);
    assert.equal(second.length, 0);
  });

  it("recovers an expired processing lease", async () => {
    const w = await world();
    await istBook(w);
    const dispatcher = deps(w, {
      email: createRecordingEmailSender(),
      settings: { leaseMs: 20, batchSize: 50 },
    });
    await processNotificationBatch({
      ...dispatcher,
      settings: { ...dispatcher.settings, batchSize: 0 },
    });
    const claimed = await claimDeliveries(dispatcher);
    assert.ok(claimed.length > 0);
    const again = await claimDeliveries(dispatcher);
    assert.equal(again.length, 0);
    w.advanceMs(50);
    const recovered = await claimDeliveries(dispatcher);
    assert.equal(recovered.length, claimed.length);
  });

  it("keeps booking, confirm, cancel, and reschedule successful when providers fail", async () => {
    const w = await world();
    const email = createScriptedEmailSender(
      Array.from({ length: 20 }, () => ({
        ok: false as const,
        category: "TRANSIENT" as const,
        code: "TIMEOUT" as const,
      })),
    );
    const whatsapp = createTestWhatsAppService();
    whatsapp.nextResults.push({
      ok: false,
      category: "TRANSIENT",
      code: "PROVIDER_UNAVAILABLE",
    });
    const booked = await istBook(w);
    assert.equal(booked.ok, true);
    if (!booked.ok) {
      return;
    }
    await processNotificationBatch(
      deps(w, { email, whatsapp, whatsappDispatchEnabled: true }),
    );
    const [pending] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.appointment.publicId));
    assert.equal(pending.status, "PENDING");

    const confirmed = await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
      expectedVersion: 1,
    });
    assert.equal(confirmed.ok, true);
    await processNotificationBatch(
      deps(w, { email, whatsapp, whatsappDispatchEnabled: true }),
    );
    const [afterConfirm] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.appointment.publicId));
    assert.equal(afterConfirm.status, "CONFIRMED");

    const rescheduled = await rescheduleAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
      expectedVersion: 2,
      requestedStart: "2026-08-17T05:30:00.000Z",
    });
    assert.equal(rescheduled.ok, true);
    await processNotificationBatch(
      deps(w, { email, whatsapp, whatsappDispatchEnabled: true }),
    );
    const [afterReschedule] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.appointment.publicId));
    assert.equal(afterReschedule.status, "CONFIRMED");

    const cancelled = await cancelAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
      expectedVersion: 3,
    });
    assert.equal(cancelled.ok, true);
    await processNotificationBatch(
      deps(w, { email, whatsapp, whatsappDispatchEnabled: true }),
    );
    const [afterCancel] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.appointment.publicId));
    assert.equal(afterCancel.status, "CANCELLED");
  });

  it("does not send completion mail unless the policy flag is enabled", async () => {
    const w = await world();
    const booked = await istBook(w);
    assert.equal(booked.ok, true);
    if (!booked.ok) {
      return;
    }
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
    });
    const completed = await completeAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.appointment.publicId,
    });
    assert.equal(completed.ok, true);
    const email = createRecordingEmailSender();
    await processNotificationBatch(deps(w, { email }));
    const completedOutbox = (
      await w.ctx.db.select().from(appointmentNotificationOutbox)
    ).find((row) => row.eventKey === "AppointmentCompleted");
    assert.equal(completedOutbox?.status, "SENT");
    assert.equal(completedOutbox?.lastErrorCode, "POLICY_SKIPPED");
    assert.equal(
      email.sent.some((item) => /marked complete/i.test(item.text)),
      false,
    );
  });

  it("isolates one failed delivery from others in the same batch", async () => {
    const w = await world();
    await istBook(w);
    const email = createScriptedEmailSender([
      { ok: false, category: "PERMANENT", code: "INVALID_RECIPIENT" },
      { ok: true },
    ]);
    const stats = await processNotificationBatch(deps(w, { email }));
    assert.equal(stats.dead >= 1, true);
    assert.equal(stats.sent >= 1, true);
  });

  it("refuses a test WhatsApp provider in production dispatch", async () => {
    const w = await world();
    await istBook(w);
    await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: true,
      source: "test",
    });
    const whatsapp = createTestWhatsAppService();
    await processNotificationBatch(
      deps(w, {
        whatsapp,
        whatsappDispatchEnabled: true,
        consentUserIds: new Set([w.patientA.userId]),
        nodeEnv: "production",
      }),
    );
    assert.equal(whatsapp.sent.length, 0);
    const wa = (
      await w.ctx.db.select().from(appointmentNotificationDeliveries)
    ).find((row) => row.channel === "WHATSAPP");
    assert.equal(wa?.status, "DEAD");
    assert.equal(wa?.lastErrorCode, "WHATSAPP_PROVIDER_FORBIDDEN");
  });

  it("keeps appointment modules free of Twilio and Nodemailer imports", () => {
    const root = join(process.cwd(), "src/lib/appointments");
    for (const file of ["booking.ts", "lifecycle.ts", "patient-portal.ts"]) {
      const source = readFileSync(join(root, file), "utf8");
      assert.doesNotMatch(source, /from ["']twilio["']|nodemailer|wa\.me|bitly/i);
    }
    const account = readFileSync(
      join(process.cwd(), "src/app/patient/account/page.tsx"),
      "utf8",
    );
    assert.doesNotMatch(account, /TWILIO_AUTH_TOKEN|SMTP_PASSWORD|NEXT_PUBLIC_TWILIO/);
  });
});
