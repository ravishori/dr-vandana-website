import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";

export type CivilTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "0";
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
}

export function instantToZonedCivil(
  instant: Date,
  timeZone: string = PRACTICE_TIMEZONE,
): CivilTime {
  const parts = formatter(timeZone).formatToParts(instant);
  return {
    year: Number(partValue(parts, "year")),
    month: Number(partValue(parts, "month")),
    day: Number(partValue(parts, "day")),
    hour: Number(partValue(parts, "hour")),
    minute: Number(partValue(parts, "minute")),
    second: Number(partValue(parts, "second")),
  };
}

/**
 * Convert a civil wall-clock time in `timeZone` to a UTC instant.
 * Uses the IANA timezone database via Intl — not a hard-coded +05:30 offset.
 */
export function zonedCivilToUtc(
  civil: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  },
  timeZone: string = PRACTICE_TIMEZONE,
): Date {
  const hour = civil.hour ?? 0;
  const minute = civil.minute ?? 0;
  const second = civil.second ?? 0;
  const utcGuess = Date.UTC(
    civil.year,
    civil.month - 1,
    civil.day,
    hour,
    minute,
    second,
  );
  const offsetMs = getTimeZoneOffsetMs(utcGuess, timeZone);
  const adjusted = utcGuess - offsetMs;
  const verifyOffset = getTimeZoneOffsetMs(adjusted, timeZone);
  if (verifyOffset !== offsetMs) {
    return new Date(utcGuess - verifyOffset);
  }
  return new Date(adjusted);
}

function getTimeZoneOffsetMs(utcInstant: number, timeZone: string): number {
  const zoned = instantToZonedCivil(new Date(utcInstant), timeZone);
  const asUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  return asUtc - utcInstant;
}

export function parseLocalDate(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = zonedCivilToUtc({ year, month, day }, PRACTICE_TIMEZONE);
  const civil = instantToZonedCivil(probe, PRACTICE_TIMEZONE);
  if (civil.year !== year || civil.month !== month || civil.day !== day) {
    return null;
  }
  return { year, month, day };
}

export function formatLocalDate(
  instant: Date,
  timeZone: string = PRACTICE_TIMEZONE,
): string {
  const civil = instantToZonedCivil(instant, timeZone);
  return `${String(civil.year).padStart(4, "0")}-${String(civil.month).padStart(2, "0")}-${String(civil.day).padStart(2, "0")}`;
}

export function parseLocalTime(value: string): {
  hour: number;
  minute: number;
  second: number;
} | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? "0");
  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  return { hour, minute, second };
}

export function isoWeekdayInZone(
  localDate: { year: number; month: number; day: number },
  timeZone: string = PRACTICE_TIMEZONE,
): number {
  const instant = zonedCivilToUtc(localDate, timeZone);
  const weekday = formatter(timeZone)
    .formatToParts(instant)
    .find((part) => part.type === "weekday")?.value;
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday ?? ""] ?? 0;
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60_000);
}

export function startOfLocalDay(
  localDate: { year: number; month: number; day: number },
  timeZone: string = PRACTICE_TIMEZONE,
): Date {
  return zonedCivilToUtc({ ...localDate, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function endOfLocalDay(
  localDate: { year: number; month: number; day: number },
  timeZone: string = PRACTICE_TIMEZONE,
): Date {
  return zonedCivilToUtc(
    { ...localDate, hour: 23, minute: 59, second: 59 },
    timeZone,
  );
}

/** Exclusive end of a local calendar day: midnight at the start of the next day. */
export function startOfNextLocalDay(
  localDate: { year: number; month: number; day: number },
  timeZone: string = PRACTICE_TIMEZONE,
): Date {
  return startOfLocalDay(addLocalDays(localDate, 1), timeZone);
}

export function isCivilDateAfter(
  left: { year: number; month: number; day: number },
  right: { year: number; month: number; day: number },
): boolean {
  if (left.year !== right.year) {
    return left.year > right.year;
  }
  if (left.month !== right.month) {
    return left.month > right.month;
  }
  return left.day > right.day;
}

export function addLocalDays(
  localDate: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const utc = Date.UTC(localDate.year, localDate.month - 1, localDate.day + days);
  const date = new Date(utc);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function formatPracticeDateTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: PRACTICE_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instant);
}

export function formatPracticeTime(instant: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: PRACTICE_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}
