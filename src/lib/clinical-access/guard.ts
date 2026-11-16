/**
 * The single entry point for clinical-data access.
 *
 * Design goals (see docs/clinical-platform/SECURITY_REVIEW_CLINICAL_ACCESS.md):
 *  1. Every data-access function receives an unforgeable AccessGrant and must
 *     call `requireGrant`. A grant can only be issued by `guard.run`, is bound
 *     to one principal/resource/action, and is revoked when the operation ends,
 *     so it cannot be forged, reused, or kept for later.
 *  2. Facts that decide access (care relationship, step-up age) are resolved
 *     INSIDE the guard from injected resolvers - callers cannot assert them.
 *  3. Fail closed: any error while resolving facts, evaluating the policy or
 *     writing the access log denies access and the operation never runs.
 */
import {
  assertLogSafe,
  isOpaqueId,
  type ClinicalAccessEvent,
  type ClinicalAccessLogSink,
} from "@/lib/clinical-access/access-log";
import { evaluateClinicalAccess } from "@/lib/clinical-access/policy";
import type {
  ClinicalAccessRequest,
  ClinicalAction,
  ClinicalDenyReason,
  ClinicalPrincipal,
  DataCategory,
} from "@/lib/clinical-access/types";

/** Resolves the server-side facts the policy needs. Never trust the caller. */
export interface AccessFactsResolver {
  careRelationshipActive(
    principal: ClinicalPrincipal,
    patientProfileId: string,
  ): Promise<boolean>;
  /** When the principal last completed a TOTP step-up, or null. */
  stepUpVerifiedAt(principal: ClinicalPrincipal): Promise<Date | null>;
}

export type GuardDeps = {
  sink: ClinicalAccessLogSink;
  facts: AccessFactsResolver;
  now: () => Date;
  /** How long a step-up stays valid. Default 10 minutes (proposed, owner to confirm). */
  stepUpMaxAgeMs?: number;
};

export const DEFAULT_STEP_UP_MAX_AGE_MS = 10 * 60_000;

const issued = new WeakSet<object>();

/** Capability proving that the guard approved this exact access. */
export class AccessGrant {
  readonly actorUserId: string;
  readonly category: DataCategory;
  readonly action: ClinicalAction;
  readonly patientProfileId: string | null;
  readonly resourceKind: string;
  readonly resourceId: string;
  #revoked = false;

  // Only module-private code below constructs grants.
  constructor(token: symbol, request: ClinicalAccessRequest, actorUserId: string) {
    if (token !== ISSUE_TOKEN) {
      throw new Error("AccessGrant can only be issued by the clinical access guard");
    }
    this.actorUserId = actorUserId;
    this.category = request.category;
    this.action = request.action;
    this.patientProfileId = request.patientProfileId ?? null;
    this.resourceKind = request.resourceKind;
    this.resourceId = request.resourceId;
    issued.add(this);
  }

  get revoked(): boolean {
    return this.#revoked;
  }

  revoke(token: symbol): void {
    if (token === ISSUE_TOKEN) {
      this.#revoked = true;
    }
  }
}

const ISSUE_TOKEN = Symbol("clinical-access-issue");

/**
 * Data-access code calls this before touching a clinical record. It throws if
 * the grant was not issued by the guard, has been revoked, or does not match
 * the resource and action about to be used.
 */
export function requireGrant(
  grant: unknown,
  expected: {
    category: DataCategory;
    action: ClinicalAction;
    resourceKind: string;
    resourceId: string;
    patientProfileId?: string | null;
  },
): asserts grant is AccessGrant {
  if (!(grant instanceof AccessGrant) || !issued.has(grant)) {
    throw new Error("clinical access denied: missing or forged access grant");
  }
  if (grant.revoked) {
    throw new Error("clinical access denied: access grant already revoked");
  }
  if (
    grant.category !== expected.category ||
    grant.action !== expected.action ||
    grant.resourceKind !== expected.resourceKind ||
    grant.resourceId !== expected.resourceId ||
    (expected.patientProfileId !== undefined &&
      grant.patientProfileId !== (expected.patientProfileId ?? null))
  ) {
    throw new Error("clinical access denied: grant does not match this resource");
  }
}

