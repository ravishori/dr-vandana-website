/**
 * ANALYSIS ONLY - NOT WIRED INTO ANY PRODUCT PATH, NOT SELECTED, NOT APPROVED.
 *
 * Alternative readings of the PROPOSED "within one business day" intake-review
 * target (register OD-H1, sub-decision OD-H1c). The owner has not chosen one.
 * The implemented default stays `computeIntakeReviewDue` (interpretation A).
 * Each function is calendar-only: it never looks at what a patient wrote.
 * None of these is an emergency response guarantee or a clinical safety SLA.
 */
import {
  APPROVED_PRACTICE_SCHEDULE,
  addWorkingMinutes,
  clockStart,
  workingMinutesPerDay,
  type DeclaredHolidays,
  type PracticeSchedule,
} from "@/lib/practice-schedule/schedule";
import { instantToZonedCivil, zonedCivilToUtc } from "@/lib/appointments/timezone";

export type DueInterpretation = (
  submittedAt: Date,
  schedule?: PracticeSchedule,
  holidays?: DeclaredHolidays,
) => Date;

const closeOf = (instant: Date, schedule: PracticeSchedule): Date => {
  const c = instantToZonedCivil(instant, schedule.timeZone);
  return zonedCivilToUtc(
    {
      year: c.year,
      month: c.month,
      day: c.day,
      hour: Math.floor(schedule.closeMinute / 60),
      minute: schedule.closeMinute % 60,
      second: 0,
    },
    schedule.timeZone,
  );
};

const isInside = (t: Date, start: Date) => start.getTime() === t.getTime();

/** A (implemented default): add one working period (9 working hours). */
export const interpretationA: DueInterpretation = (
  t,
  schedule = APPROVED_PRACTICE_SCHEDULE,
  holidays = new Set(),
) =>
  addWorkingMinutes(
    clockStart(t, schedule, holidays),
    workingMinutesPerDay(schedule),
    schedule,
    holidays,
  );

/**
 * B: same clock time on the next operating day when submitted inside a
 * working period; end of the next working period when submitted outside.
 */
export const interpretationB: DueInterpretation = (
  t,
  schedule = APPROVED_PRACTICE_SCHEDULE,
  holidays = new Set(),
) => {
  const start = clockStart(t, schedule, holidays);
  if (!isInside(t, start)) return closeOf(start, schedule);
  // Same wall-clock time on the next operating day: step one working period
  // from the start of the day, then re-apply the time of day.
  const next = clockStart(
    new Date(closeOf(t, schedule).getTime() + 1000),
    schedule,
    holidays,
  ); // opening of the next operating day
  const c = instantToZonedCivil(t, schedule.timeZone);
  const n = instantToZonedCivil(next, schedule.timeZone);
  return zonedCivilToUtc(
    { year: n.year, month: n.month, day: n.day, hour: c.hour, minute: c.minute, second: c.second },
    schedule.timeZone,
  );
};

/** C: close of the next operating day's working period (always the end of a day). */
export const interpretationC: DueInterpretation = (
  t,
  schedule = APPROVED_PRACTICE_SCHEDULE,
  holidays = new Set(),
) => {
  const start = clockStart(t, schedule, holidays);
  if (!isInside(t, start)) return closeOf(start, schedule);
  const next = clockStart(
    new Date(closeOf(t, schedule).getTime() + 1000),
    schedule,
    holidays,
  );
  return closeOf(next, schedule);
};

/** D: close of business of the current/next working period (shortest reading). */
export const interpretationD: DueInterpretation = (
  t,
  schedule = APPROVED_PRACTICE_SCHEDULE,
  holidays = new Set(),
) => closeOf(clockStart(t, schedule, holidays), schedule);

export const INTERPRETATIONS: Record<string, DueInterpretation> = {
  A: interpretationA,
  B: interpretationB,
  C: interpretationC,
  D: interpretationD,
};
