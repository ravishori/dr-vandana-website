import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import {
  cancelAppointment,
  confirmAppointment,
  requestRescheduleAppointment,
} from "@/lib/appointments/lifecycle";
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
const SLOT_1100 = ist(17, 11, 0);
const SLOT_1500 = ist(17, 15, 0);

describe("phase 2E patient portal concurrency", () => {
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

  async function book(w: BookingTestWorld, start: Date, principal = w.patientA.principal) {
    const result = await requestAppointment(w.ctx, {
      principal,
      ipAddress: "203.0.113.80",
      appointmentTypePublicId: w.appointmentTypePublicId,
      requestedStart: start.toISOString(),
      idempotencyKey: generateUuid(),
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("book_failed");
    }
    return result.appointment;
  }

  it("resolves patient and psychologist cancellation to one winner", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000);
    const results = await Promise.all([
      cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
      cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.equal(row.status, "CANCELLED");
  });

  it("resolves patient reschedule request versus psychologist cancellation", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000);
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.publicId,
    });
    const results = await Promise.all([
      requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        expectedVersion: 2,
        requestedStart: SLOT_1500.toISOString(),
      }),
      cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.ok(row.status === "CANCELLED" || row.status === "RESCHEDULE_REQUESTED");
    if (row.status === "RESCHEDULE_REQUESTED") {
      assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
    }
  });

  it("does not take a proposed slot already booked by another patient", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000, w.patientA.principal);
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.publicId,
    });
    const results = await Promise.all([
      requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        requestedStart: SLOT_1100.toISOString(),
      }),
      requestAppointment(w.ctx, {
        principal: w.patientB.principal,
        ipAddress: "203.0.113.81",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1100.toISOString(),
        idempotencyKey: generateUuid(),
      }),
    ]);
    const requestOk = results[0]?.ok === true;
    const bookOk = results[1]?.ok === true;
    assert.equal(requestOk && bookOk, false);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
  });
});
