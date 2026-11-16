import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateClinicalAccess } from "@/lib/clinical-access/policy";
import type {
  ClinicalAccessFacts,
  ClinicalAccessRequest,
  ClinicalPrincipal,
} from "@/lib/clinical-access/types";
import type { PermissionName, RoleName } from "@/lib/identity/constants";

const PATIENT_A = "11111111-1111-4111-8111-111111111111";
const PATIENT_B = "22222222-2222-4222-8222-222222222222";

function principal(
  role: RoleName,
  overrides: Partial<ClinicalPrincipal> = {},
): ClinicalPrincipal {
  const doctorPerms: PermissionName[] = [
    "VIEW_CLINICAL_RECORDS",
    "MANAGE_CLINICAL_NOTES",
    "MANAGE_CLINICAL_DOCUMENTS",
  ];
  return {
    userId: `user-${role.toLowerCase()}-0001`,
    roles: [role],
    permissions: role === "PSYCHOLOGIST" ? doctorPerms : [],
    patientProfileId: role === "PATIENT" ? PATIENT_A : null,
    mfaCompleted: true,
    ...overrides,
  };
}

const facts = (over: Partial<ClinicalAccessFacts> = {}): ClinicalAccessFacts => ({
  stepUpSatisfied: false,
  careRelationshipActive: true,
  ...over,
});

const req = (over: Partial<ClinicalAccessRequest> = {}): ClinicalAccessRequest => ({
  category: "A",
  action: "read",
  patientProfileId: PATIENT_A,
  resourceKind: "session_note",
  resourceId: "note-00000001",
  ...over,
});

describe("clinical access policy: deny by default", () => {
  it("denies unauthenticated access to categories A, B and C", () => {
    for (const category of ["A", "B", "C"] as const) {
      const d = evaluateClinicalAccess(null, req({ category }), facts());
      assert.deepEqual(d, { allowed: false, reason: "unauthenticated" });
    }
  });

  it("allows public Category D reads only", () => {
    const read = evaluateClinicalAccess(
      null,
      req({ category: "D", action: "read", patientProfileId: null }),
      facts(),
    );
    assert.equal(read.allowed, true);
    const write = evaluateClinicalAccess(
      null,
      req({ category: "D", action: "write", patientProfileId: null }),
      facts(),
    );
    assert.equal(write.allowed, false);
  });

  it("rejects malformed requests", () => {
    const d = evaluateClinicalAccess(
      principal("PSYCHOLOGIST"),
      req({ resourceId: "" }),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "invalid_request" });
    const noPatient = evaluateClinicalAccess(
      principal("PSYCHOLOGIST"),
      req({ patientProfileId: null }),
      facts(),
    );
    assert.deepEqual(noPatient, { allowed: false, reason: "invalid_request" });
  });
});

describe("mandatory MFA", () => {
  it("denies a psychologist whose session has not completed MFA", () => {
    const d = evaluateClinicalAccess(
      principal("PSYCHOLOGIST", { mfaCompleted: false }),
      req(),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "mfa_required" });
  });

  it("denies a super admin without MFA even for audit reads", () => {
    const d = evaluateClinicalAccess(
      principal("SUPER_ADMIN", {
        mfaCompleted: false,
        permissions: ["VIEW_AUDIT_LOGS"],
      }),
      req({ category: "C", patientProfileId: null, resourceKind: "audit_log" }),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "mfa_required" });
  });
});

describe("psychologist access to clinical content (Category A)", () => {
  it("reads with permission and an active care relationship", () => {
    assert.equal(
      evaluateClinicalAccess(principal("PSYCHOLOGIST"), req(), facts()).allowed,
      true,
    );
  });

  it("denies without a care relationship", () => {
    const d = evaluateClinicalAccess(
      principal("PSYCHOLOGIST"),
      req(),
      facts({ careRelationshipActive: false }),
    );
    assert.deepEqual(d, { allowed: false, reason: "no_care_relationship" });
  });

  it("denies without the specific permission", () => {
    const d = evaluateClinicalAccess(
      principal("PSYCHOLOGIST", { permissions: ["VIEW_CLINICAL_RECORDS"] }),
      req({ action: "write" }),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "forbidden_permission" });
  });

  it("requires the private-notes permission for restricted items", () => {
    const d = evaluateClinicalAccess(
      principal("PSYCHOLOGIST"),
      req({ restricted: true }),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "forbidden_permission" });
    const ok = evaluateClinicalAccess(
      principal("PSYCHOLOGIST", {
        permissions: [
          "VIEW_CLINICAL_RECORDS",
          "VIEW_PRIVATE_CLINICAL_NOTES",
        ],
      }),
      req({ restricted: true }),
      facts(),
    );
    assert.equal(ok.allowed, true);
  });

  it("requires step-up for sign, export and release", () => {
    for (const action of ["sign", "export", "release"] as const) {
      const d = evaluateClinicalAccess(
        principal("PSYCHOLOGIST"),
        req({ action }),
        facts({ stepUpSatisfied: false }),
      );
      assert.deepEqual(d, { allowed: false, reason: "step_up_required" }, action);
      assert.equal(
        evaluateClinicalAccess(
          principal("PSYCHOLOGIST"),
          req({ action }),
          facts({ stepUpSatisfied: true }),
        ).allowed,
        true,
        action,
      );
    }
  });
});

