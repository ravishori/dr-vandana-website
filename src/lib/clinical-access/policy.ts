import {
  CLINICAL_ACTIONS,
  DATA_CATEGORIES,
  type ClinicalAccessDecision,
  type ClinicalAccessFacts,
  type ClinicalAccessRequest,
  type ClinicalAction,
  type ClinicalPrincipal,
} from "@/lib/clinical-access/types";
import {
  MFA_REQUIRED_ROLES,
  type PermissionName,
} from "@/lib/identity/constants";

const deny = (
  reason: Extract<ClinicalAccessDecision, { allowed: false }>["reason"],
): ClinicalAccessDecision => ({ allowed: false, reason });

const ALLOW: ClinicalAccessDecision = { allowed: true };

/** Doctor permission required per action on Category A. */
const DOCTOR_PERMISSION_FOR_ACTION: Record<ClinicalAction, PermissionName> = {
  read: "VIEW_CLINICAL_RECORDS",
  write: "MANAGE_CLINICAL_NOTES",
  submit: "MANAGE_CLINICAL_NOTES",
  sign: "MANAGE_CLINICAL_NOTES",
  export: "VIEW_CLINICAL_RECORDS",
  release: "MANAGE_CLINICAL_DOCUMENTS",
};

/** Actions that need a fresh TOTP step-up even for the doctor. */
const STEP_UP_ACTIONS: ReadonlySet<ClinicalAction> = new Set([
  "sign",
  "export",
  "release",
]);

function requiresMfa(principal: ClinicalPrincipal): boolean {
  return principal.roles.some((role) => MFA_REQUIRED_ROLES.includes(role));
}

/**
 * Pure, deny-by-default access decision. No I/O, no clinical content.
 * Every `allowed: true` path is listed explicitly below.
 */
export function evaluateClinicalAccess(
  principal: ClinicalPrincipal | null,
  request: ClinicalAccessRequest,
  facts: ClinicalAccessFacts,
): ClinicalAccessDecision {
  if (
    !DATA_CATEGORIES.includes(request.category) ||
    !CLINICAL_ACTIONS.includes(request.action) ||
    !request.resourceId ||
    !request.resourceKind
  ) {
    return deny("invalid_request");
  }

  // Category D: public, read only, no principal needed.
  if (request.category === "D") {
    return request.action === "read" ? ALLOW : deny("forbidden_permission");
  }

  if (!principal) {
    return deny("unauthenticated");
  }

  // Mandatory MFA: roles that require it get nothing without a completed MFA
  // session. There is no exemption path in this module.
  if (requiresMfa(principal) && principal.mfaCompleted !== true) {
    return deny("mfa_required");
  }

  // Categories A and B belong to one patient.
  if (
    (request.category === "A" || request.category === "B") &&
    !request.patientProfileId
  ) {
    return deny("invalid_request");
  }

  switch (request.category) {
    case "C":
      return evaluateCategoryC(principal, request);
    case "B":
      return evaluateCategoryB(principal, request, facts);
    case "A":
      return evaluateCategoryA(principal, request, facts);
    default:
      return deny("invalid_request");
  }
}

/** Operational/security data: audit-viewing administrators read only. */
function evaluateCategoryC(
  principal: ClinicalPrincipal,
  request: ClinicalAccessRequest,
): ClinicalAccessDecision {
  if (request.action !== "read") {
    return deny("forbidden_permission");
  }
  if (!principal.roles.includes("SUPER_ADMIN")) {
    return deny("forbidden_role");
  }
  return principal.permissions.includes("VIEW_AUDIT_LOGS")
    ? ALLOW
    : deny("forbidden_permission");
}

/**
 * Identifiable administrative data.
 * Patient: own profile. Psychologist: with an active care relationship.
 * STAFF and SUPER_ADMIN are denied until the owner approves an assistant
 * role (register OD-B1) and an admin metadata view.
 */
function evaluateCategoryB(
  principal: ClinicalPrincipal,
  request: ClinicalAccessRequest,
  facts: ClinicalAccessFacts,
): ClinicalAccessDecision {
  if (request.action === "sign" || request.action === "release") {
    return deny("forbidden_permission");
  }
  if (principal.roles.includes("PSYCHOLOGIST")) {
    if (!facts.careRelationshipActive) {
      return deny("no_care_relationship");
    }
    if (request.action === "export" && !facts.stepUpSatisfied) {
      return deny("step_up_required");
    }
    return ALLOW;
  }
  if (principal.roles.includes("PATIENT")) {
    if (request.action === "export") {
      return deny("forbidden_permission");
    }
    return principal.patientProfileId === request.patientProfileId
      ? ALLOW
      : deny("not_owner");
  }
  return deny("forbidden_role");
}

/**
 * Clinical content. Only the treating psychologist and, for released items,
 * the owning patient. Administrators, staff and guardians are denied.
 */
function evaluateCategoryA(
  principal: ClinicalPrincipal,
  request: ClinicalAccessRequest,
  facts: ClinicalAccessFacts,
): ClinicalAccessDecision {
  const isOwnerPatient =
    principal.roles.includes("PATIENT") &&
    !!request.patientProfileId &&
    principal.patientProfileId === request.patientProfileId;

  // Private-to-patient content: only the owning patient, only their own words.
  if (request.privateToPatient) {
    if (!isOwnerPatient) {
      return principal.roles.includes("PATIENT") ? deny("not_owner") : deny("private_to_patient");
    }
    if (!request.patientAuthored || request.restricted) return deny("forbidden_permission");
    return request.action === "read" || request.action === "write" || request.action === "submit"
      ? ALLOW
      : deny("forbidden_permission");
  }

  if (principal.roles.includes("PSYCHOLOGIST")) {
    const required = DOCTOR_PERMISSION_FOR_ACTION[request.action];
    if (!principal.permissions.includes(required)) {
      return deny("forbidden_permission");
    }
    if (
      request.restricted &&
      !principal.permissions.includes("VIEW_PRIVATE_CLINICAL_NOTES")
    ) {
      return deny("forbidden_permission");
    }
    if (!facts.careRelationshipActive) {
      return deny("no_care_relationship");
    }
    if (STEP_UP_ACTIONS.has(request.action) && !facts.stepUpSatisfied) {
      return deny("step_up_required");
    }
    return ALLOW;
  }

  if (principal.roles.includes("PATIENT")) {
    if (principal.patientProfileId !== request.patientProfileId) {
      return deny("not_owner");
    }
    if (request.restricted) {
      return deny("forbidden_permission");
    }
    if (request.action === "submit") {
      return ALLOW; // patient's own submissions (intake, messages)
    }
    if (request.patientAuthored && (request.action === "read" || request.action === "write")) {
      return ALLOW; // the patient's own words (e.g. preparation notes)
    }
    if (request.action === "read") {
      return request.releasedToPatient ? ALLOW : deny("not_released");
    }
    return deny("forbidden_permission");
  }

  // SUPER_ADMIN, STAFF and any other role: no Category A access.
  return deny("forbidden_role");
}
