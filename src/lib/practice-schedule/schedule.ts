/**
 * Practice operating schedule and working-time arithmetic.
 *
 * APPROVED by the owner (register OD-H2, 2026-11-16): Monday to Sunday,
 * 9:00 AM to 6:00 PM, Asia/Kolkata, no regular weekly holiday; a date is a
 * holiday only when the practice declares it.
 *
 * Pure functions: no database, no clock access, no clinical data.
 * The review TARGETS that use this schedule (see intake-review-due.ts) are
 * still PROPOSED (OD-H1) and are therefore kept in separate, configurable code.
 */
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import {
  formatLocalDate,
  instantToZonedCivil,
  zonedCivilToUtc,
} from "@/lib/appointments/timezone";

export type PracticeSchedule = {
  timeZone: string;
  /** Minutes after local midnight when the working period starts (inclusive). */
  openMinute: number;
  /** Minutes after local midnight when the working period ends (exclusive). */
  closeMinute: number;
  /** ISO weekdays that are operating days: 1 = Monday ... 7 = Sunday. */
  operatingWeekdays: readonly number[];
};

export const APPROVED_PRACTICE_SCHEDULE: PracticeSchedule = {
  timeZone: PRACTICE_TIMEZONE,
  openMinute: 9 * 60,
  closeMinute: 18 * 60,
  operatingWeekdays: [1, 2, 3, 4, 5, 6, 7],
};

/** Declared holidays as local calendar dates, "YYYY-MM-DD". */
export type DeclaredHolidays = ReadonlySet<string>;

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_SKIP_DAYS = 400;
const DAY_MS = 86_400_000;

type DayNumber = number; // whole days since 1970-01-01 (local calendar day)

function dayNumber(year: number, month: number, day: number): DayNumber {
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

function dayParts(dayNo: DayNumber): { year: number; month: number; day: number } {
  const d = new Date(dayNo * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dayKey(dayNo: DayNumber): string {
  const p = dayParts(dayNo);
  return `${String(p.year).padStart(4, "0")}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** ISO weekday (1 = Monday ... 7 = Sunday) for a local day number. */
function isoWeekday(dayNo: DayNumber): number {
  // 1970-01-01 was a Thursday (ISO 4).
  return ((((dayNo + 3) % 7) + 7) % 7) + 1;
}

export function parseHolidayList(dates: readonly string[]): DeclaredHolidays {
  const out = new Set<string>();
  for (const value of dates) {
    const match = DATE_KEY.exec(value);
    if (!match) {
      throw new Error(`invalid holiday date: expected YYYY-MM-DD`);
    }
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const n = dayNumber(y, m, d);
    if (dayKey(n) !== value) {
      throw new Error(`invalid holiday date: not a real calendar date`);
    }
    out.add(value);
  }
  return out;
}

export function isOperatingDay(
  dayNo: DayNumber,
  schedule: PracticeSchedule,
  holidays: DeclaredHolidays,
): boolean {
  return (
    schedule.operatingWeekdays.includes(isoWeekday(dayNo)) &&
    !holidays.has(dayKey(dayNo))
  );
}

function localDayOf(instant: Date, schedule: PracticeSchedule): {
  dayNo: DayNumber;
  secondOfDay: number;
} {
  const c = instantToZonedCivil(instant, schedule.timeZone);
  return {
    dayNo: dayNumber(c.year, c.month, c.day),
    secondOfDay: c.hour * 3600 + c.minute * 60 + c.second,
  };
}

function instantAt(dayNo: DayNumber, secondOfDay: number, schedule: PracticeSchedule): Date {
  const p = dayParts(dayNo);
  return zonedCivilToUtc(
    {
      ...p,
      hour: Math.floor(secondOfDay / 3600),
      minute: Math.floor((secondOfDay % 3600) / 60),
      second: secondOfDay % 60,
    },
    schedule.timeZone,
  );
}

function nextOperatingDay(
  fromExclusive: DayNumber,
  schedule: PracticeSchedule,
  holidays: DeclaredHolidays,
): DayNumber {
  for (let i = 1; i <= MAX_SKIP_DAYS; i += 1) {
    const candidate = fromExclusive + i;
    if (isOperatingDay(candidate, schedule, holidays)) {
      return candidate;
    }
  }
  throw new Error("no operating day found within 400 days: check schedule and holidays");
}

/**
 * First instant at or after `t` that lies inside a working period.
 * Inside a working period -> `t`. Before opening on an operating day -> that
 * day's opening. After closing, or on a non-operating day -> opening of the
 * next operating day.
 */
export function clockStart(
  t: Date,
  schedule: PracticeSchedule = APPROVED_PRACTICE_SCHEDULE,
  holidays: DeclaredHolidays = new Set(),
): Date {
  const { dayNo, secondOfDay } = localDayOf(t, schedule);
  const open = schedule.openMinute * 60;
  const close = schedule.closeMinute * 60;
  if (isOperatingDay(dayNo, schedule, holidays)) {
    if (secondOfDay >= open && secondOfDay < close) {
      return t;
    }
    if (secondOfDay < open) {
      return instantAt(dayNo, open, schedule);
    }
  }
  return instantAt(nextOperatingDay(dayNo, schedule, holidays), open, schedule);
}

/**
 * Advance `start` by `minutes` of working time. `start` must itself be inside
 * a working period (use `clockStart` first). A result that lands exactly on
 * closing time is returned as that closing instant.
 */
export function addWorkingMinutes(
  start: Date,
  minutes: number,
  schedule: PracticeSchedule = APPROVED_PRACTICE_SCHEDULE,
  holidays: DeclaredHolidays = new Set(),
): Date {
  if (!Number.isFinite(minutes) || minutes < 0) {
    throw new Error("minutes must be a non-negative number");
  }
  const open = schedule.openMinute * 60;
  const close = schedule.closeMinute * 60;
  let { dayNo, secondOfDay } = localDayOf(start, schedule);
  if (
    !isOperatingDay(dayNo, schedule, holidays) ||
    secondOfDay < open ||
    secondOfDay >= close
  ) {
    throw new Error("start must be inside a working period; call clockStart first");
  }
  let remaining = minutes * 60;
  for (let guard = 0; guard <= MAX_SKIP_DAYS; guard += 1) {
    const available = close - secondOfDay;
    if (remaining <= available) {
      return instantAt(dayNo, secondOfDay + remaining, schedule);
    }
    remaining -= available;
    dayNo = nextOperatingDay(dayNo, schedule, holidays);
    secondOfDay = open;
  }
  throw new Error("working-time calculation did not converge");
}

export function workingMinutesPerDay(schedule: PracticeSchedule): number {
  return schedule.closeMinute - schedule.openMinute;
}

export function localDateKey(instant: Date, schedule: PracticeSchedule): string {
  return formatLocalDate(instant, schedule.timeZone);
}
