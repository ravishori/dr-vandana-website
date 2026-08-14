import {
  BLOCKING_STATUSES,
  TERMINAL_STATUSES,
  type AppointmentStatus,
  type HistoryEventType,
} from "@/lib/appointments/constants";
import { AppointmentDomainError } from "@/lib/appointments/errors";
import type { RoleName } from "@/lib/identity/constants";

export type AppointmentActorRole = Extract<
  RoleName,
  "PATIENT" | "PSYCHOLOGIST" | "SUPER_ADMIN" | "STAFF"
>;

export type AppointmentAction =
  | "REQUEST"
  | "CONFIRM"
  | "REJECT"
  | "CANCEL"
  | "REQUEST_RESCHEDULE"
  | "ACCEPT_RESCHEDULE"
  | "DECLINE_RESCHEDULE"
  | "RESCHEDULE"
  | "COMPLETE"
  | "NO_SHOW";

type TransitionRule = {
  from: readonly AppointmentStatus[];
  action: AppointmentAction;
  actors: readonly AppointmentActorRole[];
  to: AppointmentStatus;
  historyEvent: HistoryEventType;
};

/**
 * Valid current-status transitions.
 * RESCHEDULED is a history event only; successful reschedule returns to CONFIRMED.
 * SUPER_ADMIN has no appointment transition authority in Phase 2.
 * STAFF is reserved and has none.
 */
const TRANSITIONS: readonly TransitionRule[] = [
  {
    from: ["PENDING"],
    action: "CONFIRM",
    actors: ["PSYCHOLOGIST"],
    to: "CONFIRMED",
    historyEvent: "CONFIRMED",
  },
  {
    from: ["PENDING"],
    action: "REJECT",
    actors: ["PSYCHOLOGIST"],
    to: "REJECTED",
    historyEvent: "REJECTED",
  },
  {
    from: ["PENDING", "CONFIRMED", "RESCHEDULE_REQUESTED"],
    action: "CANCEL",
    actors: ["PATIENT", "PSYCHOLOGIST"],
    to: "CANCELLED",
    historyEvent: "CANCELLED",
  },
  {
    from: ["CONFIRMED"],
    action: "REQUEST_RESCHEDULE",
    actors: ["PATIENT"],
    to: "RESCHEDULE_REQUESTED",
    historyEvent: "RESCHEDULE_REQUESTED",
  },
  {
    from: ["RESCHEDULE_REQUESTED"],
    action: "ACCEPT_RESCHEDULE",
    actors: ["PSYCHOLOGIST"],
    to: "CONFIRMED",
    historyEvent: "RESCHEDULED",
  },
  {
    from: ["RESCHEDULE_REQUESTED"],
    action: "DECLINE_RESCHEDULE",
    actors: ["PSYCHOLOGIST"],
    to: "CONFIRMED",
    historyEvent: "CONFIRMED",
  },
  {
    from: ["CONFIRMED", "RESCHEDULE_REQUESTED"],
    action: "RESCHEDULE",
    actors: ["PSYCHOLOGIST"],
    to: "CONFIRMED",
    historyEvent: "RESCHEDULED",
  },
  {
    from: ["CONFIRMED"],
    action: "COMPLETE",
    actors: ["PSYCHOLOGIST"],
    to: "COMPLETED",
    historyEvent: "COMPLETED",
  },
  {
    from: ["CONFIRMED"],
    action: "NO_SHOW",
    actors: ["PSYCHOLOGIST"],
    to: "NO_SHOW",
    historyEvent: "NO_SHOW",
  },
];

export class AppointmentStateMachine {
  isBlocking(status: AppointmentStatus): boolean {
    return (BLOCKING_STATUSES as readonly string[]).includes(status);
  }

  isTerminal(status: AppointmentStatus): boolean {
    return (TERMINAL_STATUSES as readonly string[]).includes(status);
  }

  resolve(
    from: AppointmentStatus,
    action: AppointmentAction,
    actor: AppointmentActorRole,
  ): TransitionRule {
    const rule = TRANSITIONS.find(
      (candidate) =>
        candidate.action === action &&
        candidate.from.includes(from) &&
        candidate.actors.includes(actor),
    );
    if (!rule) {
      throw new AppointmentDomainError(
        "INVALID_TRANSITION",
        "That action is not available for this appointment.",
      );
    }
    return rule;
  }

  availableActions(
    from: AppointmentStatus,
    actor: AppointmentActorRole,
  ): AppointmentAction[] {
    return TRANSITIONS.filter(
      (candidate) =>
        candidate.from.includes(from) && candidate.actors.includes(actor),
    ).map((candidate) => candidate.action);
  }
}

export const appointmentStateMachine = new AppointmentStateMachine();
