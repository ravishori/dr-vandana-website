import type { AccessGrant } from "@/lib/clinical-access";
import type {
  AgendaTopic,
  CareJourney,
  JourneyCycle,
  JourneyEvent,
  PreparationItem,
  PreparationVisibility,
  PreparationStatus,
  CycleStatus,
  JourneyStatus,
  TopicStatus,
} from "@/lib/continuity/types";

/** Resource kinds used in access requests and checked against grants. */
export const RESOURCE_KINDS = {
  journey: "care_journey",
  cycle: "journey_cycle",
  item: "preparation_item",
  itemList: "preparation_item_list",
  topic: "agenda_topic",
  topicList: "agenda_topic_list",
  journeyList: "care_journey_list",
  cycleList: "journey_cycle_list",
} as const;

export class VersionConflictError extends Error {
  constructor() {
    super("version_conflict");
  }
}

/** Content-free metadata, only for building access requests. Never exported from the module index. */
export type JourneyMeta = { patientProfileId: string; status: JourneyStatus };
export type CycleMeta = { patientProfileId: string; journeyId: string; status: CycleStatus };
export type ItemMeta = {
  patientProfileId: string;
  cycleId: string;
  visibility: PreparationVisibility;
  status: PreparationStatus;
  authorUserId: string;
};
export type TopicMeta = { patientProfileId: string; cycleId: string; status: TopicStatus };

/**
 * Every method that returns or changes content takes the AccessGrant issued by
 * the central clinical access guard and verifies it. A method without a grant
 * can only expose the content-free metadata above.
 */
export interface ContinuityOps {
  peekJourney(id: string): JourneyMeta | null;
  peekCycle(id: string): CycleMeta | null;
  peekItem(id: string): ItemMeta | null;
  peekTopic(id: string): TopicMeta | null;
  /** Metadata for lookups where only the owning patient is known. */
  journeyIdsForPatient(patientProfileId: string): string[];
  peekCyclesOfJourney(journeyId: string): { id: string; status: CycleStatus; sequenceNumber: number }[];
  peekTopicsOfCycle(cycleId: string): { id: string; status: TopicStatus; displayOrder: number }[];

  getJourney(grant: AccessGrant, id: string): CareJourney | null;
  listJourneys(grant: AccessGrant, patientProfileId: string): CareJourney[];
  putJourney(grant: AccessGrant, journey: CareJourney, expectedVersion: number | null): CareJourney;

  getCycle(grant: AccessGrant, id: string): JourneyCycle | null;
  listCycles(grant: AccessGrant, journeyId: string): JourneyCycle[];
  putCycle(grant: AccessGrant, cycle: JourneyCycle, expectedVersion: number | null): JourneyCycle;

  getItem(grant: AccessGrant, id: string): PreparationItem | null;
  /** Patient's own view: every item in the cycle, including private drafts. */
  listOwnItems(grant: AccessGrant, cycleId: string): PreparationItem[];
  /** Psychologist's view: ONLY submitted items shared with the psychologist. Private items are never loaded. */
  listSharedItems(grant: AccessGrant, cycleId: string): PreparationItem[];
  putItem(grant: AccessGrant, item: PreparationItem, expectedVersion: number | null): PreparationItem;

  getTopic(grant: AccessGrant, id: string): AgendaTopic | null;
  listTopics(grant: AccessGrant, cycleId: string): AgendaTopic[];
  putTopic(grant: AccessGrant, topic: AgendaTopic, expectedVersion: number | null): AgendaTopic;
  /** Grant bound to the cycle's topic list. Ids must be exactly the non-removed topics. */
  reorderTopics(grant: AccessGrant, cycleId: string, orderedIds: string[]): AgendaTopic[];

  appendEvent(grant: AccessGrant, event: JourneyEvent, patientProfileId: string): void;
  listEvents(grant: AccessGrant, journeyId: string): JourneyEvent[];
  /** Test hook: arm a failpoint that throws inside a transaction. */
  failpoint(name: string): void;
}

export interface ContinuityRepository {
  /** All writes in `fn` commit together or not at all; transactions run one at a time. */
  transaction<T>(fn: (ops: ContinuityOps) => Promise<T>): Promise<T>;
}