export type GuardedResult<T> =
  | { allowed: true; value: T }
  | { allowed: false; reason: ClinicalDenyReason };

export function createClinicalAccessGuard(deps: GuardDeps) {
  const stepUpMaxAgeMs = deps.stepUpMaxAgeMs ?? DEFAULT_STEP_UP_MAX_AGE_MS;

  function baseEvent(
    principal: ClinicalPrincipal | null,
    request: ClinicalAccessRequest,
  ): Omit<ClinicalAccessEvent, "outcome" | "reason"> {
    return {
      at: deps.now(),
      actorUserId: principal?.userId ?? null,
      patientProfileId: request.patientProfileId ?? null,
      category: request.category,
      action: request.action,
      resourceKind: request.resourceKind,
      resourceId: request.resourceId,
      purpose: request.purpose ?? null,
    };
  }

  async function bestEffortLog(event: ClinicalAccessEvent): Promise<void> {
    try {
      assertLogSafe(event);
      await deps.sink.append(event);
    } catch {
      // Denials and failures stand regardless of logging outcome.
    }
  }

  async function run<T>(
    principal: ClinicalPrincipal | null,
    request: ClinicalAccessRequest,
    operation: (grant: AccessGrant) => Promise<T>,
  ): Promise<GuardedResult<T>> {
    let event: Omit<ClinicalAccessEvent, "outcome" | "reason">;
    let decision: ReturnType<typeof evaluateClinicalAccess>;
    try {
      event = baseEvent(principal, request);
      if (principal && !isOpaqueId(principal.userId)) {
        throw new Error("principal id is not opaque");
      }
      const needsFacts =
        principal !== null && (request.category === "A" || request.category === "B");
      let careRelationshipActive = false;
      let stepUpSatisfied = false;
      if (needsFacts && principal) {
        if (request.patientProfileId) {
          careRelationshipActive = await deps.facts.careRelationshipActive(
            principal,
            request.patientProfileId,
          );
        }
        const at = await deps.facts.stepUpVerifiedAt(principal);
        stepUpSatisfied =
          at instanceof Date &&
          Number.isFinite(at.getTime()) &&
          deps.now().getTime() - at.getTime() >= 0 &&
          deps.now().getTime() - at.getTime() <= stepUpMaxAgeMs;
      }
      decision = evaluateClinicalAccess(principal, request, {
        careRelationshipActive: careRelationshipActive === true,
        stepUpSatisfied,
      });
    } catch {
      // Unexpected error while deciding: deny, never allow.
      const fallback = (() => {
        try {
          return baseEvent(principal, request);
        } catch {
          return null;
        }
      })();
      if (fallback) {
        await bestEffortLog({ ...fallback, outcome: "denied", reason: "internal_error" });
      }
      return { allowed: false, reason: "internal_error" };
    }

    if (!decision.allowed) {
      await bestEffortLog({ ...event, outcome: "denied", reason: decision.reason });
      return { allowed: false, reason: decision.reason };
    }

    // Allowed: the log write must succeed BEFORE the operation runs.
    try {
      const allowedEvent: ClinicalAccessEvent = {
        ...event,
        outcome: "allowed",
        reason: null,
      };
      assertLogSafe(allowedEvent);
      await deps.sink.append(allowedEvent);
    } catch {
      return { allowed: false, reason: "audit_unavailable" };
    }

    const grant = new AccessGrant(ISSUE_TOKEN, request, principal!.userId);
    try {
      return { allowed: true, value: await operation(grant) };
    } catch (error) {
      await bestEffortLog({ ...event, outcome: "failed", reason: null });
      throw error;
    } finally {
      grant.revoke(ISSUE_TOKEN);
    }
  }

  return { run };
}

export type ClinicalAccessGuard = ReturnType<typeof createClinicalAccessGuard>;
