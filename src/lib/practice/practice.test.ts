import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addMinutes } from "@/lib/appointments/timezone";
import {
  createBookingTestWorld,
  insertTestAppointment,
} from "@/lib/appointments/test-support";
import { getPracticeDashboardSummary } from "@/lib/practice/dashboard";
import {
  getPracticePatientDetail,
  listPracticePatients,
  updatePracticePatientProfile,
} from "@/lib/practice/patients";
import {
  getPracticeSettings,
  savePracticeSettings,
} from "@/lib/practice/settings";

describe("practice management (non-clinical)", () => {
  it("lists only patients with appointments for the psychologist and denies outsiders", async () => {
    const w = await createBookingTestWorld();
    try {
      const startsAt = addMinutes(w.ctx.now(), 24 * 60);
      await insertTestAppointment(w.ctx, {
        psychologistUserId: w.psychologistUserId,
        patientUserId: w.patientA.userId,
        appointmentTypeId: w.appointmentTypeId,
        status: "CONFIRMED",
        startsAt,
        endsAt: addMinutes(startsAt, 50),
      });

      const listed = await listPracticePatients(
        w.ctx,
        w.psychologistPrincipal,
        {},
      );
      assert.equal(listed.ok, true);
      if (!listed.ok) {
        return;
      }
      assert.equal(listed.total, 1);
      assert.ok(listed.items[0]?.publicId.startsWith("PAT-"));

      const denied = await listPracticePatients(w.ctx, null, {});
      assert.equal(denied.ok, false);

      const patientDenied = await listPracticePatients(
        w.ctx,
        w.patientA.principal,
        {},
      );
      assert.equal(patientDenied.ok, false);

      const detail = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        listed.items[0]!.publicId,
      );
      assert.equal(detail.ok, true);
      if (detail.ok) {
        assert.equal(detail.patient.appointmentCount, 1);
      }

      const missing = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        "PAT-23456789",
      );
      assert.equal(missing.ok, false);

      const summary = await getPracticeDashboardSummary(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(summary.ok, true);
      if (summary.ok) {
        assert.equal(summary.summary.patients, 1);
        assert.equal(typeof summary.summary.completed, "number");
      }

      const updated = await updatePracticePatientProfile(
        w.ctx,
        w.psychologistPrincipal,
        {
          patientPublicId: listed.items[0]!.publicId,
          displayName: "Updated Patient Name",
          status: "SUSPENDED",
        },
      );
      assert.equal(updated.ok, true);
      const after = await getPracticePatientDetail(
        w.ctx,
        w.psychologistPrincipal,
        listed.items[0]!.publicId,
      );
      assert.equal(after.ok, true);
      if (after.ok) {
        assert.equal(after.patient.displayName, "Updated Patient Name");
        assert.equal(after.patient.status, "SUSPENDED");
      }
    } finally {
      await w.close();
    }
  });

  it("loads and saves practice settings for the psychologist", async () => {
    const w = await createBookingTestWorld();
    try {
      const before = await getPracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(before.ok, true);
      if (!before.ok) {
        return;
      }
      assert.ok(before.settings.appointmentTypes.length >= 1);

      const form = new FormData();
      form.set("slotGranularityMinutes", "30");
      form.set("minimumNoticeMinutes", "60");
      form.set("maximumAdvanceDays", "30");
      form.set("cancellationMinimumNoticeMinutes", "120");
      for (let day = 1; day <= 7; day += 1) {
        if (day <= 5) {
          form.set(`hourActive_${day}`, "on");
        }
        form.set(`opens_${day}`, "10:00");
        form.set(`closes_${day}`, "16:00");
      }
      const saved = await savePracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
        form,
      );
      assert.equal(saved.ok, true);

      const after = await getPracticeSettings(
        w.ctx,
        w.psychologistPrincipal,
      );
      assert.equal(after.ok, true);
      if (after.ok) {
        assert.equal(after.settings.minimumNoticeMinutes, 60);
        assert.equal(
          after.settings.hours.find((h) => h.dayOfWeek === 1)?.opensLocal,
          "10:00",
        );
      }
    } finally {
      await w.close();
    }
  });
});
