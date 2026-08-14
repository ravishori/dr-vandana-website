import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markAppointmentNoShow,
  rescheduleAppointment,
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

describe("phase 2D lifecycle concurrency", () => {
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
      ipAddress: "203.0.113.60",
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

  it("allows only one concurrent confirmation", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000);
    const results = await Promise.all([
      confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
      confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const failures = results.filter((result) => !result.ok);
    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.equal(row.status, "CONFIRMED");
  });

  it("allows only one of complete and no-show", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000);
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.publicId,
    });
    const results = await Promise.all([
      completeAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
      markAppointmentNoShow(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    assert.equal(successes.length, 1);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.ok(row.status === "COMPLETED" || row.status === "NO_SHOW");
  });

  it("allows only one reschedule onto the same target slot", async () => {
    const w = await world();
    const first = await book(w, SLOT_1000, w.patientA.principal);
    const second = await book(w, SLOT_1100, w.patientB.principal);
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: first.publicId,
    });
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: second.publicId,
    });
    const results = await Promise.all([
      rescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: first.publicId,
        requestedStart: SLOT_1500.toISOString(),
      }),
      rescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: second.publicId,
        requestedStart: SLOT_1500.toISOString(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    const failures = results.filter((result) => !result.ok);
    assert.equal(successes.length, 1);
    assert.equal(failures.length, 1);
    const rows = await w.ctx.db.select().from(appointments);
    const atTarget = rows.filter(
      (row) => row.startsAt.toISOString() === SLOT_1500.toISOString(),
    );
    assert.equal(atTarget.length, 1);
  });

  it("resolves cancel versus reschedule deterministically", async () => {
    const w = await world();
    const booked = await book(w, SLOT_1000);
    await confirmAppointment(w.ctx, {
      principal: w.psychologistPrincipal,
      publicId: booked.publicId,
    });
    const results = await Promise.all([
      cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
      }),
      rescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 2,
        requestedStart: SLOT_1500.toISOString(),
      }),
    ]);
    const successes = results.filter((result) => result.ok);
    assert.equal(successes.length, 1);
    const [row] = await w.ctx.db
      .select()
      .from(appointments)
      .where(eq(appointments.publicId, booked.publicId));
    assert.ok(row.status === "CANCELLED" || row.status === "CONFIRMED");
    if (row.status === "CONFIRMED") {
      assert.equal(row.startsAt.toISOString(), SLOT_1500.toISOString());
    }
  });
});
