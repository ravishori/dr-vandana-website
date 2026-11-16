/**
 * Clinical access policy - types.
 *
 * Implements the access matrix proposed in
 * docs/recovery/clinical-platform-architecture/10_DATA_CLASSIFICATION_AND_ACCESS_MATRIX.md.
 * The matrix is a DRAFT pending owner approval; this module encodes the
 * conservative reading (deny by default) and is provider independent: it
 * does not import a database, a key service or any vendor SDK.
 *
 * Data categories:
 *   A  clinical content            (session notes, history, safety entries ...)
 *   B  identifiable administrative (profile, contact, appointments, consents)
 *   C  operational / security      (audit logs, security events)
 *   D  public / non-identifiable   (public website content)
 */
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";

export const DATA_CATEGORIES = ["A", "B", "C", "D"] as const;
export type DataCategory = (typeof DATA_CATEGORIES)[number];

export const CLINICAL_ACTIONS = [
  "read",
  "write",
  "submit",
  "sign",
  "export",
  "release",
] as const;
export type ClinicalAction = (typeof CLINICAL_ACTIONS)[number];

export const ACCESS_PURPOSES = [
  "consultation",
  "intake_review",
  "patient_self_service",
  "record_request",
] as const;
export type AccessPurpose = (typeof ACCESS_PURPOSES)[number];

export type ClinicalAccessRequest = {
  category: DataCategory;
  action: ClinicalAction;
  /** Patient the resource belongs to. Required for categories A and B. */
  patientProfileId?: string | null;
  /** Opaque resource identity for the access log (never clinical content). */
  resourceKind: string;
  resourceId: string;
  /**
   * Category A only: restricted material (private working notes,
   * individually confidential disclosures) needs an extra permission.
   */
  restricted?: boolean;
  /** Category A only: the doctor has released this item to the patient. */
  releasedToPatient?: boolean;
  /** Category A only: the content was written by the owning patient. */
  patientAuthored?: boolean;
  /**
   * Category A only: the patient has not shared this item. Only the owning
   * patient may reach it; clinicians, staff and administrators never can.
   */
  privateToPatient?: boolean;
  purpose?: AccessPurpose;
};

/** Facts the caller derives from the session / database. */
export type ClinicalAccessFacts = {
  /** A fresh step-up (TOTP re-verification) was completed for this session. */
  stepUpSatisfied: boolean;
  /** An explicit, active doctor-patient care relationship exists. */
  careRelationshipActive: boolean;
};

export type ClinicalDenyReason =
  | "unauthenticated"
  | "mfa_required"
  | "forbidden_role"
  | "forbidden_permission"
  | "not_owner"
  | "no_care_relationship"
  | "step_up_required"
  | "not_released"
  | "private_to_patient"
  | "invalid_request"
  | "audit_unavailable"
  | "internal_error";

export type ClinicalAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: ClinicalDenyReason };

export type ClinicalPrincipal = AuthorizationPrincipal;
