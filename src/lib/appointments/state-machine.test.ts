import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appointmentStateMachine } from "@/lib/appointments/state-machine";
import { AppointmentDomainError } from "@/lib/appointments/errors";

describe("appointment state machine", () => {
  it("allows psychologist confirm from pending and not from confirmed", () => {
    const rule = appointmentStateMachine.resolve("PENDING", "CONFIRM", "PSYCHOLOGIST");
    assert.equal(rule.to, "CONFIRMED");
    assert.equal(rule.historyEvent, "CONFIRMED");
    assert.throws(
      () => appointmentStateMachine.resolve("CONFIRMED", "CONFIRM", "PSYCHOLOGIST"),
      AppointmentDomainError,
    );
  });

  it("records RESCHEDULED as a history event and returns current status CONFIRMED", () => {
    const accepted = appointmentStateMachine.resolve(
      "RESCHEDULE_REQUESTED",
      "ACCEPT_RESCHEDULE",
      "PSYCHOLOGIST",
    );
    assert.equal(accepted.to, "CONFIRMED");
    assert.equal(accepted.historyEvent, "RESCHEDULED");
    const direct = appointmentStateMachine.resolve(
      "CONFIRMED",
      "RESCHEDULE",
      "PSYCHOLOGIST",
    );
    assert.equal(direct.to, "CONFIRMED");
    assert.equal(direct.historyEvent, "RESCHEDULED");
  });

  it("does not allow patient confirm, complete, or no-show", () => {
    for (const action of ["CONFIRM", "COMPLETE", "NO_SHOW", "REJECT"] as const) {
      assert.throws(
        () => appointmentStateMachine.resolve("PENDING", action, "PATIENT"),
        AppointmentDomainError,
      );
    }
  });

  it("does not allow Super Admin or staff transitions", () => {
    assert.throws(
      () => appointmentStateMachine.resolve("PENDING", "CONFIRM", "SUPER_ADMIN"),
      AppointmentDomainError,
    );
    assert.throws(
      () => appointmentStateMachine.resolve("PENDING", "CANCEL", "STAFF"),
      AppointmentDomainError,
    );
  });

  it("treats pending, confirmed, and reschedule-requested as blocking", () => {
    assert.equal(appointmentStateMachine.isBlocking("PENDING"), true);
    assert.equal(appointmentStateMachine.isBlocking("CONFIRMED"), true);
    assert.equal(appointmentStateMachine.isBlocking("RESCHEDULE_REQUESTED"), true);
    assert.equal(appointmentStateMachine.isBlocking("CANCELLED"), false);
    assert.equal(appointmentStateMachine.isBlocking("REJECTED"), false);
    assert.equal(appointmentStateMachine.isBlocking("COMPLETED"), false);
    assert.equal(appointmentStateMachine.isBlocking("NO_SHOW"), false);
  });
});
