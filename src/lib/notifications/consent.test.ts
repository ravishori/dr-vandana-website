import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import {
  createBookingTestWorld,
  type BookingTestWorld,
} from "@/lib/appointments/test-support";
import { auditLogs, patientProfiles } from "@/lib/identity/schema";
import {
  isWhatsAppConsentActive,
  readPatientWhatsAppConsent,
  setPatientWhatsAppConsent,
} from "@/lib/notifications/consent";

describe("whatsapp appointment consent", () => {
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

  it("defaults new patients to opted out", async () => {
    const w = await world();
    const state = await readPatientWhatsAppConsent(w.ctx, w.patientA.userId);
    assert.equal(state.enabled, false);
    assert.equal(state.optedInAt, null);
    assert.equal(isWhatsAppConsentActive(state), false);
  });

  it("does not treat a verified mobile as WhatsApp consent", async () => {
    const w = await world();
    const [profile] = await w.ctx.db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, w.patientA.userId));
    assert.equal(profile.whatsappNotificationsEnabled, false);
  });

  it("records opt-in and opt-out with audit, without phone numbers", async () => {
    const w = await world();
    const optedIn = await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: true,
      source: "patient_account",
    });
    assert.equal(isWhatsAppConsentActive(optedIn), true);
    const optedOut = await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: false,
      source: "patient_account",
    });
    assert.equal(isWhatsAppConsentActive(optedOut), false);
    const audit = await w.ctx.db.select().from(auditLogs);
    const actions = audit.map((row) => row.action);
    assert.equal(actions.includes("PATIENT_WHATSAPP_OPT_IN"), true);
    assert.equal(actions.includes("PATIENT_WHATSAPP_OPT_OUT"), true);
    for (const row of audit.filter((item) =>
      item.action.startsWith("PATIENT_WHATSAPP_"),
    )) {
      assert.equal(row.actorUserId, w.patientA.userId);
      assert.doesNotMatch(JSON.stringify(row.metadata), /\+91|9876543210/);
    }
  });

  it("does not opt in a different patient when writing consent", async () => {
    const w = await world();
    await setPatientWhatsAppConsent(w.ctx, {
      userId: w.patientA.userId,
      optIn: true,
      source: "test",
    });
    const other = await readPatientWhatsAppConsent(w.ctx, w.patientB.userId);
    assert.equal(isWhatsAppConsentActive(other), false);
  });
});
