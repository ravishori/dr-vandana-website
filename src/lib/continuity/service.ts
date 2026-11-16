/**
 * Continuity Loop service (Increment 1: journey shell, preparation, agenda).
 *
 * Every protected operation goes through the central clinical access guard
 * (PR #34): authentication, mandatory MFA, ownership, care relationship and
 * fail-closed access logging are enforced there, and the repository verifies
 * the resulting AccessGrant, so there is no alternate path to the data.
 * This module never reads patient text for meaning and makes no clinical
 * decision: statuses are workflow records only.
 *
 * Disabled by default (`CONTINUITY_LOOP_ENABLED`); in-memory repository only.
 * Not wired to any route or UI.
 */
import type {
  AccessGrant,
  ClinicalAccessGuard,
  ClinicalAccessRequest,
  ClinicalPrincipal,
} from "@/lib/clinical-access";
import { buildEvent } from "@/lib/continuity/events";
import {
  RESOURCE_KINDS,
  VersionConflictError,
  type ContinuityOps,
  type ContinuityRepository,
} from "@/lib/continuity/repository";
import {
  CONSULTATION_OR_LATER,
  CONSULTATION_TOPIC_STATUSES,
  JOURNEY_TRANSITIONS,
  TERMINAL_CYCLE_STATUSES,
  TOPIC_TRANSITIONS,
  actionDrivenCycleTargets,
  canTransition,
} from "@/lib/continuity/state-machines";
import {
  PREPARATION_ITEM_TYPES,
  type AgendaTopic,
  type CareJourney,
  type ContinuityFlags,
  type CycleStatus,
  type JourneyCycle,
  type JourneyEvent,
  type JourneyEventType,
  type JourneyStatus,
  type PreparationItem,
  type PreparationItemType,
  type TopicStatus,
} from "@/lib/continuity/types";

export type ErrorCode =
  | "feature_disabled"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "invalid_transition"
  | "version_conflict"
  | "stage_not_open"
  | "journey_not_active"
  | "open_journey_exists"
  | "open_cycle_exists"
  | "item_not_editable"
  | "explicit_review_required"
  | "withdrawal_after_sharing_policy_undecided"
  | "audit_unavailable"
  | "internal_error";

export type Result<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };

class DomainError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export type ContinuityDeps = {
  guard: ClinicalAccessGuard;
  repo: ContinuityRepository;
  flags: ContinuityFlags;
  now: () => Date;
  newId: () => string;
};

const MAX_ITEM_CHARS = 4000;
const MAX_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 2000;

function text(value: unknown, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
    throw new DomainError("invalid_input");
  }
  return value; // verbatim; never trimmed, rewritten or interpreted
}

function isPsychologist(p: ClinicalPrincipal | null): p is ClinicalPrincipal {
  return !!p && p.roles.includes("PSYCHOLOGIST");
}
function isPatient(p: ClinicalPrincipal | null): p is ClinicalPrincipal {
  return !!p && p.roles.includes("PATIENT") && !!p.patientProfileId;
}

export class ContinuityService {
  constructor(private readonly d: ContinuityDeps) {}

  private iso(): string {
    return this.d.now().toISOString();
  }

