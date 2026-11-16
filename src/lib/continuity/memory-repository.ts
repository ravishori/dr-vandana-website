import { requireGrant, type AccessGrant } from "@/lib/clinical-access";
import {
  RESOURCE_KINDS,
  VersionConflictError,
  type ContinuityOps,
  type ContinuityRepository,
  type CycleMeta,
  type ItemMeta,
  type JourneyMeta,
  type TopicMeta,
} from "@/lib/continuity/repository";
import type {
  AgendaTopic,
  CareJourney,
  JourneyCycle,
  JourneyEvent,
  PreparationItem,
} from "@/lib/continuity/types";

type State = {
  journeys: Record<string, CareJourney>;
  cycles: Record<string, JourneyCycle>;
  items: Record<string, PreparationItem>;
  topics: Record<string, AgendaTopic>;
  events: (JourneyEvent & { patientProfileId: string })[];
};

const empty = (): State => ({ journeys: {}, cycles: {}, items: {}, topics: {}, events: [] });

/** What must never change once written, whatever code runs inside a transaction. */
function assertInvariants(before: State, after: State): void {
  for (const [id, item] of Object.entries(before.items)) {
    const next = after.items[id];
    if (!next) throw new Error("invariant: preparation items are never deleted");
    if (item.status === "submitted") {
      if (
        next.content !== item.content ||
        next.authorUserId !== item.authorUserId ||
        next.itemType !== item.itemType ||
        next.patientProfileId !== item.patientProfileId ||
        next.sharedAt !== item.sharedAt
      ) {
        throw new Error("invariant: a shared preparation item's wording is immutable");
      }
    }
    if (item.status === "withdrawn" && next.status !== "withdrawn") {
      throw new Error("invariant: a withdrawn item cannot be revived");
    }
  }
  for (const id of Object.keys(before.journeys)) {
    if (!after.journeys[id]) throw new Error("invariant: journeys are never deleted");
  }
  for (const id of Object.keys(before.cycles)) {
    if (!after.cycles[id]) throw new Error("invariant: cycles are never deleted");
  }
  for (const id of Object.keys(before.topics)) {
    if (!after.topics[id]) throw new Error("invariant: topics are never deleted");
  }
  if (after.events.length < before.events.length) throw new Error("invariant: events are append-only");
  before.events.forEach((e, i) => {
    if (JSON.stringify(e) !== JSON.stringify(after.events[i])) {
      throw new Error("invariant: events are append-only");
    }
  });
}

class Ops implements ContinuityOps {
  constructor(
    private readonly s: State,
    private readonly failpoints: Set<string>,
  ) {}

  failpoint(name: string): void {
    if (this.failpoints.has(name)) throw new Error(`failpoint:${name}`);
  }

  // ---- content-free metadata -------------------------------------------
  peekJourney(id: string): JourneyMeta | null {
    const j = this.s.journeys[id];
    return j ? { patientProfileId: j.patientProfileId, status: j.status } : null;
  }
  peekCycle(id: string): CycleMeta | null {
    const c = this.s.cycles[id];
    return c ? { patientProfileId: c.patientProfileId, journeyId: c.careJourneyId, status: c.status } : null;
  }
  peekItem(id: string): ItemMeta | null {
    const i = this.s.items[id];
    return i
      ? {
          patientProfileId: i.patientProfileId,
          cycleId: i.journeyCycleId,
          visibility: i.visibility,
          status: i.status,
          authorUserId: i.authorUserId,
        }
      : null;
  }
  peekTopic(id: string): TopicMeta | null {
    const t = this.s.topics[id];
    return t ? { patientProfileId: t.patientProfileId, cycleId: t.journeyCycleId, status: t.status } : null;
  }
  journeyIdsForPatient(patientProfileId: string): string[] {
    return Object.values(this.s.journeys)
      .filter((j) => j.patientProfileId === patientProfileId)
      .map((j) => j.id);
  }

  peekCyclesOfJourney(journeyId: string) {
    return Object.values(this.s.cycles)
      .filter((c) => c.careJourneyId === journeyId)
      .map((c) => ({ id: c.id, status: c.status, sequenceNumber: c.sequenceNumber }));
  }
  peekTopicsOfCycle(cycleId: string) {
    return Object.values(this.s.topics)
      .filter((t) => t.journeyCycleId === cycleId)
      .map((t) => ({ id: t.id, status: t.status, displayOrder: t.displayOrder }));
  }

