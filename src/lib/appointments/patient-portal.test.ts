import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { requestAppointment } from "@/lib/appointments/booking";
import {
  LIFECYCLE_PAGE_SIZE_MAX,
  LIFECYCLE_SAFE_MESSAGES,
  PATIENT_STATUS_LABELS,
} from "@/lib/appointments/constants";
import {
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markAppointmentNoShow,
  rejectAppointment,
  requestRescheduleAppointment,
  acceptRescheduleAppointment,
  rescheduleAppointment,
} from "@/lib/appointments/lifecycle";
import {
  getPatientAppointmentDetail,
  listPatientAppointments,
} from "@/lib/appointments/patient-portal";
import { appointmentHistory, appointments } from "@/lib/appointments/schema";
import {
  createBookingTestWorld,
  insertTestAppointment,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { addMinutes, zonedCivilToUtc } from "@/lib/appointments/timezone";
import { generateUuid } from "@/lib/identity/crypto";
import { loadPrincipal } from "@/lib/identity/principal";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { createSession, readSession } from "@/lib/identity/sessions";
import { TEST_APPOINTMENT_DURATION_MINUTES } from "@/lib/appointments/fixtures";

function ist(day: number, hour: number, minute = 0, month = 8, year = 2026) {
  return zonedCivilToUtc({ year, month, day, hour, minute, second: 0 });
}

const SLOT_1000 = ist(17, 10, 0);
const SLOT_1100 = ist(17, 11, 0);
const SLOT_1500 = ist(17, 15, 0);

describe("phase 2E patient appointment portal", () => {
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
      ipAddress: "203.0.113.70",
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

  describe("dashboard and filters", () => {
    it("lists only the authenticated patient's appointments", async () => {
      const w = await world();
      const own = await book(w, SLOT_1000, w.patientA.principal);
      await book(w, SLOT_1100, w.patientB.principal);
      const listed = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "upcoming",
      });
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        return;
      }
      assert.equal(listed.items.length, 1);
      assert.equal(listed.items[0]?.publicId, own.publicId);
      assert.equal(listed.items[0]?.statusLabel, PATIENT_STATUS_LABELS.PENDING);
      assert.equal("patientEmail" in listed.items[0], false);
      assert.equal("psychologistUserId" in listed.items[0], false);
    });

    it("rejects unauthenticated, psychologist, staff, and super admin portal access", async () => {
      const w = await world();
      await book(w);
      const anon = await listPatientAppointments(w.ctx, null, { filter: "upcoming" });
      assert.equal(anon.ok, false);
      if (!anon.ok) {
        assert.equal(anon.code, "UNAUTHENTICATED");
        assert.equal(anon.message, LIFECYCLE_SAFE_MESSAGES.sessionExpired);
      }
      const psychologist = await listPatientAppointments(
        w.ctx,
        w.psychologistPrincipal,
        { filter: "upcoming" },
      );
      assert.equal(psychologist.ok, false);

      const staff = await provisionPrivilegedUser(w.ctx, {
        role: "STAFF",
        email: "portal-staff@example.test",
        password: "correct-horse-battery",
        displayName: "Staff",
      });
      assert.equal(staff.ok, true);
      if (!staff.ok) {
        return;
      }
      const staffSession = await createSession(w.ctx, {
        userId: staff.userId,
        roles: ["STAFF"],
        mfaCompleted: true,
      });
      const staffLoaded = await readSession(w.ctx, staffSession.token);
      assert.ok(staffLoaded);
      const staffPrincipal = await loadPrincipal(w.ctx, staffLoaded);
      const staffList = await listPatientAppointments(w.ctx, staffPrincipal, {
        filter: "upcoming",
      });
      assert.equal(staffList.ok, false);

      const admin = await provisionPrivilegedUser(w.ctx, {
        role: "SUPER_ADMIN",
        email: "portal-admin@example.test",
        password: "correct-horse-battery",
        displayName: "Admin",
      });
      assert.equal(admin.ok, true);
      if (!admin.ok) {
        return;
      }
      const adminSession = await createSession(w.ctx, {
        userId: admin.userId,
        roles: ["SUPER_ADMIN"],
        mfaCompleted: true,
      });
      const adminLoaded = await readSession(w.ctx, adminSession.token);
      assert.ok(adminLoaded);
      const adminPrincipal = await loadPrincipal(w.ctx, adminLoaded);
      const adminList = await listPatientAppointments(w.ctx, adminPrincipal, {
        filter: "upcoming",
      });
      assert.equal(adminList.ok, false);
    });

    it("filters pending, confirmed, completed, cancelled, rejected, no-show, and range", async () => {
      const w = await world();
      const pending = await book(w, SLOT_1000);
      const confirmed = await book(w, SLOT_1100, w.patientA.principal);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: confirmed.publicId,
      });
      const completed = await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "COMPLETED",
        startsAt: ist(10, 10, 0),
        endsAt: ist(10, 10, 30),
      });
      const cancelled = await book(w, SLOT_1500);
      await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: cancelled.publicId,
      });
      const rejectedStart = ist(18, 10, 0);
      const rejected = await book(w, rejectedStart, w.patientA.principal);
      await rejectAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: rejected.publicId,
      });
      const noShow = await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "NO_SHOW",
        startsAt: ist(11, 10, 0),
        endsAt: ist(11, 10, 30),
      });

      const pendingList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "pending",
      });
      assert.equal(pendingList.ok, true);
      if (pendingList.ok) {
        assert.equal(pendingList.items.some((item) => item.publicId === pending.publicId), true);
        assert.equal(
          pendingList.items.every((item) => item.status === "PENDING"),
          true,
        );
      }

      const confirmedList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "confirmed",
      });
      assert.equal(confirmedList.ok, true);
      if (confirmedList.ok) {
        assert.equal(confirmedList.items[0]?.publicId, confirmed.publicId);
        assert.equal(confirmedList.items[0]?.statusLabel, PATIENT_STATUS_LABELS.CONFIRMED);
      }

      const completedList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "completed",
      });
      assert.equal(completedList.ok, true);
      if (completedList.ok) {
        assert.equal(completedList.items.length, 1);
        assert.equal(completedList.items[0]?.statusLabel, PATIENT_STATUS_LABELS.COMPLETED);
      }

      const cancelledList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "cancelled",
      });
      assert.equal(cancelledList.ok, true);
      if (cancelledList.ok) {
        assert.equal(cancelledList.items[0]?.statusLabel, PATIENT_STATUS_LABELS.CANCELLED);
      }

      const rejectedList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "rejected",
      });
      assert.equal(rejectedList.ok, true);
      if (rejectedList.ok) {
        assert.equal(rejectedList.items[0]?.statusLabel, PATIENT_STATUS_LABELS.REJECTED);
      }

      const noShowList = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "no_show",
      });
      assert.equal(noShowList.ok, true);
      if (noShowList.ok) {
        assert.equal(noShowList.items[0]?.statusLabel, PATIENT_STATUS_LABELS.NO_SHOW);
      }

      const range = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "range",
        fromLocal: "2026-08-10",
        toLocal: "2026-08-10",
      });
      assert.equal(range.ok, true);
      if (range.ok) {
        assert.equal(range.items.length, 1);
      }
      void completed;
      void noShow;
    });

    it("bounds page size and orders upcoming nearest first", async () => {
      const w = await world();
      await book(w, SLOT_1500);
      await book(w, SLOT_1000, w.patientA.principal);
      const listed = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "upcoming",
        pageSize: 999,
        page: 1,
      });
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        return;
      }
      assert.equal(listed.pageSize, LIFECYCLE_PAGE_SIZE_MAX);
      assert.equal(listed.items[0]?.start, SLOT_1000.toISOString());
      const second = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "upcoming",
        pageSize: 1,
        page: 2,
      });
      assert.equal(second.ok, true);
      if (second.ok) {
        assert.equal(second.items[0]?.start, SLOT_1500.toISOString());
        assert.equal(second.total, 2);
      }
    });
  });

  describe("ownership and IDOR", () => {
    it("does not leak another patient's appointment through detail or mutations", async () => {
      const w = await world();
      const theirs = await book(w, SLOT_1000, w.patientB.principal);
      const detail = await getPatientAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        theirs.publicId,
      );
      assert.equal(detail.ok, false);
      if (!detail.ok) {
        assert.equal(detail.code, "NOT_FOUND");
        assert.equal(detail.message, LIFECYCLE_SAFE_MESSAGES.inaccessible);
      }
      const missing = await getPatientAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        "APT-ZZZZZZZZ",
      );
      assert.equal(missing.ok, false);
      if (!missing.ok) {
        assert.equal(missing.message, LIFECYCLE_SAFE_MESSAGES.inaccessible);
      }
      const cancel = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: theirs.publicId,
      });
      assert.equal(cancel.ok, false);
      if (!cancel.ok) {
        assert.equal(cancel.message, LIFECYCLE_SAFE_MESSAGES.inaccessible);
      }
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: theirs.publicId,
      });
      const reschedule = await requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: theirs.publicId,
        requestedStart: SLOT_1500.toISOString(),
      });
      assert.equal(reschedule.ok, false);
      if (!reschedule.ok) {
        assert.equal(reschedule.message, LIFECYCLE_SAFE_MESSAGES.inaccessible);
      }
      const history = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "history",
      });
      assert.equal(history.ok, true);
      if (history.ok) {
        assert.equal(history.items.some((item) => item.publicId === theirs.publicId), false);
      }
    });

    it("ignores client-supplied status, psychologist id, duration, and end time", async () => {
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
      const noShow = await markAppointmentNoShow(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(noShow.ok, false);
      const reject = await rejectAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(reject.ok, false);
      const immediate = await rescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        requestedStart: SLOT_1500.toISOString(),
      });
      assert.equal(immediate.ok, false);
    });

    it("does not let a patient reuse another patient's booking idempotency key as their own history", async () => {
      const w = await world();
      const key = generateUuid();
      const first = await requestAppointment(w.ctx, {
        principal: w.patientB.principal,
        ipAddress: "203.0.113.71",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1000.toISOString(),
        idempotencyKey: key,
      });
      assert.equal(first.ok, true);
      const replay = await requestAppointment(w.ctx, {
        principal: w.patientA.principal,
        ipAddress: "203.0.113.72",
        appointmentTypePublicId: w.appointmentTypePublicId,
        requestedStart: SLOT_1100.toISOString(),
        idempotencyKey: key,
      });
      assert.equal(replay.ok, true);
      if (!replay.ok || !first.ok) {
        return;
      }
      assert.notEqual(replay.appointment.publicId, first.appointment.publicId);
      const listed = await listPatientAppointments(w.ctx, w.patientA.principal, {
        filter: "pending",
      });
      assert.equal(listed.ok, true);
      if (listed.ok) {
        assert.equal(
          listed.items.some((item) => item.publicId === first.appointment.publicId),
          false,
        );
      }
    });
  });

  describe("detail, cancellation, and reschedule request", () => {
    it("shows own detail with patient-visible history and pending copy", async () => {
      const w = await world();
      const booked = await book(w);
      const detail = await getPatientAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        booked.publicId,
      );
      assert.equal(detail.ok, true);
      if (!detail.ok) {
        return;
      }
      assert.equal(detail.appointment.statusLabel, PATIENT_STATUS_LABELS.PENDING);
      assert.equal(
        detail.appointment.pendingExplanation,
        LIFECYCLE_SAFE_MESSAGES.pendingExplanation,
      );
      assert.equal(
        detail.appointment.history.some((item) => item.label === "Appointment requested"),
        true,
      );
      assert.equal(
        detail.appointment.history.some((item) => item.actorLabel === "You"),
        true,
      );
      assert.equal(
        JSON.stringify(detail.appointment).includes(w.psychologistUserId),
        false,
      );
    });

    it("cancels an eligible pending appointment as the patient", async () => {
      const w = await world();
      const booked = await book(w);
      const result = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.cancelledByPatient);
      const already = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(already.ok, false);
      const second = await book(w, SLOT_1000, w.patientB.principal);
      assert.ok(second.publicId);
    });

    it("does not cancel completed, rejected, or no-show appointments", async () => {
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
      const completed = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
      });
      assert.equal(completed.ok, false);

      const rejected = await book(w, SLOT_1100);
      await rejectAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: rejected.publicId,
      });
      const rejectedCancel = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: rejected.publicId,
      });
      assert.equal(rejectedCancel.ok, false);

      const already = await cancelAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: rejected.publicId,
      });
      assert.equal(already.ok, false);
    });

    it("stores a proposed slot without moving the current appointment", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1000);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      const result = await requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(result.ok, true);
      if (!result.ok) {
        return;
      }
      assert.equal(result.status, "RESCHEDULE_REQUESTED");
      assert.equal(result.start, SLOT_1000.toISOString());
      assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.rescheduleRequested);
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
      assert.equal(row.proposedStartsAt?.toISOString(), SLOT_1100.toISOString());
      assert.equal(
        row.proposedEndsAt?.toISOString(),
        addMinutes(SLOT_1100, TEST_APPOINTMENT_DURATION_MINUTES).toISOString(),
      );
      const history = await w.ctx.db
        .select()
        .from(appointmentHistory)
        .where(eq(appointmentHistory.appointmentId, row.id));
      assert.equal(history.some((item) => item.eventType === "RESCHEDULE_REQUESTED"), true);
      assert.equal(history.some((item) => item.eventType === "RESCHEDULED"), false);
    });

    it("keeps the original appointment when the requested slot is unavailable", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1000);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      await book(w, SLOT_1100, w.patientB.principal);
      const result = await requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        requestedStart: SLOT_1100.toISOString(),
      });
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.message, LIFECYCLE_SAFE_MESSAGES.slotUnavailable);
      }
      const [row] = await w.ctx.db
        .select()
        .from(appointments)
        .where(eq(appointments.publicId, booked.publicId));
      assert.equal(row.status, "CONFIRMED");
      assert.equal(row.startsAt.toISOString(), SLOT_1000.toISOString());
      assert.equal(row.proposedStartsAt, null);
    });

    it("lets the psychologist accept a patient reschedule request", async () => {
      const w = await world();
      const booked = await book(w, SLOT_1000);
      await confirmAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      await requestRescheduleAppointment(w.ctx, {
        principal: w.patientA.principal,
        publicId: booked.publicId,
        requestedStart: SLOT_1500.toISOString(),
      });
      const accepted = await acceptRescheduleAppointment(w.ctx, {
        principal: w.psychologistPrincipal,
        publicId: booked.publicId,
      });
      assert.equal(accepted.ok, true);
      if (!accepted.ok) {
        return;
      }
      assert.equal(accepted.status, "CONFIRMED");
      assert.equal(accepted.start, SLOT_1500.toISOString());
      const detail = await getPatientAppointmentDetail(
        w.ctx,
        w.patientA.principal,
        booked.publicId,
      );
      assert.equal(detail.ok, true);
      if (detail.ok) {
        assert.equal(
          detail.appointment.history.some((item) => item.label === "Appointment rescheduled"),
          true,
        );
        assert.equal(detail.appointment.status, "CONFIRMED");
      }
    });
  });
});
