/**
 * Continuity Loop - domain contracts, Increment 1 (journey shell).
 *
 * Source: Continuity Loop PRD v1.0 (sections 4.1-4.4, 6.1-6.2). Logical model
 * only: no tables, no routes, no UI. Goals, practice assignments, reflections
 * and review records are deliberately NOT part of this increment.
 *
 * The system records events and preferences. It does not infer diagnoses,
 * risk, motivation, recovery or clinical progress, and it never reads patient
 * free text for meaning.
 */
export const JOURNEY_STATUSES = ["active", "paused", "closed"] as const;
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

/**
 * PRD 4.2 lists six statuses; PRD 6.2 also uses `review_incomplete`. The
 * extra state is included because the lifecycle needs it. FLAGGED for owner
 * confirmation (the PRD enum and lifecycle disagree).
 */
export const CYCLE_STATUSES = [
  "preparation",
  "consultation",
  "practice",
  "review_due",
  "review_incomplete",
  "reviewed",
  "cancelled",
] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const PREPARATION_ITEM_TYPES = [
  "concern",
  "question",
  "topic",
  "experience",
  "carry_forward",
] as const;
export type PreparationItemType = (typeof PREPARATION_ITEM_TYPES)[number];

export type PreparationVisibility = "private" | "shared_with_psychologist";
export type PreparationStatus = "draft" | "submitted" | "withdrawn";

export const TOPIC_SOURCES = ["patient_preparation", "psychologist", "carried_forward"] as const;
export type TopicSource = (typeof TOPIC_SOURCES)[number];

export const TOPIC_STATUSES = [
  "proposed",
  "accepted",
  "discussed",
  "partially_discussed",
  "deferred",
  "removed",
] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

export type CareJourney = {
  id: string;
  patientProfileId: string;
  careRelationshipId: string;
  status: JourneyStatus;
  startedAt: string;
  closedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export type JourneyCycle = {
  id: string;
  careJourneyId: string;
  /** Denormalised so ownership can be checked without a join. */
  patientProfileId: string;
  sequenceNumber: number;
  status: CycleStatus;
  /** A link only; an appointment's status never decides the cycle's status. */
  linkedAppointmentId: string | null;
  startedAt: string;
  consultationAt: string | null;
  reviewedAt: string | null;
  createdBy: string;
  createdAt: string;
  version: number;
};

/** Patient-reported content. Never edited by anyone but its author, and only while a draft. */
export type PreparationItem = {
  id: string;
  journeyCycleId: string;
  patientProfileId: string;
  authorUserId: string;
  itemType: PreparationItemType;
  content: string;
  visibility: PreparationVisibility;
  status: PreparationStatus;
  provenance: "patient_reported";
  createdAt: string;
  updatedAt: string;
  sharedAt: string | null;
  withdrawnAt: string | null;
  version: number;
};

export type AgendaTopic = {
  id: string;
  journeyCycleId: string;
  patientProfileId: string;
  createdBy: string;
  source: TopicSource;
  /** Set when the topic was made from a shared preparation item; the item itself is never altered. */
  sourcePreparationItemId: string | null;
  /** Set when carried forward from an earlier cycle's topic. */
  carriedFromTopicId: string | null;
  title: string;
  description: string | null;
  status: TopicStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  version: number;
};

export const EVENT_TYPES = [
  "journey_created",
  "journey_status_changed",
  "cycle_started",
  "cycle_status_changed",
  "preparation_item_created",
  "preparation_item_edited",
  "preparation_item_shared",
  "preparation_item_withdrawn",
  "agenda_topic_created",
  "agenda_topic_status_changed",
  "agenda_topics_reordered",
  "agenda_topic_carried_forward",
] as const;
export type JourneyEventType = (typeof EVENT_TYPES)[number];

export type JourneyEvent = {
  id: string;
  journeyId: string;
  cycleId: string | null;
  actorUserId: string;
  eventType: JourneyEventType;
  entityType: "journey" | "cycle" | "preparation_item" | "agenda_topic";
  entityId: string;
  occurredAt: string;
  /** Enumerated, non-sensitive values only. Never free text, names or contact details. */
  metadata: Record<string, string | number | boolean>;
  correlationId: string;
};

export type ContinuityFlags = {
  /** Master switch. Default false; nothing in this module works while disabled. */
  enabled: boolean;
};

export const DEFAULT_CONTINUITY_FLAGS: ContinuityFlags = { enabled: false };

export function continuityFlagsFromEnv(env: Record<string, string | undefined>): ContinuityFlags {
  return { enabled: env.CONTINUITY_LOOP_ENABLED === "true" };
}