  /** Runs `op` inside the guard (logged, fail-closed) and one repository transaction. */
  private async guarded<T>(
    principal: ClinicalPrincipal | null,
    request: ClinicalAccessRequest,
    op: (grant: AccessGrant, ops: ContinuityOps) => Promise<T>,
  ): Promise<Result<T>> {
    if (!this.d.flags.enabled) return { ok: false, code: "feature_disabled" };
    try {
      const r = await this.d.guard.run(principal, request, (grant) =>
        this.d.repo.transaction((ops) => op(grant, ops)),
      );
      if (r.allowed) return { ok: true, value: r.value };
      switch (r.reason) {
        case "unauthenticated":
          return { ok: false, code: "unauthenticated" };
        // No existence oracle: someone else's or private content looks like "missing".
        case "not_owner":
        case "private_to_patient":
        case "not_released":
          return { ok: false, code: "not_found" };
        case "audit_unavailable":
          return { ok: false, code: "audit_unavailable" };
        case "internal_error":
        case "invalid_request":
          return { ok: false, code: "internal_error" };
        default:
          return { ok: false, code: "forbidden" };
      }
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, code: e.code };
      if (e instanceof VersionConflictError) return { ok: false, code: "version_conflict" };
      return { ok: false, code: "internal_error" };
    }
  }

  /** Content-free lookup so the request carries the true owner. Missing -> not_found. */
  private async peek<T>(fn: (ops: ContinuityOps) => T | null): Promise<T | null> {
    return this.d.repo.transaction(async (ops) => fn(ops));
  }

  private event(
    ops: ContinuityOps,
    grant: AccessGrant,
    actor: ClinicalPrincipal,
    meta: { journeyId: string; cycleId: string | null; patientProfileId: string },
    eventType: JourneyEventType,
    entityType: JourneyEvent["entityType"],
    entityId: string,
    metadata: Record<string, string | number | boolean>,
    correlationId: string,
  ): void {
    ops.appendEvent(
      grant,
      buildEvent({
        id: this.d.newId(),
        journeyId: meta.journeyId,
        cycleId: meta.cycleId,
        actorUserId: actor.userId,
        eventType,
        entityType,
        entityId,
        occurredAt: this.iso(),
        metadata,
        correlationId,
      }),
      meta.patientProfileId,
    );
  }

  // =====================================================================
  // Journey (psychologist)
  // =====================================================================

  async createJourney(
    principal: ClinicalPrincipal | null,
    input: { patientProfileId: string; careRelationshipId: string },
  ): Promise<Result<CareJourney>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const id = this.d.newId();
    return this.guarded(
      principal,
      {
        category: "B",
        action: "write",
        patientProfileId: input.patientProfileId,
        resourceKind: RESOURCE_KINDS.journey,
        resourceId: id,
        purpose: "consultation",
      },
      async (grant, ops) => {
        if (!input.careRelationshipId) throw new DomainError("invalid_input");
        const open = ops
          .journeyIdsForPatient(input.patientProfileId)
          .map((jid) => ops.peekJourney(jid))
          .some((m) => m && m.status !== "closed");
        if (open) throw new DomainError("open_journey_exists");
        const now = this.iso();
        const journey = ops.putJourney(
          grant,
          {
            id,
            patientProfileId: input.patientProfileId,
            careRelationshipId: input.careRelationshipId,
            status: "active",
            startedAt: now,
            closedAt: null,
            createdBy: principal.userId,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
          null,
        );
        this.event(ops, grant, principal, { journeyId: id, cycleId: null, patientProfileId: input.patientProfileId }, "journey_created", "journey", id, { toStatus: "active" }, this.d.newId());
        return journey;
      },
    );
  }

  async setJourneyStatus(
    principal: ClinicalPrincipal | null,
    journeyId: string,
    to: JourneyStatus,
    expectedVersion: number,
  ): Promise<Result<CareJourney>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekJourney(journeyId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "B", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.journey, resourceId: journeyId },
      async (grant, ops) => {
        const j = ops.getJourney(grant, journeyId);
        if (!j) throw new DomainError("not_found");
        if (!canTransition(JOURNEY_TRANSITIONS, j.status, to)) throw new DomainError("invalid_transition");
        const now = this.iso();
        const saved = ops.putJourney(
          grant,
          { ...j, status: to, closedAt: to === "closed" ? now : j.closedAt, updatedAt: now },
          expectedVersion,
        );
        this.event(ops, grant, principal, { journeyId, cycleId: null, patientProfileId: j.patientProfileId }, "journey_status_changed", "journey", journeyId, { fromStatus: j.status, toStatus: to }, this.d.newId());
        return saved;
      },
    );
  }

  // =====================================================================
  // Cycle (psychologist)
  // =====================================================================

  async startCycle(
    principal: ClinicalPrincipal | null,
    journeyId: string,
    options: { linkedAppointmentId?: string | null } = {},
  ): Promise<Result<JourneyCycle>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekJourney(journeyId));
    if (!meta) return { ok: false, code: "not_found" };
    const id = this.d.newId();
    return this.guarded(
      principal,
      { category: "B", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.cycle, resourceId: id },
      async (grant, ops) => {
        const current = ops.peekJourney(journeyId);
        if (!current || current.status !== "active") throw new DomainError("journey_not_active");
        const cycles = ops.peekCyclesOfJourney(journeyId);
        // A new cycle never starts while the previous one is not in a terminal state.
        if (cycles.some((c) => !TERMINAL_CYCLE_STATUSES.includes(c.status))) {
          throw new DomainError("open_cycle_exists");
        }
        const sequence = cycles.reduce((m, c) => Math.max(m, c.sequenceNumber), 0) + 1;
        const now = this.iso();
        const cycle = ops.putCycle(
          grant,
          {
            id,
            careJourneyId: journeyId,
            patientProfileId: meta.patientProfileId,
            sequenceNumber: sequence,
            status: "preparation",
            linkedAppointmentId: options.linkedAppointmentId ?? null,
            startedAt: now,
            consultationAt: null,
            reviewedAt: null,
            createdBy: principal.userId,
            createdAt: now,
            version: 0,
          },
          null,
        );
        ops.failpoint("after_cycle_insert"); // test hook: proves cycle and event commit together
        this.event(ops, grant, principal, { journeyId, cycleId: id, patientProfileId: meta.patientProfileId }, "cycle_started", "cycle", id, { toStatus: "preparation", sequenceNumber: sequence, linkedAppointment: !!options.linkedAppointmentId }, this.d.newId());
        return cycle;
      },
    );
  }

  /**
   * Psychologist-driven workflow transition. Never reaches `reviewed`: that
   * needs an explicit review record (a later increment), and an attended
   * appointment or an opened cycle never moves a cycle by itself.
   */
  async advanceCycle(
    principal: ClinicalPrincipal | null,
    cycleId: string,
    to: CycleStatus,
    expectedVersion: number,
  ): Promise<Result<JourneyCycle>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "B", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.cycle, resourceId: cycleId },
      async (grant, ops) => {
        const c = ops.getCycle(grant, cycleId);
        if (!c) throw new DomainError("not_found");
        if (to === "reviewed") throw new DomainError("explicit_review_required");
        if (!actionDrivenCycleTargets(c.status).includes(to)) throw new DomainError("invalid_transition");
        const saved = ops.putCycle(
          grant,
          { ...c, status: to, consultationAt: to === "consultation" ? this.iso() : c.consultationAt },
          expectedVersion,
        );
        this.event(ops, grant, principal, { journeyId: c.careJourneyId, cycleId, patientProfileId: c.patientProfileId }, "cycle_status_changed", "cycle", cycleId, { fromStatus: c.status, toStatus: to }, this.d.newId());
        return saved;
      },
    );
  }

  /** Read-only. Viewing never changes a cycle (opening is not reviewing). */
  async viewCycle(principal: ClinicalPrincipal | null, cycleId: string): Promise<Result<JourneyCycle>> {
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "B", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.cycle, resourceId: cycleId },
      async (grant, ops) => {
        const c = ops.getCycle(grant, cycleId);
        if (!c) throw new DomainError("not_found");
        return c;
      },
    );
  }

  async listJourneyCycles(principal: ClinicalPrincipal | null, journeyId: string): Promise<Result<JourneyCycle[]>> {
    const meta = await this.peek((o) => o.peekJourney(journeyId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "B", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.cycleList, resourceId: journeyId },
      async (grant, ops) => ops.listCycles(grant, journeyId),
    );
  }

  /** A patient's own journeys. */
  async listMyJourneys(principal: ClinicalPrincipal | null): Promise<Result<CareJourney[]>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const own = principal.patientProfileId!;
    return this.guarded(
      principal,
      { category: "B", action: "read", patientProfileId: own, resourceKind: RESOURCE_KINDS.journeyList, resourceId: own },
      async (grant, ops) => ops.listJourneys(grant, own),
    );
  }

  async listEvents(principal: ClinicalPrincipal | null, journeyId: string): Promise<Result<JourneyEvent[]>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekJourney(journeyId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "B", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.journey, resourceId: journeyId },
      async (grant, ops) => ops.listEvents(grant, journeyId),
    );
  }

  // =====================================================================
  // Preparation (patient writes; psychologist reads only what is shared)
  // =====================================================================

  async createPreparationDraft(
    principal: ClinicalPrincipal | null,
    cycleId: string,
    input: { itemType: PreparationItemType; content: string },
  ): Promise<Result<PreparationItem>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    const id = this.d.newId();
    return this.guarded(
      principal,
      { category: "A", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.item, resourceId: id, patientAuthored: true, privateToPatient: true, purpose: "patient_self_service" },
      async (grant, ops) => {
        if (!PREPARATION_ITEM_TYPES.includes(input.itemType)) throw new DomainError("invalid_input");
        const content = text(input.content, MAX_ITEM_CHARS);
        const current = ops.peekCycle(cycleId);
        if (!current || current.status !== "preparation") throw new DomainError("stage_not_open");
        const now = this.iso();
        const item = ops.putItem(
          grant,
          {
            id,
            journeyCycleId: cycleId,
            patientProfileId: meta.patientProfileId,
            authorUserId: principal.userId,
            itemType: input.itemType,
            content,
            visibility: "private", // private by default; sharing is a separate explicit action
            status: "draft",
            provenance: "patient_reported",
            createdAt: now,
            updatedAt: now,
            sharedAt: null,
            withdrawnAt: null,
            version: 0,
          },
          null,
        );
        this.event(ops, grant, principal, { journeyId: current.journeyId, cycleId, patientProfileId: meta.patientProfileId }, "preparation_item_created", "preparation_item", id, { itemType: input.itemType, visibility: "private" }, this.d.newId());
        return item;
      },
    );
  }

  private async itemRequest(itemId: string, action: "read" | "write") {
    const meta = await this.peek((o) => o.peekItem(itemId));
    if (!meta) return null;
    const request: ClinicalAccessRequest = {
      category: "A",
      action,
      patientProfileId: meta.patientProfileId,
      resourceKind: RESOURCE_KINDS.item,
      resourceId: itemId,
      patientAuthored: true,
      // Flag derived from stored visibility, never from the caller.
      privateToPatient: meta.visibility === "private",
    };
    return { meta, request };
  }

  async editPreparationDraft(
    principal: ClinicalPrincipal | null,
    itemId: string,
    content: string,
    expectedVersion: number,
  ): Promise<Result<PreparationItem>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const found = await this.itemRequest(itemId, "write");
    if (!found) return { ok: false, code: "not_found" };
    return this.guarded(principal, found.request, async (grant, ops) => {
      const item = ops.getItem(grant, itemId);
      if (!item) throw new DomainError("not_found");
      if (item.status !== "draft" || item.authorUserId !== principal.userId) throw new DomainError("item_not_editable");
      const next = text(content, MAX_ITEM_CHARS);
      const saved = ops.putItem(grant, { ...item, content: next, updatedAt: this.iso() }, expectedVersion);
      const cyc = ops.peekCycle(item.journeyCycleId)!;
      this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId: item.journeyCycleId, patientProfileId: item.patientProfileId }, "preparation_item_edited", "preparation_item", itemId, {}, this.d.newId());
      return saved;
    });
  }

  /** Explicit sharing. The only way an item becomes visible to the psychologist. */
  async sharePreparationItem(
    principal: ClinicalPrincipal | null,
    itemId: string,
    expectedVersion: number,
  ): Promise<Result<PreparationItem>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const found = await this.itemRequest(itemId, "write");
    if (!found) return { ok: false, code: "not_found" };
    return this.guarded(principal, found.request, async (grant, ops) => {
      const item = ops.getItem(grant, itemId);
      if (!item) throw new DomainError("not_found");
      if (item.status !== "draft" || item.authorUserId !== principal.userId) throw new DomainError("item_not_editable");
      const cyc = ops.peekCycle(item.journeyCycleId)!;
      if (cyc.status !== "preparation") throw new DomainError("stage_not_open");
      const now = this.iso();
      const saved = ops.putItem(
        grant,
        { ...item, visibility: "shared_with_psychologist", status: "submitted", sharedAt: now, updatedAt: now },
        expectedVersion,
      );
      this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId: item.journeyCycleId, patientProfileId: item.patientProfileId }, "preparation_item_shared", "preparation_item", itemId, { itemType: item.itemType, visibility: "shared_with_psychologist" }, this.d.newId());
      return saved;
    });
  }

  /**
   * Withdraw an unshared draft. Withdrawing something already shared with the
   * psychologist depends on an undecided retention/record policy (PRD 13 open
   * question 1) and is therefore refused rather than guessed.
   */
  async withdrawPreparationDraft(
    principal: ClinicalPrincipal | null,
    itemId: string,
    expectedVersion: number,
  ): Promise<Result<PreparationItem>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const found = await this.itemRequest(itemId, "write");
    if (!found) return { ok: false, code: "not_found" };
    return this.guarded(principal, found.request, async (grant, ops) => {
      const item = ops.getItem(grant, itemId);
      if (!item) throw new DomainError("not_found");
      if (item.status === "submitted") throw new DomainError("withdrawal_after_sharing_policy_undecided");
      if (item.status !== "draft") throw new DomainError("item_not_editable");
      const now = this.iso();
      const saved = ops.putItem(grant, { ...item, status: "withdrawn", withdrawnAt: now, updatedAt: now }, expectedVersion);
      const cyc = ops.peekCycle(item.journeyCycleId)!;
      this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId: item.journeyCycleId, patientProfileId: item.patientProfileId }, "preparation_item_withdrawn", "preparation_item", itemId, {}, this.d.newId());
      return saved;
    });
  }

  /** The patient's own items in a cycle, including private drafts. */
  async listMyPreparation(principal: ClinicalPrincipal | null, cycleId: string): Promise<Result<PreparationItem[]>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "A", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.itemList, resourceId: cycleId, patientAuthored: true, privateToPatient: true },
      async (grant, ops) => ops.listOwnItems(grant, cycleId),
    );
  }

  /** The psychologist's view: only items the patient explicitly shared. Opening it records nothing as reviewed. */
  async listSharedPreparation(principal: ClinicalPrincipal | null, cycleId: string): Promise<Result<PreparationItem[]>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "A", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.itemList, resourceId: cycleId, patientAuthored: true, privateToPatient: false, purpose: "consultation" },
      async (grant, ops) => ops.listSharedItems(grant, cycleId),
    );
  }

  /** Single item. A private item reads as "not found" to everyone except its author. */
  async getPreparationItem(principal: ClinicalPrincipal | null, itemId: string): Promise<Result<PreparationItem>> {
    const found = await this.itemRequest(itemId, "read");
    if (!found) return { ok: false, code: "not_found" };
    return this.guarded(principal, found.request, async (grant, ops) => {
      const item = ops.getItem(grant, itemId);
      if (!item) throw new DomainError("not_found");
      return item;
    });
  }

  // =====================================================================
  // Agenda
  // =====================================================================

  private async createTopicInternal(
    principal: ClinicalPrincipal,
    cycleId: string,
    spec: {
      source: AgendaTopic["source"];
      status: TopicStatus;
      title: string;
      description?: string | null;
      sourcePreparationItemId?: string | null;
      carriedFromTopicId?: string | null;
      patientAuthored: boolean;
    },
  ): Promise<Result<AgendaTopic>> {
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    const id = this.d.newId();
    return this.guarded(
      principal,
      { category: "A", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.topic, resourceId: id, patientAuthored: spec.patientAuthored },
      async (grant, ops) => {
        const title = text(spec.title, MAX_TITLE_CHARS);
        const description = spec.description == null ? null : text(spec.description, MAX_DESCRIPTION_CHARS);
        const cyc = ops.peekCycle(cycleId);
        if (!cyc || cyc.status !== "preparation") throw new DomainError("stage_not_open");
        const order = ops.peekTopicsOfCycle(cycleId).reduce((m, t) => Math.max(m, t.displayOrder), 0) + 1;
        const now = this.iso();
        const topic = ops.putTopic(
          grant,
          {
            id,
            journeyCycleId: cycleId,
            patientProfileId: meta.patientProfileId,
            createdBy: principal.userId,
            source: spec.source,
            sourcePreparationItemId: spec.sourcePreparationItemId ?? null,
            carriedFromTopicId: spec.carriedFromTopicId ?? null,
            title,
            description,
            status: spec.status,
            displayOrder: order,
            createdAt: now,
            updatedAt: now,
            version: 0,
          },
          null,
        );
        this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId, patientProfileId: meta.patientProfileId }, "agenda_topic_created", "agenda_topic", id, { source: spec.source, toStatus: spec.status }, this.d.newId());
        return topic;
      },
    );
  }

  /** A patient proposes a topic. Proposing is an explicit act and makes it visible to the psychologist. */
  async proposeTopic(
    principal: ClinicalPrincipal | null,
    cycleId: string,
    input: { title: string; description?: string | null },
  ): Promise<Result<AgendaTopic>> {
    if (!isPatient(principal)) return this.denyRole(principal);
    return this.createTopicInternal(principal, cycleId, {
      source: "patient_preparation",
      status: "proposed",
      title: input.title,
      description: input.description,
      patientAuthored: true,
    });
  }

  async addPsychologistTopic(
    principal: ClinicalPrincipal | null,
    cycleId: string,
    input: { title: string; description?: string | null },
  ): Promise<Result<AgendaTopic>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    return this.createTopicInternal(principal, cycleId, {
      source: "psychologist",
      status: "accepted",
      title: input.title,
      description: input.description,
      patientAuthored: false,
    });
  }

  /**
   * Turn a SHARED preparation item into an agenda topic. The psychologist
   * writes the title; the patient's original item is never altered.
   */
  async topicFromSharedItem(
    principal: ClinicalPrincipal | null,
    itemId: string,
    input: { title: string },
  ): Promise<Result<AgendaTopic>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekItem(itemId));
    if (!meta || meta.visibility !== "shared_with_psychologist" || meta.status !== "submitted") {
      return { ok: false, code: "not_found" };
    }
    return this.createTopicInternal(principal, meta.cycleId, {
      source: "patient_preparation",
      status: "accepted",
      title: input.title,
      sourcePreparationItemId: itemId,
      patientAuthored: false,
    });
  }

  async setTopicStatus(
    principal: ClinicalPrincipal | null,
    topicId: string,
    to: TopicStatus,
    expectedVersion: number,
  ): Promise<Result<AgendaTopic>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekTopic(topicId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "A", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.topic, resourceId: topicId },
      async (grant, ops) => {
        const t = ops.getTopic(grant, topicId);
        if (!t) throw new DomainError("not_found");
        if (!canTransition(TOPIC_TRANSITIONS, t.status, to)) throw new DomainError("invalid_transition");
        const cyc = ops.peekCycle(t.journeyCycleId)!;
        // "Discussed" records what happened in a consultation; it is workflow, not clinical resolution.
        if (CONSULTATION_TOPIC_STATUSES.includes(to) && !CONSULTATION_OR_LATER.includes(cyc.status)) {
          throw new DomainError("stage_not_open");
        }
        const saved = ops.putTopic(grant, { ...t, status: to, updatedAt: this.iso() }, expectedVersion);
        this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId: t.journeyCycleId, patientProfileId: t.patientProfileId }, "agenda_topic_status_changed", "agenda_topic", topicId, { fromStatus: t.status, toStatus: to }, this.d.newId());
        return saved;
      },
    );
  }

  async reorderTopics(
    principal: ClinicalPrincipal | null,
    cycleId: string,
    orderedIds: string[],
  ): Promise<Result<AgendaTopic[]>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    return this.guarded(
      principal,
      { category: "A", action: "write", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.topicList, resourceId: cycleId },
      async (grant, ops) => {
        let result: AgendaTopic[];
        try {
          result = ops.reorderTopics(grant, cycleId, orderedIds);
        } catch (e) {
          if (e instanceof Error && e.message === "reorder_must_list_every_topic_once") {
            throw new DomainError("invalid_input");
          }
          throw e;
        }
        const cyc = ops.peekCycle(cycleId)!;
        this.event(ops, grant, principal, { journeyId: cyc.journeyId, cycleId, patientProfileId: meta.patientProfileId }, "agenda_topics_reordered", "agenda_topic", cycleId, { count: orderedIds.length }, this.d.newId());
        return result;
      },
    );
  }

  /** Explicit carry-forward of a DEFERRED topic into a later cycle of the same journey. */
  async carryForwardTopic(
    principal: ClinicalPrincipal | null,
    topicId: string,
    targetCycleId: string,
  ): Promise<Result<AgendaTopic>> {
    if (!isPsychologist(principal)) return this.denyRole(principal);
    const meta = await this.peek((o) => o.peekTopic(topicId));
    if (!meta || meta.status !== "deferred") return { ok: false, code: meta ? "invalid_transition" : "not_found" };
    const sourceCycle = await this.peek((o) => o.peekCycle(meta.cycleId));
    const target = await this.peek((o) => o.peekCycle(targetCycleId));
    if (!sourceCycle || !target) return { ok: false, code: "not_found" };
    if (
      target.journeyId !== sourceCycle.journeyId ||
      target.patientProfileId !== meta.patientProfileId ||
      target.status !== "preparation" ||
      targetCycleId === meta.cycleId
    ) {
      return { ok: false, code: "invalid_input" };
    }
    // Read the source topic through its own grant, then create the copy through another.
    const source = await this.guarded(
      principal,
      { category: "A", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.topic, resourceId: topicId },
      async (grant, ops) => {
        const t = ops.getTopic(grant, topicId);
        if (!t) throw new DomainError("not_found");
        return t;
      },
    );
    if (!source.ok) return source;
    const created = await this.createTopicInternal(principal, targetCycleId, {
      source: "carried_forward",
      status: "proposed",
      title: source.value.title,
      description: source.value.description,
      carriedFromTopicId: topicId,
      patientAuthored: false,
    });
    return created;
  }

  /** Psychologist: every topic. Patient: only the topics they proposed themselves (agenda visibility is an open question). */
  async listAgenda(principal: ClinicalPrincipal | null, cycleId: string): Promise<Result<AgendaTopic[]>> {
    const meta = await this.peek((o) => o.peekCycle(cycleId));
    if (!meta) return { ok: false, code: "not_found" };
    const patient = isPatient(principal);
    const result = await this.guarded(
      principal,
      { category: "A", action: "read", patientProfileId: meta.patientProfileId, resourceKind: RESOURCE_KINDS.topicList, resourceId: cycleId, patientAuthored: patient, purpose: patient ? "patient_self_service" : "consultation" },
      async (grant, ops) => ops.listTopics(grant, cycleId),
    );
    if (!result.ok || !patient || !principal) return result;
    return { ok: true, value: result.value.filter((t) => t.createdBy === principal.userId) };
  }

  private denyRole<T>(principal: ClinicalPrincipal | null): Result<T> {
    if (!this.d.flags.enabled) return { ok: false, code: "feature_disabled" };
    return { ok: false, code: principal ? "forbidden" : "unauthenticated" };
  }
}
