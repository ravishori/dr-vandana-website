import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import { BOOKING_SAFE_MESSAGES } from "@/lib/appointments/constants";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import { appointments } from "@/lib/appointments/schema";
import {
  createBookingTestWorld,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { zonedCivilToUtc } from "@/lib/appointments/timezone";
import { generateUuid } from "@/lib/identity/crypto";

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

describe("phase 2C booking concurrency", () => {
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

  it("allows only one of two patients to take the same slot", async () => {
    const w = await world();
    const results = await Promise.all([
      requestAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.41",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: generateUuid(),
      }),
      requestAppointment(w.ctx, {
        principal: w.patientB.principal,
        ipAddress: "203.0.113.42",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: generateUuid(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const conflicts = results.filter(
      (result) => !result.ok && result.code === "SLOT_UNAVAILABLE",
    );
    assert.equal(successes.length, 1);
    assert.equal(conflicts.length, 1);
    assert.equal(
      conflicts[0] && !conflicts[0].ok ? conflicts[0].message : "",
      BOOKING_SAFE_MESSAGES.slotUnavailable,
    );
    const rows = await w.ctx.db.select().from(appointments);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.status, "PENDING");
    const serialized = JSON.stringify(results);
    assert.doesNotMatch(serialized, /23P01|exclusion|appointments_blocking/i);
  });

  it("allows only one concurrent booking for the same patient and slot", async () => {
    const w = await world();
    const results = await Promise.all([
      requestAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.43",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: generateUuid(),
      }),
      requestAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.43",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: generateUuid(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const conflicts = results.filter((result) => !result.ok);
    assert.equal(successes.length, 1);
    assert.equal(conflicts.length, 1);
    const rows = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.patientUserId, w.patientA.userId));
    assert.equal(rows.length, 1);
  });

  it("rejects overlapping concurrent bookings of different types", async () => {
    const w = await world();
    const other = await seedTestPracticeConfiguration(
      w.ctx.db,
      w.psychologistUserId,
      w.ctx.now(),
      { name: "Overlap type", durationMinutes: 30 },
    );
    const results = await Promise.all([
      requestAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.44",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: generateUuid(),
      }),
      requestAppointment(w.ctx, {
        principal: w.patientB.principal,
        ipAddress: "203.0.113.45",
        appointmentTypePublicId: other.appointmentTypePublicId,
        requestedStart: ist(17, 10, 15).toISOString(),
        idempotencyKey: generateUuid(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const conflicts = results.filter((result) => !result.ok);
    assert.equal(successes.length, 1);
    assert.equal(conflicts.length, 1);
    const rows = await w.ctx.db.select({ id: appointments.id }).from(appointments);
    assert.equal(rows.length, 1);
  });
});