describe("patient access", () => {
  it("cannot read another patient's records (IDOR)", () => {
    const d = evaluateClinicalAccess(
      principal("PATIENT"),
      req({ patientProfileId: PATIENT_B, releasedToPatient: true }),
      facts(),
    );
    assert.deepEqual(d, { allowed: false, reason: "not_owner" });
    const b = evaluateClinicalAccess(
      principal("PATIENT"),
      req({ category: "B", patientProfileId: PATIENT_B }),
      facts(),
    );
    assert.deepEqual(b, { allowed: false, reason: "not_owner" });
  });

  it("reads own Category A items only when released by the doctor", () => {
    assert.deepEqual(
      evaluateClinicalAccess(principal("PATIENT"), req(), facts()),
      { allowed: false, reason: "not_released" },
    );
    assert.equal(
      evaluateClinicalAccess(
        principal("PATIENT"),
        req({ releasedToPatient: true }),
        facts(),
      ).allowed,
      true,
    );
  });

  it("never reads restricted items, even if flagged released", () => {
    const d = evaluateClinicalAccess(
      principal("PATIENT"),
      req({ restricted: true, releasedToPatient: true }),
      facts(),
    );
    assert.equal(d.allowed, false);
  });

  it("may submit own intake but not write, sign, export or release clinical records", () => {
    assert.equal(
      evaluateClinicalAccess(principal("PATIENT"), req({ action: "submit" }), facts())
        .allowed,
      true,
    );
    for (const action of ["write", "sign", "export", "release"] as const) {
      assert.equal(
        evaluateClinicalAccess(principal("PATIENT"), req({ action }), facts())
          .allowed,
        false,
        action,
      );
    }
  });

  it("cannot see the doctor's care-relationship fact as a bypass", () => {
    const d = evaluateClinicalAccess(
      principal("PATIENT"),
      req({ patientProfileId: PATIENT_B }),
      facts({ careRelationshipActive: true, stepUpSatisfied: true }),
    );
    assert.equal(d.allowed, false);
  });
});

describe("roles with no clinical-content access", () => {
  it("denies STAFF and SUPER_ADMIN on categories A and B", () => {
    for (const role of ["STAFF", "SUPER_ADMIN"] as const) {
      for (const category of ["A", "B"] as const) {
        const d = evaluateClinicalAccess(
          principal(role, {
            permissions: [
              "VIEW_CLINICAL_RECORDS",
              "MANAGE_CLINICAL_NOTES",
              "VIEW_AUDIT_LOGS",
              "MANAGE_USERS",
            ],
          }),
          req({ category }),
          facts({ stepUpSatisfied: true }),
        );
        assert.equal(d.allowed, false, `${role}/${category}`);
      }
    }
  });

  it("lets only an MFA-completed super admin with audit permission read Category C", () => {
    const base = req({
      category: "C",
      patientProfileId: null,
      resourceKind: "audit_log",
    });
    assert.equal(
      evaluateClinicalAccess(
        principal("SUPER_ADMIN", { permissions: ["VIEW_AUDIT_LOGS"] }),
        base,
        facts(),
      ).allowed,
      true,
    );
    assert.equal(
      evaluateClinicalAccess(principal("SUPER_ADMIN"), base, facts()).allowed,
      false,
    );
    assert.equal(
      evaluateClinicalAccess(
        principal("PSYCHOLOGIST", { permissions: ["VIEW_AUDIT_LOGS"] }),
        base,
        facts(),
      ).allowed,
      false,
    );
    assert.equal(
      evaluateClinicalAccess(
        principal("SUPER_ADMIN", { permissions: ["VIEW_AUDIT_LOGS"] }),
        { ...base, action: "write" },
        facts(),
      ).allowed,
      false,
    );
  });

  it("denies a principal with no roles", () => {
    const d = evaluateClinicalAccess(
      principal("PATIENT", { roles: [], patientProfileId: null }),
      req({ category: "B" }),
      facts(),
    );
    assert.equal(d.allowed, false);
  });
});