  // ---- grant-checked content ---------------------------------------------
  private need(
    grant: AccessGrant,
    category: "A" | "B",
    kind: string,
    resourceId: string,
    patientProfileId: string,
    write: boolean,
  ): void {
    requireGrant(grant, {
      category,
      action: (grant as AccessGrant | undefined)?.action ?? "read",
      resourceKind: kind,
      resourceId,
      patientProfileId,
    });
    const ok = write ? grant.action === "write" || grant.action === "submit" : true;
    if (!ok) throw new Error("clinical access denied: write requires a write grant");
  }

  private versioned<T extends { id: string; version: number }>(
    table: Record<string, T>,
    entity: T,
    expected: number | null,
  ): T {
    const existing = table[entity.id];
    if (expected === null) {
      if (existing) throw new VersionConflictError();
    } else if (!existing || existing.version !== expected) {
      throw new VersionConflictError();
    }
    const stored = { ...entity, version: (expected ?? 0) + 1 };
    table[entity.id] = stored;
    return structuredClone(stored);
  }

  getJourney(grant: AccessGrant, id: string): CareJourney | null {
    const j = this.s.journeys[id];
    if (!j) return null;
    this.need(grant, "B", RESOURCE_KINDS.journey, id, j.patientProfileId, false);
    return structuredClone(j);
  }
  listJourneys(grant: AccessGrant, patientProfileId: string): CareJourney[] {
    this.need(grant, "B", RESOURCE_KINDS.journeyList, patientProfileId, patientProfileId, false);
    return Object.values(this.s.journeys)
      .filter((j) => j.patientProfileId === patientProfileId)
      .map((j) => structuredClone(j));
  }
  putJourney(grant: AccessGrant, journey: CareJourney, expected: number | null): CareJourney {
    this.need(grant, "B", RESOURCE_KINDS.journey, journey.id, journey.patientProfileId, true);
    return this.versioned(this.s.journeys, journey, expected);
  }

