import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { availabilityService } from "@/lib/appointments/availability";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  createAvailabilityTestWorld,
  insertTestAppointment,
  insertTestException,
  updateTestBookingWindow,
  type AvailabilityTestWorld,
} from "@/lib/appointments/test-support";
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

describe("availability service — database occupancy", () => {
  const worlds: AvailabilityTestWorld[] = [];

  afterEach(async () => {
    while (worlds.length > 0) {
      const world = worlds.pop();
      if (world) {
        await world.close();
      }
    }
  });

  async function world() {
    const created = await createAvailabilityTestWorld();
    worlds.push(created);
    return created;
  }

  it("excludes PENDING and CONFIRMED occupied ranges via tstzrange", async () => {
    const w = await world();
    await insertTestAppointment(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      patientUserId: w.patientUserId,
      appointmentTypeId: w.appointmentTypeId,
      status: "PENDING",
      startsAt: ist(17, 10, 0),
      endsAt: ist(17, 10, 30),
      bufferAfterMinutes: 10,
    });
    await insertTestAppointment(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      patientUserId: w.patientUserId,
      appointmentTypeId: w.appointmentTypeId,
      status: "CONFIRMED",
      startsAt: ist(17, 14, 0),
      endsAt: ist(17, 14, 30),
      bufferAfterMinutes: 10,
    });
    const result = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    const starts = result.slots.map((slot) => slot.start);
    assert.equal(starts.includes(ist(17, 10, 0).toISOString()), false);
    assert.equal(starts.includes(ist(17, 10, 30).toISOString()), false);
    assert.ok(starts.includes(ist(17, 10, 45).toISOString()));
    assert.equal(starts.includes(ist(17, 14, 0).toISOString()), false);
    assert.equal(result.timezone, PRACTICE_TIMEZONE);
    assert.equal(result.appointmentType.publicId, w.appointmentTypePublicId);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /patientUserId|patient_user_id/);
    assert.doesNotMatch(serialized, /"status":/);
    assert.doesNotMatch(serialized, /diagnos|symptom|clinical/i);
  });

  it("does not let CANCELLED or REJECTED appointments consume availability", async () => {
    const w = await world();
    await insertTestAppointment(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      patientUserId: w.patientUserId,
      appointmentTypeId: w.appointmentTypeId,
      status: "CANCELLED",
      startsAt: ist(17, 10, 0),
      endsAt: ist(17, 10, 30),
      bufferAfterMinutes: 10,
    });
    await insertTestAppointment(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      patientUserId: w.patientUserId,
      appointmentTypeId: w.appointmentTypeId,
      status: "REJECTED",
      startsAt: ist(17, 10, 15),
      endsAt: ist(17, 10, 45),
      bufferAfterMinutes: 10,
    });
    const result = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.ok(result.slots.some((slot) => slot.start === ist(17, 10, 0).toISOString()));
  });

  it("treats RESCHEDULE_REQUESTED as blocking", async () => {
    const w = await world();
    await insertTestAppointment(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      patientUserId: w.patientUserId,
      appointmentTypeId: w.appointmentTypeId,
      status: "RESCHEDULE_REQUESTED",
      startsAt: ist(17, 11, 0),
      endsAt: ist(17, 11, 30),
      bufferAfterMinutes: 10,
    });
    const available = await availabilityService.isSlotAvailable(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      startsAt: ist(17, 11, 0),
    });
    assert.equal(available.ok, true);
    if (available.ok) {
      assert.equal(available.available, false);
    }
  });

  it("validates a generated slot independently with isSlotAvailable", async () => {
    const w = await world();
    const listed = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(listed.ok, true);
    if (!listed.ok) {
      return;
    }
    const first = listed.slots[0];
    assert.ok(first);
    const check = await availabilityService.isSlotAvailable(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      startsAt: new Date(first.start),
    });
    assert.equal(check.ok, true);
    if (check.ok && check.available) {
      assert.equal(check.start, first.start);
      assert.equal(check.end, first.end);
    }
    const invented = await availabilityService.isSlotAvailable(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      startsAt: ist(17, 10, 7),
    });
    assert.equal(invented.ok, true);
    if (invented.ok) {
      assert.equal(invented.available, false);
    }
  });

  it("applies full-day closure and special opening from the database", async () => {
    const w = await world();
    await insertTestException(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      kind: "FULL_DAY_CLOSURE",
      localDate: "2026-08-17",
    });
    const closed = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(closed.ok, true);
    if (closed.ok) {
      assert.equal(closed.slots.length, 0);
    }

    await insertTestException(w.ctx, {
      psychologistUserId: w.psychologistUserId,
      kind: "CUSTOM_AVAILABILITY",
      localDate: "2026-08-16",
      opensLocal: "09:00:00",
      closesLocal: "10:00:00",
    });
    const sunday = await availabilityService.getPracticeAvailability(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-16",
    });
    assert.equal(sunday.ok, true);
    if (sunday.ok) {
      assert.equal(sunday.windows.length, 1);
      assert.equal(sunday.windows[0]?.start, ist(16, 9, 0).toISOString());
    }
  });

  it("reads duration and buffers from the appointment type row", async () => {
    const w = await world();
    const longType = await seedTestPracticeConfiguration(
      w.ctx.db,
      w.psychologistUserId,
      w.ctx.now(),
      {
        durationMinutes: 90,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        name: "Long test type",
      },
    );
    const result = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: longType.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.appointmentType.durationMinutes, 90);
    const first = result.slots[0];
    assert.ok(first);
    assert.equal(
      (new Date(first.end).getTime() - new Date(first.start).getTime()) / 60_000,
      90,
    );
  });

  it("applies configured minimum notice and maximum advance from settings", async () => {
    const w = await world();
    await updateTestBookingWindow(w.ctx, w.psychologistUserId, {
      minimumNoticeMinutes: 120,
      maximumAdvanceDays: 3,
    });
    const mondayTen = ist(17, 10, 0);
    w.advanceMs(mondayTen.getTime() - w.ctx.now().getTime());
    const monday = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: w.appointmentTypePublicId,
      dateLocal: "2026-08-17",
    });
    assert.equal(monday.ok, true);
    if (monday.ok) {
      assert.equal(
        monday.slots.some((slot) => slot.start === ist(17, 11, 0).toISOString()),
        false,
      );
      assert.ok(
        monday.slots.some((slot) => slot.start === ist(17, 12, 15).toISOString()),
      );
    }

    const original = await createAvailabilityTestWorld();
    worlds.push(original);
    await updateTestBookingWindow(original.ctx, original.psychologistUserId, {
      maximumAdvanceDays: 3,
    });
    const tooFar = await availabilityService.getAvailableSlots(original.ctx, {
      appointmentTypePublicId: original.appointmentTypePublicId,
      dateLocal: "2026-08-18",
    });
    assert.equal(tooFar.ok, true);
    if (tooFar.ok) {
      assert.equal(tooFar.slots.length, 0);
    }
  });

  it("does not leak SQL or internal ids when the type is unknown", async () => {
    const w = await world();
    const result = await availabilityService.getAvailableSlots(w.ctx, {
      appointmentTypePublicId: "ATY-22AAAAAA",
      dateLocal: "2026-08-17",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.doesNotMatch(result.message, /sql|postgres|uuid|stack/i);
    }
  });
});
