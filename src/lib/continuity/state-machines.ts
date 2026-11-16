import type {
  CycleStatus,
  JourneyStatus,
  TopicStatus,
} from "@/lib/continuity/types";

/** PRD 6.1. Closed is terminal here: reopening needs an approved policy (open). */
export const JOURNEY_TRANSITIONS: Record<JourneyStatus, readonly JourneyStatus[]> = {
  active: ["paused", "closed"],
  paused: ["active", "closed"],
  closed: [],
};

/**
 * PRD 6.2. `reviewed` is reachable only through an explicit psychologist review
 * action (ReviewRecord, a later increment). It is listed so the table matches
 * the PRD, but `ACTION_DRIVEN_CYCLE_TRANSITIONS` withholds it from this module.
 */
export const CYCLE_TRANSITIONS: Record<CycleStatus, readonly CycleStatus[]> = {
  preparation: ["consultation", "cancelled"],
  consultation: ["practice", "review_incomplete"],
  practice: ["review_due", "review_incomplete"],
  review_due: ["reviewed"],
  review_incomplete: ["reviewed"],
  reviewed: [],
  cancelled: [],
};

/** Transitions this increment lets a psychologist perform directly (never to `reviewed`). */
export function actionDrivenCycleTargets(from: CycleStatus): readonly CycleStatus[] {
  return CYCLE_TRANSITIONS[from].filter((to) => to !== "reviewed");
}

export const TERMINAL_CYCLE_STATUSES: readonly CycleStatus[] = ["reviewed", "cancelled"];

export const TOPIC_TRANSITIONS: Record<TopicStatus, readonly TopicStatus[]> = {
  proposed: ["accepted", "deferred", "removed"],
  accepted: ["discussed", "partially_discussed", "deferred", "removed"],
  partially_discussed: ["discussed", "deferred"],
  deferred: ["accepted", "removed"],
  discussed: [],
  removed: [],
};

/** Topic statuses that record what happened in the consultation (workflow only). */
export const CONSULTATION_TOPIC_STATUSES: readonly TopicStatus[] = ["discussed", "partially_discussed"];

/** Cycle statuses in which a consultation has been recorded as started. */
export const CONSULTATION_OR_LATER: readonly CycleStatus[] = [
  "consultation",
  "practice",
  "review_due",
  "review_incomplete",
];

export function canTransition<S extends string>(
  table: Record<S, readonly S[]>,
  from: S,
  to: S,
): boolean {
  return table[from]?.includes(to) ?? false;
}
