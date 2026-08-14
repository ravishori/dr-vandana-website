import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import { BOOKING_SAFE_MESSAGES } from "@/lib/appointments/constants";
import { TEST_BUFFER_AFTER_MINUTES, TEST_APPOINTMENT_DURATION_MINUTES } from "@/lib/appointments/fixtures";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  appointmentHistory,
  appointmentNotificationOutbox,
  appointmentTypes,
  appointments,
} from "@/lib/appointments/schema";
import {
  activateTestPatient,
  createBookingTestWorld,
  insertTestAppointment,
  insertTestException,
  registerUnverifiedPatient,
  updateTestBookingWindow,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { addMinutes, zonedCivilToUtc } from "@/lib/appointments/timezone";
import { generateUuid } from "@/lib/identity/crypto";
import { auditLogs, users } from "@/lib/identity/schema";

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

describe("phase 2C appointment booking", () => {
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

  function book(
    w: BookingTestWorld,
    overrides: {
      principal?: Parameters<typeof requestAppointment>[1]["principal"];
      appointmentTypePublicId?: string;
      requestedStart?: string;
      idempotencyKey?: string;
      ipAddress?: string;
      patientUserId?: string;
      psychologistId?: string;
      hooks?: Parameters<typeof requestAppointment>[1]["hooks"];
    } = {},
  ) {
    return requestAppointment(w.ctx, {
      principal: overrides.principal === undefined ? w.patientA.principal : overrides.principal,
      ipAddress: overrides.ipAddress ?? "203.0.113.40",
      appointmentTypePublicId:
        overrides.appointmentTypePublicId ?? w.appointmentTypePublicId,
      requestedStart: overrides.requestedStart ?? SLOT_1000.toISOString(),
      idempotencyKey: overrides.idempotencyKey ?? generateUuid(),
      hooks: overrides.hooks,
      ...(overrides.patientUserId
        ? { patientUserId: overrides.patientUserId }
        : {}),
      ...(overrides.psychologistId
        ? { psychologistId: overrides.psychologistId }
        : {}),
    } as Parameters<typeof requestAppointment>[1]);
  }

  describe("authentication", () => {
    it("rejects unauthenticated booking", async () => {
      const w = await world();
      const result = await book(w, { principal: null });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "UNAUTHENTICATED");
      assert.equal(result.message, BOOKING_SAFE_MESSAGES.unauthenticated);
    });

    it("rejects unverified patients", async () => {
      const w = await world();
      const pending = await registerUnverifiedPatient(
        w,
        "pending@example.test",
        "9876543220",
      );
      const result = await book(w, { principal: pending.principal });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "FORBIDDEN");
    });

    it("rejects inactive patients", async () => {
      const w = await world();
      await w.ctx.db
        .update(users)
        .set({ status: "SUSPENDED", updatedAt: w.ctx.now() })
        .where(eq(users.id, w.patientA.userId));
      const result = await book(w);
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "FORBIDDEN");
    });

    it("rejects non-patient roles", async () => {
      const w = await world();
      const result = await book(w, { principal: w.psychologistPrincipal });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "FORBIDDEN");
    });
  });

  describe("validation", () => {
    it("rejects an unknown appointment type", async () => {
      const w = await world();
      const result = await book(w, { appointmentTypePublicId: "ATY-23456789" });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "TYPE_UNAVAILABLE");
      assert.equal(result.message, BOOKING_SAFE_MESSAGES.typeUnavailable);
    });

    it("rejects an inactive appointment type", async () => {
      const w = await world();
      await w.ctx.db
        .update(appointmentTypes)
        .set({ active: false, updatedAt: w.ctx.now() })
        .where(eq(appointmentTypes.id, w.appointmentTypeId));
      const result = await book(w);
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "TYPE_UNAVAILABLE");
    });

    it("rejects an invalid date", async () => {
      const w = await world();
      const result = await book(w, { requestedStart: "not-a-timestamp" });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "VALIDATION");
      assert.doesNotMatch(result.message, /postgres|constraint|sql/i);
    });

    it("rejects a time that is not an exact generated slot", async () => {
      const w = await world();
      const result = await book(w, {
        requestedStart: ist(17, 10, 7).toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
    });

    it("rejects a past slot", async () => {
      const w = await world();
      const result = await book(w, {
        requestedStart: ist(14, 10, 0).toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "IN_THE_PAST");
      assert.equal(result.message, BOOKING_SAFE_MESSAGES.inThePast);
    });

    it("rejects a slot outside practice hours", async () => {
      const w = await world();
      const result = await book(w, {
        requestedStart: ist(17, 9, 0).toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
      assert.equal(result.message, BOOKING_SAFE_MESSAGES.outsideAvailability);
    });

    it("rejects a slot during the break", async () => {
      const w = await world();
      const result = await book(w, {
        requestedStart: ist(17, 13, 0).toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
    });

    it("rejects a full-day closure", async () => {
      const w = await world();
      await insertTestException(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        kind: "FULL_DAY_CLOSURE",
        localDate: "2026-08-17",
      });
      const result = await book(w);
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
    });

    it("rejects an unavailable period", async () => {
      const w = await world();
      await insertTestException(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        kind: "UNAVAILABLE_PERIOD",
        startsAt: ist(17, 10, 0),
        endsAt: ist(17, 12, 0),
      });
      const result = await book(w);
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
    });

    it("rejects a slot that misses minimum notice", async () => {
      const w = await world();
      await updateTestBookingWindow(w.ctx, w.psychologistUserId, {
        minimumNoticeMinutes: 120,
      });
      const result = await book(w, {
        requestedStart: ist(14, 15, 0).toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.ok(
        result.code === "IN_THE_PAST" || result.code === "OUTSIDE_AVAILABILITY",
      );
    });

    it("rejects a slot beyond maximum advance", async () => {
      const w = await world();
      await updateTestBookingWindow(w.ctx, w.psychologistUserId, {
        maximumAdvanceDays: 2,
      });
      const result = await book(w, {
        requestedStart: SLOT_1000.toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "OUTSIDE_AVAILABILITY");
    });
  });

  describe("ownership", () => {
    it("derives the patient from the session and ignores client ids", async () => {
      const w = await world();
      const result = await book(w, {
        patientUserId: w.patientB.userId,
        psychologistId: generateUuid(),
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, result.appointment.publicId));
      assert.equal(row.patientUserId, w.patientA.userId);
      assert.equal(row.psychologistUserId, w.psychologistUserId);
      assert.equal(result.appointment.status, "PENDING");
      assert.doesNotMatch(JSON.stringify(result), /[0-9a-f-]{36}/i);
    });
  });

  describe("successful booking", () => {
    it("creates a pending appointment with duration, occupancy, history, outbox, and audit", async () => {
      const w = await world();
      const result = await book(w, { requestedStart: SLOT_1000.toISOString() });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.match(result.appointment.publicId, /^APT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
      assert.doesNotMatch(result.appointment.publicId, /000001/);
      assert.equal(result.appointment.status, "PENDING");
      assert.equal(result.appointment.timezone, "Asia/Kolkata");
      assert.equal(result.appointment.date, "2026-08-17");
      assert.equal(result.appointment.start, SLOT_1000.toISOString());
      assert.equal(
        result.appointment.end,
        addMinutes(SLOT_1000, TEST_APPOINTMENT_DURATION_MINUTES).toISOString(),
      );
      assert.equal(result.message, BOOKING_SAFE_MESSAGES.recorded);
      assert.doesNotMatch(result.message, /email|whatsapp|sms/i);

      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, result.appointment.publicId));
      assert.equal(row.status, "PENDING");
      assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
      assert.equal(
        row.endsAt.toISOString(),
        addMinutes(SLOT_1000, TEST_APPOINTMENT_DURATION_MINUTES).toISOString(),
      );
      assert.equal(row.occupiedStartsAt.toISOString(), SLOT_1000.toISOString());
      assert.equal(
        row.occupiedEndsAt.toISOString(),
        addMinutes(SLOT_1000, TEST_APPOINTMENT_DURATION_MINUTES + TEST_BUFFER_AFTER_MINUTES).toISOString(),
      );

      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.length, 2);
      assert.equal(history[0]?.eventType, "CREATED");
      assert.equal(history[0]?.toStatus, "REQUESTED");
      assert.equal(history[1]?.eventType, "REQUESTED");
      assert.equal(history[1]?.toStatus, "PENDING");
      assert.equal(history[0]?.actorUserId, w.patientA.userId);

      const outbox = await w.ctx.db
        .select()
        .from(appointmentNotificationOutbox)
        .where(eq(appointmentNotificationOutbox.appointmentId, row.id));
      assert.equal(outbox.length, 1);
      assert.equal(outbox[0]?.eventKey, "AppointmentRequested");
      assert.equal(outbox[0]?.status, "PENDING");
      assert.equal(
        (outbox[0]?.payloadNonSensitive as { appointmentPublicId?: string }).appointmentPublicId,
        result.appointment.publicId,
      );

      const [audit] = await w.ctx.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "APPOINTMENT_REQUESTED"));
      assert.equal(audit?.result, "SUCCESS");
      assert.equal(audit?.targetId, result.appointment.publicId);
      assert.equal(audit?.actorUserId, w.patientA.userId);
    });

    it("allows the same patient to book different slots", async () => {
      const w = await world();
      const first = await book(w, { requestedStart: SLOT_1000.toISOString() });
      const second = await book(w, { requestedStart: SLOT_1100.toISOString() });
      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      const rows = await w.ctx.db
        .select({ id: appointments.id })
        .from(appointments)
        .where(eq(appointments.patientUserId, w.patientA.userId));
      assert.equal(rows.length, 2);
    });

    it("does not let cancelled appointments block a later booking", async () => {
      const w = await world();
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientB.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CANCELLED",
        startsAt: SLOT_1000,
        endsAt: addMinutes(SLOT_1000, 30),
        bufferAfterMinutes: 10,
      });
      const result = await book(w);
      assert.equal(result.ok, true);
    });
  });

  describe("idempotency", () => {
    it("replays the same key without creating a second appointment", async () => {
      const w = await world();
      const key = generateUuid();
      const first = await book(w, { idempotencyKey: key });
      const second = await book(w, { idempotencyKey: key });
      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      if (!first.ok || !second.ok) {
        return;
      }
      assert.equal(second.replayed, true);
      assert.equal(second.appointment.publicId, first.appointment.publicId);
      const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
      assert.equal(rows.length, 1);
    });

    it("rejects the same key with a different slot", async () => {
      const w = await world();
      const key = generateUuid();
      const first = await book(w, {
        idempotencyKey: key,
        requestedStart: SLOT_1000.toISOString(),
      });
      const second = await book(w, {
        idempotencyKey: key,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(first.ok, true);
      assert.equal(second.ok, false);
      if (second.ok) {
        return;
      }
      assert.equal(second.code, "IDEMPOTENCY_CONFLICT");
      const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
      assert.equal(rows.length, 1);
    });

    it("does not let one patient read another patient's idempotency result", async () => {
      const w = await world();
      const key = generateUuid();
      const first = await book(w, {
        principal: w.patientA.principal,
        idempotencyKey: key,
      });
      assert.equal(first.ok, true);
      const second = await book(w, {
        principal: w.patientB.principal,
        idempotencyKey: key,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(second.ok, true);
      if (!first.ok || !second.ok) {
        return;
      }
      assert.notEqual(second.appointment.publicId, first.appointment.publicId);
      assert.equal(second.replayed, undefined);
    });
  });

  describe("conflicts", () => {
    it("rejects overlapping types on the same psychologist", async () => {
      const w = await world();
      const other = await seedTestPracticeConfiguration(
        w.ctx.db,
        w.psychologistUserId,
        w.ctx.now(),
        { name: "Second test type", durationMinutes: 30 },
      );
      const first = await book(w, {
        principal: w.patientA.principal,
        requestedStart: SLOT_1000.toISOString(),
      });
      const second = await book(w, {
        principal: w.patientB.principal,
        appointmentTypePublicId: other.appointmentTypePublicId,
        requestedStart: ist(17, 10, 15).toISOString(),
      });
      assert.equal(first.ok, true);
      assert.equal(second.ok, false);
      if (second.ok) {
        return;
      }
      assert.equal(second.code, "SLOT_UNAVAILABLE");
      assert.equal(second.message, BOOKING_SAFE_MESSAGES.slotUnavailable);
    });
  });

  describe("transaction rollback", () => {
    it("rolls back the appointment if history insert fails", async () => {
      const w = await world();
      const result = await book(w, {
        hooks: {
          afterAppointmentInsert: async () => {
            throw new Error("test_history_pre_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
      assert.equal(rows.length, 0);
      const history = await w.ctx.db
        .select({ id: appointmentHistory.id })
        .from(appointmentHistory);
      assert.equal(history.length, 0);
    });

    it("rolls back the appointment if outbox insert fails", async () => {
      const w = await world();
      const result = await book(w, {
        hooks: {
          afterHistoryInsert: async () => {
            throw new Error("test_outbox_pre_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
      assert.equal(rows.length, 0);
    });

    it("rolls back if the outbox step throws after insert", async () => {
      const w = await world();
      const result = await book(w, {
        hooks: {
          afterOutboxInsert: async () => {
            throw new Error("test_outbox_post_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
      assert.equal(rows.length, 0);
      const outbox = await w.ctx.db
        .select({ id: appointmentNotificationOutbox.id })
        .from(appointmentNotificationOutbox);
      assert.equal(outbox.length, 0);
    });
  });

  describe("rate limiting", () => {
    it("limits repeated booking attempts per patient", async () => {
      const w = await world();
      const unavailable = ist(17, 9, 0).toISOString();
      for (let index = 0; index < 10; index += 1) {
        const result = await book(w, {
          requestedStart: unavailable,
          ipAddress: "198.51.100.10",
        });
        assert.equal(result.ok, false);
        if (result.ok) {
          return;
        }
        assert.notEqual(result.code, "RATE_LIMITED");
      }
      const limited = await book(w, {
        requestedStart: unavailable,
        ipAddress: "198.51.100.10",
      });
      assert.equal(limited.ok, false);
      if (limited.ok) {
        return;
      }
      assert.equal(limited.code, "RATE_LIMITED");
    });
  });

  describe("idor", () => {
    it("does not activate an account as a side effect of booking", async () => {
      const w = await world();
      const extra = await activateTestPatient(
        w,
        "patient-c@example.test",
        "9876543212",
      );
      await w.ctx.db
        .update(users)
        .set({ status: "DISABLED", updatedAt: w.ctx.now() })
        .where(eq(users.id, extra.userId));
      const result = await book(w, { principal: extra.principal });
      assert.equal(result.ok, false);
      const [user] = await w.ctx.db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, extra.userId));
      assert.equal(user.status, "DISABLED");
    });
  });
});
