import type {
  AccessPurpose,
  ClinicalAction,
  ClinicalDenyReason,
  DataCategory,
} from "@/lib/clinical-access/types";

/**
 * Access-log event. Contains only opaque identifiers and enumerated values.
 * It must never carry names, contact details, free text or clinical content.
 *
 * outcome:
 *  - allowed: the guard granted access (written BEFORE the operation runs)
 *  - denied:  the guard refused access
 *  - failed:  access was granted but the operation then threw (best effort)
 */
export type ClinicalAccessEvent = {
  at: Date;
  actorUserId: string | null;
  patientProfileId: string | null;
  category: DataCategory;
  action: ClinicalAction;
  resourceKind: string;
  resourceId: string;
  outcome: "allowed" | "denied" | "failed";
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

/** In-memory sink for tests and local development with synthetic data only. */
export class InMemoryClinicalAccessLog implements ClinicalAccessLogSink {
  readonly events: ClinicalAccessEvent[] = [];
  async append(event: ClinicalAccessEvent): Promise<void> {
    this.events.push({ ...event });
  }
}
