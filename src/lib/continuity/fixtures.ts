/**
 * SYNTHETIC fixtures for the Continuity Loop tests. Fictional identities only;
 * no real person, patient, clinician or content.
 */
import {
  InMemoryClinicalAccessLog,
  createClinicalAccessGuard,
  type AccessFactsResolver,
  type ClinicalAccessLogSink,
  type ClinicalPrincipal,
} from "@/lib/clinical-access";
import { InMemoryContinuityRepository } from "@/lib/continuity/memory-repository";
import { ContinuityService } from "@/lib/continuity/service";
import type { ContinuityFlags } from "@/lib/continuity/types";

export const PATIENT_A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
export const PATIENT_B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
export const CARE_REL_A = "relation-a-0001";
export const CARE_REL_B = "relation-b-0001";

export const doctor: ClinicalPrincipal = {
  userId: "dddddddd-3333-4333-8333-dddddddddddd",
  roles: ["PSYCHOLOGIST"],
  permissions: ["VIEW_CLINICAL_RECORDS", "MANAGE_CLINICAL_NOTES", "MANAGE_CLINICAL_DOCUMENTS", "VIEW_PRIVATE_CLINICAL_NOTES"],
  patientProfileId: null,
  mfaCompleted: true,
};

export const patientA: ClinicalPrincipal = {
  userId: "eeeeeeee-4444-4444-8444-eeeeeeeeeeee",
  roles: ["PATIENT"],
  permissions: [],
  patientProfileId: PATIENT_A,
  mfaCompleted: true,
};

export const patientB: ClinicalPrincipal = {
  userId: "ffffffff-5555-4555-8555-ffffffffffff",
  roles: ["PATIENT"],
  permissions: [],
  patientProfileId: PATIENT_B,
  mfaCompleted: true,
};

export const staff: ClinicalPrincipal = {
  userId: "99999999-6666-4666-8666-999999999999",
  roles: ["STAFF"],
  permissions: ["MANAGE_APPOINTMENT_SETTINGS"],
  patientProfileId: null,
  mfaCompleted: true,
};

export const superAdmin: ClinicalPrincipal = {
  userId: "88888888-7777-4777-8777-888888888888",
  roles: ["SUPER_ADMIN"],
  permissions: ["VIEW_AUDIT_LOGS", "MANAGE_USERS", "VIEW_CLINICAL_RECORDS", "MANAGE_CLINICAL_NOTES"],
  patientProfileId: null,
  mfaCompleted: true,
};

export function world(options: { enabled?: boolean; sink?: ClinicalAccessLogSink } = {}) {
  const relationships = new Set<string>([`${doctor.userId}:${PATIENT_A}`, `${doctor.userId}:${PATIENT_B}`]);
  const facts: AccessFactsResolver = {
    careRelationshipActive: async (p, patient) => relationships.has(`${p.userId}:${patient}`),
    stepUpVerifiedAt: async () => null,
  };
  const clock = { now: new Date("2026-11-17T10:00:00+05:30") };
  const sink = options.sink ?? new InMemoryClinicalAccessLog();
  const guard = createClinicalAccessGuard({ sink, facts, now: () => clock.now });
  const repo = new InMemoryContinuityRepository();
  let n = 0;
  const flags: ContinuityFlags = { enabled: options.enabled ?? true };
  const service = new ContinuityService({
    guard,
    repo,
    flags,
    now: () => clock.now,
    newId: () => `id-${String(++n).padStart(8, "0")}`,
  });
  return { service, guard, repo, sink: sink as InMemoryClinicalAccessLog, relationships, clock, flags };
}

export type World = ReturnType<typeof world>;

/** Journey + first cycle for PATIENT_A, ready for preparation. */
export async function journeyWithCycle(w: World) {
  const j = await w.service.createJourney(doctor, { patientProfileId: PATIENT_A, careRelationshipId: CARE_REL_A });
  if (!j.ok) throw new Error(`fixture: ${j.code}`);
  const c = await w.service.startCycle(doctor, j.value.id);
  if (!c.ok) throw new Error(`fixture: ${c.code}`);
  return { journey: j.value, cycle: c.value };
}
