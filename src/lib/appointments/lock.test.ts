import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { lockPsychologistCalendar } from "@/lib/appointments/lock";
import {
  safeBookingFailure,
  safeLifecycleFailure,
} from "@/lib/appointments/errors";
import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import { generateUuid } from "@/lib/identity/crypto";

describe("appointment calendar lock", () => {
  it("fails closed when the advisory lock cannot be taken", async () => {
    const db = {
      execute: async () => {
        throw new Error("lock_backend_unavailable");
      },
    } as unknown as AppointmentQueryDb;
    await assert.rejects(
      () => lockPsychologistCalendar(db, generateUuid()),
      /CALENDAR_LOCK_UNAVAILABLE/,
    );
  });

  it("maps lock and deadlock failures to a safe slot-unavailable result", () => {
    const lockFailure = safeBookingFailure(new Error("CALENDAR_LOCK_UNAVAILABLE"));
    assert.equal(lockFailure.code, "SLOT_UNAVAILABLE");
    const deadlock = Object.assign(new Error("deadlock"), { code: "40P01" });
    assert.equal(safeLifecycleFailure(deadlock).code, "SLOT_UNAVAILABLE");
    assert.equal(safeBookingFailure(deadlock).code, "SLOT_UNAVAILABLE");
  });
});
