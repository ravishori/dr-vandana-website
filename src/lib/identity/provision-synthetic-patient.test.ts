import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eq } from "drizzle-orm";

import {
  assertSyntheticPatientProvisionAllowed,
  provisionSyntheticStagingPatient,
  SYNTHETIC_STAGING_PATIENT,
} from "@/lib/identity/provision-synthetic-patient";
import { roles, userRoles, users, patientProfiles } from "@/lib/identity/schema";
import { createIdentityTestWorld } from "@/lib/identity/test-harness";

const FAKE_USER = "USER";
const FAKE_PASSWORD = "PASSWORD";
const STRONG_PASSWORD = "correct-horse-battery-staging";

function stagingUrl(): string {
  return `postgresql://${FAKE_USER}:${FAKE_PASSWORD}@pg-dr-vandana-staging.postgres.database.azure.com:5432/dr_vandana_db_staging`;
}

function productionUrl(): string {
  return `postgresql://${FAKE_USER}:${FAKE_PASSWORD}@pg-dr-vandana-prod.postgres.database.azure.com:5432/dr_vandana_db`;
}

describe("synthetic staging patient provision guards", () => {
  it("refuses NODE_ENV=production", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "production",
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: true,
      databaseUrlForGuard: stagingUrl(),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /production/i);
    }
  });

  it("refuses when public registration is enabled", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "development",
      registrationEnabled: true,
      syntheticPatientProvisionEnabled: true,
      databaseUrlForGuard: stagingUrl(),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /REGISTRATION/i);
    }
  });

  it("refuses when opt-in flag is missing", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "development",
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: false,
      databaseUrlForGuard: stagingUrl(),
    });
    assert.equal(result.ok, false);
  });

  it("refuses production database target", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "development",
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: true,
      databaseUrlForGuard: productionUrl(),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /production|Refusing/i);
    }
  });

  it("refuses unknown database target", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "development",
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: true,
      databaseUrlForGuard: `postgresql://${FAKE_USER}:${FAKE_PASSWORD}@localhost:5432/anything`,
    });
    assert.equal(result.ok, false);
  });

  it("accepts explicit staging target with flags correct", () => {
    const result = assertSyntheticPatientProvisionAllowed({
      nodeEnv: "development",
      registrationEnabled: false,
      syntheticPatientProvisionEnabled: true,
      databaseUrlForGuard: stagingUrl(),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.match(result.hostname, /pg-dr-vandana-staging/);
      assert.equal(result.database, "dr_vandana_db_staging");
    }
  });
});

describe("provisionSyntheticStagingPatient", () => {
  it("creates ACTIVE PATIENT with profile and refuses duplicate create", async () => {
    const world = await createIdentityTestWorld({
      registrationEnabled: false,
      identityProvisionEnabled: false,
      nodeEnv: "development",
    });
    try {
      const first = await provisionSyntheticStagingPatient(world.ctx, {
        password: STRONG_PASSWORD,
        databaseUrlForGuard: stagingUrl(),
        registrationEnabled: false,
        syntheticPatientProvisionEnabled: true,
        nodeEnv: "development",
      });
      assert.equal(first.ok, true);
      if (!first.ok) {
        return;
      }
      assert.equal(first.created, true);
      assert.equal(first.role, "PATIENT");
      assert.equal(first.displayName, SYNTHETIC_STAGING_PATIENT.displayName);
      assert.match(first.publicId, /^PAT-/);

      const [user] = await world.ctx.db
        .select({
          status: users.status,
          emailVerifiedAt: users.emailVerifiedAt,
          mobileVerifiedAt: users.mobileVerifiedAt,
        })
        .from(users)
        .where(eq(users.id, first.userId))
        .limit(1);
      assert.equal(user?.status, "ACTIVE");
      assert.ok(user?.emailVerifiedAt);
      assert.ok(user?.mobileVerifiedAt);

      const roleRows = await world.ctx.db
        .select({ name: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, first.userId));
      assert.deepEqual(
        roleRows.map((r) => r.name),
        ["PATIENT"],
      );

      const [profile] = await world.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          dateOfBirth: patientProfiles.dateOfBirth,
          gender: patientProfiles.gender,
          emergencyContact: patientProfiles.emergencyContact,
        })
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, first.userId))
        .limit(1);
      assert.equal(profile?.displayName, SYNTHETIC_STAGING_PATIENT.displayName);
      assert.equal(profile?.dateOfBirth, null);
      assert.equal(profile?.gender, null);
      assert.equal(profile?.emergencyContact, null);

      assert.equal(world.email.messages.length, 0);

      const second = await provisionSyntheticStagingPatient(world.ctx, {
        password: STRONG_PASSWORD,
        databaseUrlForGuard: stagingUrl(),
        registrationEnabled: false,
        syntheticPatientProvisionEnabled: true,
        nodeEnv: "development",
      });
      assert.equal(second.ok, true);
      if (!second.ok) {
        return;
      }
      assert.equal(second.created, false);
      assert.equal(second.publicId, first.publicId);
      assert.equal(second.userId, first.userId);

      const count = await world.ctx.db
        .select({ id: patientProfiles.id })
        .from(patientProfiles)
        .where(eq(patientProfiles.displayName, SYNTHETIC_STAGING_PATIENT.displayName));
      assert.equal(count.length, 1);
    } finally {
      await world.close();
    }
  });

  it("does not send mail and refuses production target even with flag", async () => {
    const world = await createIdentityTestWorld({
      registrationEnabled: false,
      nodeEnv: "development",
    });
    try {
      const result = await provisionSyntheticStagingPatient(world.ctx, {
        password: STRONG_PASSWORD,
        databaseUrlForGuard: productionUrl(),
        registrationEnabled: false,
        syntheticPatientProvisionEnabled: true,
        nodeEnv: "development",
      });
      assert.equal(result.ok, false);
      assert.equal(world.email.messages.length, 0);
    } finally {
      await world.close();
    }
  });
});
