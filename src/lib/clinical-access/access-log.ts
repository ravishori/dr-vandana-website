import { evaluateClinicalAccess } from "@/lib/clinical-access/policy";
import type {
  AccessPurpose,
  ClinicalAccessDecision,
  ClinicalAccessFacts,
  ClinicalAccessRequest,
  ClinicalDenyReason,
  ClinicalPrincipal,
  DataCategory,
  ClinicalAction,
} from "@/lib/clinical-access/types";

/**
 * Access-log event. Contains only opaque identifiers and enumerated values.
 * It must never carry names, contact details, free text or clinical content.
 */
export type ClinicalAccessEvent = {
  at: Date;
  actorUserId: string | null;
  patientProfileId: string | null;
  category: DataCategory;
  action: ClinicalAction;
  resourceKind: string;
  resourceId: string;
  outcome: "allowed" | "denied";
  reason: ClinicalDenyReason | null;
  purpose: AccessPurpose | null;
};

/** Storage-independent sink. A database-backed sink needs an approved migration. */
export interface ClinicalAccessLogSink {
  append(event: ClinicalAccessEvent): Promise<void>;
}

const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const RESOURCE_KIND = /^[a-z][a-z0-9_]{1,40}$/;

export function isOpaqueId(value: string): boolean {
  return OPAQUE_ID.test(value);
}

/**
 * Throws when an event could carry something other than opaque identifiers
 * (for example an email, a name with spaces, or free text).
 */
export function assertLogSafe(event: ClinicalAccessEvent): void {
  const ids = [event.actorUserId, event.patientProfileId, event.resourceId];
  for (const id of ids) {
    if (id !== null && !isOpaqueId(id)) {
      throw new Error("access log event rejected: identifier is not opaque");
    }
  }
  if (!RESOURCE_KIND.test(event.resourceKind)) {
    throw new Error("access log event rejected: invalid resource kind");
  }
}

export type GuardedResult<T> =
  | { allowed: true; value: T }
  | { allowed: false; reason: ClinicalDenyReason };

export type AccessGuardDeps = {
  sink: ClinicalAccessLogSink;
  now: () => Date;
};

/**
 * Evaluate access, write the access-log row, and only then run `operation`.
 * Fail closed: if the log cannot be written (or the event is not log-safe),
 * the operation is NOT run and the caller receives `audit_unavailable`.
 * Denials are logged too (best effort; the denial stands either way).
 */
export async function withClinicalAccess<T>(
  deps: AccessGuardDeps,
  principal: ClinicalPrincipal | null,
  request: ClinicalAccessRequest,
  facts: ClinicalAccessFacts,
  operation: () => Promise<T>,
): Promise<GuardedResult<T>> {
  const decision: ClinicalAccessDecision = evaluateClinicalAccess(
    principal,
    request,
    facts,
  );

  const event: ClinicalAccessEvent = {
    at: deps.now(),
    actorUserId: principal?.userId ?? null,
    patientProfileId: request.patientProfileId ?? null,
    category: request.category,
    action: request.action,
    resourceKind: request.resourceKind,
    resourceId: request.resourceId,
    outcome: decision.allowed ? "allowed" : "denied",
    reason: decision.allowed ? null : decision.reason,
    purpose: request.purpose ?? null,
  };

  if (!decision.allowed) {
    try {
      assertLogSafe(event);
      await deps.sink.append(event);
    } catch {
      // Denial stands regardless of logging outcome.
    }
    return { allowed: false, reason: decision.reason };
  }

  try {
    assertLogSafe(event);
    await deps.sink.append(event);
  } catch {
    return { allowed: false, reason: "audit_unavailable" };
  }

  return { allowed: true, value: await operation() };
}

/** In-memory sink for tests and local development with synthetic data only. */
export class InMemoryClinicalAccessLog implements ClinicalAccessLogSink {
  readonly events: ClinicalAccessEvent[] = [];
  async append(event: ClinicalAccessEvent): Promise<void> {
    this.events.push({ ...event });
  }
}
