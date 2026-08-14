import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import { LIFECYCLE_SAFE_MESSAGES } from "@/lib/appointments/constants";
import { TEST_APPOINTMENT_DURATION_MINUTES, TEST_BUFFER_AFTER_MINUTES } from "@/lib/appointments/fixtures";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markAppointmentNoShow,
  rejectAppointment,
  rescheduleAppointment,
} from "@/lib/appointments/lifecycle";
import {
  getPracticeAppointmentDetail,
  listPracticeAppointments,
} from "@/lib/appointments/queries";
import { seedTestPracticeConfiguration } from "@/lib/appointments/seed";
import {
  appointmentHistory,
  appointmentNotificationOutbox,
  appointments,
  practiceAppointmentSettings,
} from "@/lib/appointments/schema";
import {
  createBookingTestWorld,
  insertTestAppointment,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { addMinutes, zonedCivilToUtc } from "@/lib/appointments/timezone";
import { generateUuid } from "@/lib/identity/crypto";
import { loadPrincipal } from "@/lib/identity/principal";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { auditLogs } from "@/lib/identity/schema";
import { createSession, readSession } from "@/lib/identity/sessions";

function ist(day: number, hour: number, minute = 0, month = 8, year = 2026) {
  return zonedCivilToUtc({ year, month, day, hour, minute, second: 0 });
}

const SLOT_1000 = ist(17, 10, 0);
const SLOT_1100 = ist(17, 11, 0);
const SLOT_1500 = ist(17, 15, 0);

describe("phase 2D appointment lifecycle", () => {
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

  async function book(
    w: BookingTestWorld,
    start = SLOT_1000,
    principal = w.patientA.principal,
  ) {
    const result = await requestAppointment(w.ctx, {
      principal,
      ipAddress: "203.0.113.50",
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

  async function otherPsychologist(w: BookingTestWorld) {
    const created = await provisionPrivilegedUser(w.ctx, {
      role: "PSYCHOLOGIST",
      email: "other-psy@example.test",
      password: "correct-horse-battery",
      displayName: "Other Psychologist",
    });
    assert.equal(created.ok, true);
    if (!created.ok) {
      throw new Error("other_psychologist_failed");
    }
    await seedTestPracticeConfiguration(w.ctx.db, created.userId, w.ctx.now());
    const session = await createSession(w.ctx, {
      userId: created.userId,
      roles: ["PSYCHOLOGIST"],
      ip: "203.0.113.10",
      mfaCompleted: true,
    });
    const loaded = await readSession(w.ctx, session.token);
    assert.ok(loaded);
    return loadPrincipal(w.ctx, loaded);
  }

  describe("confirmation", () => {
    it("confirms a pending appointment", async () => {
      const w = await world();
      const booked = await book(w);
      const emails = w.email.messages.length;
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        expectedVersion: 1,
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "CONFIRMED");
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.confirmed);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.status, "CONFIRMED");
      assert.equal(row.version, 2);
      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.some((item) => item.eventType === "CONFIRMED"), true);
      const outbox = await w.ctx.db
        .select()
        .from(appointmentNotificationOutbox)
        .where(eq(appointmentNotificationOutbox.appointmentId, row.id));
      assert.equal(outbox.some((item) => item.eventKey === "AppointmentConfirmed"), true);
      const audit = await w.ctx.db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "APPOINTMENT_CONFIRMED"));
      assert.equal(audit[0]?.result, "SUCCESS");
      assert.equal(w.email.messages.length, emails);
    });

    it("rejects a second confirmation", async () => {
      const w = await world();
      const booked = await book(w);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const again = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(again.ok, false);
      if (again.ok) {
        return;
      }
      assert.equal(again.code, "ALREADY_CONFIRMED");
      assert.equal(again.message, LIFECYCLE_SAFE_MESSAGES.alreadyConfirmed);
    });

    it("does not confirm a cancelled appointment", async () => {
      const w = await world();
      const booked = await book(w);
      await cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.noLongerAvailable);
    });

    it("does not confirm a rejected appointment", async () => {
      const w = await world();
      const booked = await book(w);
      await rejectAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.noLongerAvailable);
    });
  });

  describe("rejection and cancellation", () => {
    it("rejects a pending request and releases the slot", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await rejectAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        reasonNote: "Schedule overlap",
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "REJECTED");
      const second = await book(w, SLOT_1000, w.patientB.principal);
      assert.equal(second.publicId !== booked.publicId, true);
    });

    it("cancels pending and confirmed appointments", async () => {
      const w = await world();
      const pending = await book(w, SLOT_1000);
      const pendingCancel = await cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: pending.publicId,
      });
      assert.equal(pendingCancel.ok, true);
      const confirmed = await book(w, SLOT_1100);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: confirmed.publicId,
      });
      const confirmedCancel = await cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: confirmed.publicId,
        reasonCode: "SCHEDULING_CONFLICT",
      });
      assert.equal(confirmedCancel.ok, true);
      if (!confirmedCancel.ok) {
        return;
      }
      assert.equal(confirmedCancel.status, "CANCELLED");
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, confirmed.publicId));
      assert.equal(row.status, "CANCELLED");
      assert.equal(row.cancelReasonCode, "SCHEDULING_CONFLICT");
    });

    it("supports patient cancellation when notice policy allows it", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1500);
      const result = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, true);
    });

    it("enforces TEST FIXTURE cancellation notice for patients", async () => {
      const w = await world();
      await w.ctx.db
        .update(practiceAppointmentSettings)
        .set({
          cancellationMinimumNoticeMinutes: 24 * 60,
          updatedAt: w.ctx.now(),
        })
        .where(eq(practiceAppointmentSettings.psychologistUserId, w.psychologistUserId));
      const booked = await book(w, ist(14, 15, 0));
      const result = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "POLICY");
      const psychologistCancel = await cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(psychologistCancel.ok, true);
    });

    it("does not cancel a completed appointment", async () => {
      const w = await world();
      const booked = await book(w);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      await completeAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await cancelAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "INVALID_TRANSITION");
    });
  });

  describe("completion and no-show", () => {
    it("completes a confirmed appointment without clinical meaning", async () => {
      const w = await world();
      const booked = await book(w);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await completeAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "COMPLETED");
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.completed);
    });

    it("marks a confirmed appointment as no-show", async () => {
      const w = await world();
      const booked = await book(w);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await markAppointmentNoShow(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "NO_SHOW");
    });

    it("does not complete a pending appointment", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await completeAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, false);
    });
  });

  describe("rescheduling", () => {
    it("moves a confirmed appointment and releases the old slot", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1000);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await rescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "CONFIRMED");
      assert.equal(result.start, SLOT_1100.toISOString());
      assert.equal(
        result.end,
        addMinutes(SLOT_1100, TEST_APPOINTMENT_DURATION_MINUTES).toISOString(),
      );
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(
        row.occupiedEndsAt.toISOString(),
        addMinutes(
          SLOT_1100,
          TEST_APPOINTMENT_DURATION_MINUTES + TEST_BUFFER_AFTER_MINUTES,
        ).toISOString(),
      );
      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.some((item) => item.eventType === "CREATED"), true);
      assert.equal(history.some((item) => item.eventType === "CONFIRMED"), true);
      assert.equal(history.some((item) => item.eventType === "RESCHEDULED"), true);
      const reused = await book(w, SLOT_1000, w.patientB.principal);
      assert.ok(reused.publicId);
    });

    it("keeps the original appointment when the new slot is unavailable", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1000);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      await book(w, SLOT_1100, w.patientB.principal);
      const result = await rescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(result.ok, false);
      if (result.ok) {
        return;
      }
      assert.equal(result.code, "SLOT_UNAVAILABLE");
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.slotUnavailable);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
      assert.equal(row.status, "CONFIRMED");
      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.some((item) => item.eventType === "RESCHEDULED"), false);
    });
  });

  describe("authorization and IDOR", () => {
    it("denies patient lifecycle mutations except cancellation", async () => {
      const w = await world();
      const booked = await book(w);
      const confirm = await confirmAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(confirm.ok, false);
      const complete = await completeAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(complete.ok, false);
      const reject = await rejectAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(reject.ok, false);
    });

    it("denies another psychologist and Super Admin", async () => {
      const w = await world();
      const booked = await book(w);
      const other = await otherPsychologist(w);
      const stolen = await confirmAppointment(w.ctx, {
        principal: other,
        publicId: booked.publicId,
      });
      assert.equal(stolen.ok, false);
      if (!stolen.ok) {
        assert.equal(stolen.code, "FORBIDDEN");
      }
      const admin = await provisionPrivilegedUser(w.ctx, {
        role: "SUPER_ADMIN",
        email: "admin@example.test",
        password: "correct-horse-battery",
        displayName: "Admin",
      });
      assert.equal(admin.ok, true);
      if (!admin.ok) {
        return;
      }
      const session = await createSession(w.ctx, {
        userId: admin.userId,
        roles: ["SUPER_ADMIN"],
        mfaCompleted: true,
      });
      const loaded = await readSession(w.ctx, session.token);
      assert.ok(loaded);
      const adminPrincipal = await loadPrincipal(w.ctx, loaded);
      const adminConfirm = await confirmAppointment(w.ctx, {
        principal: adminPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(adminConfirm.ok, false);
      const detail = await getPracticeAppointmentDetail(
        w.ctx,
        adminPrincipal,
        booked.publicId,
      );
      assert.equal(detail.ok, false);
    });

    it("denies staff lifecycle operations", async () => {
      const w = await world();
      const booked = await book(w);
      const staff = await provisionPrivilegedUser(w.ctx, {
        role: "STAFF",
        email: "staff@example.test",
        password: "correct-horse-battery",
        displayName: "Staff",
      });
      assert.equal(staff.ok, true);
      if (!staff.ok) {
        return;
      }
      const session = await createSession(w.ctx, {
        userId: staff.userId,
        roles: ["STAFF"],
        mfaCompleted: true,
      });
      const loaded = await readSession(w.ctx, session.token);
      assert.ok(loaded);
      const staffPrincipal = await loadPrincipal(w.ctx, loaded);
      const confirm = await confirmAppointment(w.ctx, {
        principal: staffPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(confirm.ok, false);
      const list = await listPracticeAppointments(w.ctx, staffPrincipal, {
        filter: "pending",
      });
      assert.equal(list.ok, false);
    });

    it("does not expose unauthorized appointments through manipulated public ids", async () => {
      const w = await world();
      const booked = await book(w);
      const missing = await getPracticeAppointmentDetail(
        w.ctx,
        w.psychologistPrincipal,
        "APT-ZZZZZZZZ",
      );
      assert.equal(missing.ok, false);
      if (!missing.ok) {
        assert.equal(missing.code, "NOT_FOUND");
      }
      const invalid = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: "not-an-id",
      });
      assert.equal(invalid.ok, false);
      if (!invalid.ok) {
        assert.equal(invalid.code, "NOT_FOUND");
      }
      const other = await otherPsychologist(w);
      const stolenDetail = await getPracticeAppointmentDetail(
        w.ctx,
        other,
        booked.publicId,
      );
      assert.equal(stolenDetail.ok, false);
    });

    it("does not let a patient read the psychologist detail", async () => {
      const w = await world();
      const booked = await book(w);
      const detail = await getPracticeAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        booked.publicId,
      );
      assert.equal(detail.ok, false);
    });
  });

  describe("dashboard", () => {
    it("lists only the authenticated psychologist's appointments with filters", async () => {
      const w = await world();
      const pending = await book(w, SLOT_1000);
      const confirmed = await book(w, SLOT_1100, w.patientB.principal);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: confirmed.publicId,
      });
      const listed = await listPracticeAppointments(w.ctx, w.psychologistPrincipal, {
        filter: "pending",
      });
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        return;
      }
      assert.equal(listed.items.length, 1);
      assert.equal(listed.items[0]?.publicId, pending.publicId);
      assert.equal(listed.items[0]?.patient.displayName.length > 0, true);
      assert.equal("patientEmail" in listed.items[0], false);
      const upcoming = await listPracticeAppointments(w.ctx, w.psychologistPrincipal, {
        filter: "upcoming",
        pageSize: 1,
        page: 1,
      });
      assert.equal(upcoming.ok, true);
      if (!upcoming.ok) {
        return;
      }
      assert.equal(upcoming.items.length, 1);
      assert.equal(upcoming.total, 2);
    });

    it("filters today in Asia/Kolkata including month boundaries", async () => {
      const w = await world();
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: ist(1, 10, 0, 9),
        endsAt: ist(1, 10, 30, 9),
      });
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt: ist(1, 0, 0, 1, 2027),
        endsAt: ist(1, 0, 30, 1, 2027),
      });
      const september = await listPracticeAppointments(w.ctx, w.psychologistPrincipal, {
        filter: "range",
        fromLocal: "2026-09-01",
        toLocal: "2026-09-01",
      });
      assert.equal(september.ok, true);
      if (!september.ok) {
        return;
      }
      assert.equal(september.items.length, 1);
      const newYear = await listPracticeAppointments(w.ctx, w.psychologistPrincipal, {
        filter: "range",
        fromLocal: "2027-01-01",
        toLocal: "2027-01-01",
      });
      assert.equal(newYear.ok, true);
      if (!newYear.ok) {
        return;
      }
      assert.equal(newYear.items.length, 1);
    });
  });

  describe("transaction rollback", () => {
    it("rolls back confirm if history insert fails", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        hooks: {
          afterAppointmentUpdate: async () => {
            throw new Error("test_history_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.status, "PENDING");
    });

    it("rolls back confirm if outbox insert fails", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        hooks: {
          afterHistoryInsert: async () => {
            throw new Error("test_outbox_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.status, "PENDING");
      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.some((item) => item.eventType === "CONFIRMED"), false);
    });

    it("rolls back confirm if audit insert fails", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
        hooks: {
          afterOutboxInsert: async () => {
            throw new Error("test_audit_fail");
          },
        },
      });
      assert.equal(result.ok, false);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.status, "PENDING");
    });

    it("keeps history immutable", async () => {
      const w = await world();
      const booked = await book(w);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      await assert.rejects(async () => {
        await w.ctx.db
          .update(appointmentHistory)
          .set({ eventType: "CONFIRMED" })
          .where(eq(appointmentHistory.appointmentId, row.id));
      });
    });
  });
});
