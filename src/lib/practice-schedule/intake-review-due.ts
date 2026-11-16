/**
 * Intake-review due-time calculation.
 *
 * The review TARGETS are PROPOSED, pending the owner's confirmation
 * (register OD-H1). They are operational review targets, NOT emergency
 * response guarantees and NOT clinical safety SLAs, and must never be
 * presented to patients as such. The due time depends only on calendar facts
 * (submission time, schedule, declared holidays, consultation time) and
 * never on anything the patient wrote.
 *
 * Open sub-decisions kept configurable instead of decided here:
 *  - OD-H1a: for a distant consultation, whether the one-business-day target
 *    also applies ("earlier_of").
 */
import {
  APPROVED_PRACTICE_SCHEDULE,
  addWorkingMinutes,
  clockStart,
  workingMinutesPerDay,
  type DeclaredHolidays,
  type PracticeSchedule,
} from "@/lib/practice-schedule/schedule";

export const INTAKE_REVIEW_TARGET_STATUS = "PROPOSED_PENDING_OWNER_CONFIRMATION" as const;

export type AppointmentDueRule =
  | "consultation_start"
  | "earlier_of_consultation_and_business_day";

export type IntakeReviewDueInput = {
  submittedAt: Date;
  /** Start of an already scheduled consultation for this patient, if any. */
  consultationStart?: Date | null;
};

export type IntakeReviewDueOptions = {
  schedule?: PracticeSchedule;
  holidays?: DeclaredHolidays;
  appointmentRule?: AppointmentDueRule;
};

export type IntakeReviewDue = {
  dueAt: Date;
  rule:
    | "before_consultation"
    | "one_business_day"
    | "next_working_period"
    | "earlier_of_consultation_and_business_day";
  /** Instant from which working time was counted. */
  clockStartedAt: Date;
};

export function computeIntakeReviewDue(
  input: IntakeReviewDueInput,
  options: IntakeReviewDueOptions = {},
): IntakeReviewDue {
  const schedule = options.schedule ?? APPROVED_PRACTICE_SCHEDULE;
  const holidays = options.holidays ?? new Set<string>();
  const appointmentRule = options.appointmentRule ?? "consultation_start";

  const start = clockStart(input.submittedAt, schedule, holidays);
  const insideAtSubmission = start.getTime() === input.submittedAt.getTime();
  const businessDayDue = addWorkingMinutes(
    start,
    workingMinutesPerDay(schedule),
    schedule,
    holidays,
  );
  const businessRule = insideAtSubmission ? "one_business_day" : "next_working_period";

  const consultation = input.consultationStart ?? null;
  const hasFutureConsultation =
    consultation !== null && consultation.getTime() > input.submittedAt.getTime();

  if (!hasFutureConsultation) {
    return { dueAt: businessDayDue, rule: businessRule, clockStartedAt: start };
  }

  if (appointmentRule === "earlier_of_consultation_and_business_day") {
    const dueAt =
      consultation.getTime() < businessDayDue.getTime() ? consultation : businessDayDue;
    return {
      dueAt,
      rule: "earlier_of_consultation_and_business_day",
      clockStartedAt: start,
    };
  }

  return { dueAt: consultation, rule: "before_consultation", clockStartedAt: start };
}