  getCycle(grant: AccessGrant, id: string): JourneyCycle | null {
    const c = this.s.cycles[id];
    if (!c) return null;
    this.need(grant, "B", RESOURCE_KINDS.cycle, id, c.patientProfileId, false);
    return structuredClone(c);
  }
  listCycles(grant: AccessGrant, journeyId: string): JourneyCycle[] {
    const j = this.s.journeys[journeyId];
    if (!j) return [];
    this.need(grant, "B", RESOURCE_KINDS.cycleList, journeyId, j.patientProfileId, false);
    return Object.values(this.s.cycles)
      .filter((c) => c.careJourneyId === journeyId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      .map((c) => structuredClone(c));
  }
  putCycle(grant: AccessGrant, cycle: JourneyCycle, expected: number | null): JourneyCycle {
    this.need(grant, "B", RESOURCE_KINDS.cycle, cycle.id, cycle.patientProfileId, true);
    return this.versioned(this.s.cycles, cycle, expected);
  }

  getItem(grant: AccessGrant, id: string): PreparationItem | null {
    const i = this.s.items[id];
    if (!i) return null;
    this.need(grant, "A", RESOURCE_KINDS.item, id, i.patientProfileId, false);
    return structuredClone(i);
  }
  listOwnItems(grant: AccessGrant, cycleId: string): PreparationItem[] {
    const c = this.s.cycles[cycleId];
    if (!c) return [];
    this.need(grant, "A", RESOURCE_KINDS.itemList, cycleId, c.patientProfileId, false);
    return Object.values(this.s.items)
      .filter((i) => i.journeyCycleId === cycleId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((i) => structuredClone(i));
  }
  listSharedItems(grant: AccessGrant, cycleId: string): PreparationItem[] {
    const c = this.s.cycles[cycleId];
    if (!c) return [];
    this.need(grant, "A", RESOURCE_KINDS.itemList, cycleId, c.patientProfileId, false);
    return Object.values(this.s.items)
      .filter(
        (i) =>
          i.journeyCycleId === cycleId &&
          i.visibility === "shared_with_psychologist" &&
          i.status === "submitted",
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((i) => structuredClone(i));
  }
  putItem(grant: AccessGrant, item: PreparationItem, expected: number | null): PreparationItem {
    this.need(grant, "A", RESOURCE_KINDS.item, item.id, item.patientProfileId, true);
    return this.versioned(this.s.items, item, expected);
  }

  getTopic(grant: AccessGrant, id: string): AgendaTopic | null {
    const t = this.s.topics[id];
    if (!t) return null;
    this.need(grant, "A", RESOURCE_KINDS.topic, id, t.patientProfileId, false);
    return structuredClone(t);
  }
  listTopics(grant: AccessGrant, cycleId: string): AgendaTopic[] {
    const c = this.s.cycles[cycleId];
    if (!c) return [];
    this.need(grant, "A", RESOURCE_KINDS.topicList, cycleId, c.patientProfileId, false);
    return Object.values(this.s.topics)
      .filter((t) => t.journeyCycleId === cycleId)
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id))
      .map((t) => structuredClone(t));
  }
  putTopic(grant: AccessGrant, topic: AgendaTopic, expected: number | null): AgendaTopic {
    this.need(grant, "A", RESOURCE_KINDS.topic, topic.id, topic.patientProfileId, true);
    return this.versioned(this.s.topics, topic, expected);
  }

  reorderTopics(grant: AccessGrant, cycleId: string, orderedIds: string[]): AgendaTopic[] {
    const cycle = this.s.cycles[cycleId];
    if (!cycle) throw new Error("not_found");
    this.need(grant, "A", RESOURCE_KINDS.topicList, cycleId, cycle.patientProfileId, true);
    const live = Object.values(this.s.topics).filter(
      (t) => t.journeyCycleId === cycleId && t.status !== "removed",
    );
    const same =
      orderedIds.length === live.length &&
      new Set(orderedIds).size === orderedIds.length &&
      orderedIds.every((id) => live.some((t) => t.id === id));
    if (!same) throw new Error("reorder_must_list_every_topic_once");
    orderedIds.forEach((id, index) => {
      const t = this.s.topics[id];
      this.s.topics[id] = { ...t, displayOrder: index + 1, version: t.version + 1 };
    });
    return orderedIds.map((id) => structuredClone(this.s.topics[id]));
  }

  appendEvent(grant: AccessGrant, event: JourneyEvent, patientProfileId: string): void {
    requireGrant(grant, {
      category: (grant as AccessGrant | undefined)?.category ?? "B",
      action: (grant as AccessGrant | undefined)?.action ?? "read",
      resourceKind: (grant as AccessGrant | undefined)?.resourceKind ?? "",
      resourceId: (grant as AccessGrant | undefined)?.resourceId ?? "",
      patientProfileId,
    });
    if (grant.action !== "write" && grant.action !== "submit") {
      throw new Error("clinical access denied: events require a write grant");
    }
    this.s.events.push({ ...structuredClone(event), patientProfileId });
  }
  listEvents(grant: AccessGrant, journeyId: string): JourneyEvent[] {
    const j = this.s.journeys[journeyId];
    if (!j) return [];
    this.need(grant, "B", RESOURCE_KINDS.journey, journeyId, j.patientProfileId, false);
    return this.s.events
      .filter((e) => e.journeyId === journeyId)
      .map((e) => {
        const copy = structuredClone(e) as Partial<typeof e>;
        delete copy.patientProfileId;
        return copy as JourneyEvent;
      });
  }
}

export class InMemoryContinuityRepository implements ContinuityRepository {
  private state: State = empty();
  private queue: Promise<unknown> = Promise.resolve();
  readonly failpoints = new Set<string>();

  /** Test helper: content-free counts for assertions. */
  counts() {
    return {
      journeys: Object.keys(this.state.journeys).length,
      cycles: Object.keys(this.state.cycles).length,
      items: Object.keys(this.state.items).length,
      topics: Object.keys(this.state.topics).length,
      events: this.state.events.length,
    };
  }

  /** Test helper: a deep copy of everything, for "nothing changed" comparisons. */
  dump(): string {
    return JSON.stringify(this.state);
  }

  transaction<T>(fn: (ops: ContinuityOps) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      const working = structuredClone(this.state);
      const result = await fn(new Ops(working, this.failpoints));
      assertInvariants(this.state, working);
      this.state = working;
      return result;
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
