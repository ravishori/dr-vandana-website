import {
  APPOINTMENT_SAFE_MESSAGES,
  PRACTICE_TIMEZONE,
  PUBLIC_APPOINTMENT_TYPE_ID_PATTERN,
  type AvailabilityExceptionKind,
} from "@/lib/appointments/constants";
import { AppointmentDomainError, safeAvailabilityFailure } from "@/lib/appointments/errors";
import {
  hasBlockingOccupiedOverlap,
  loadBlockingOccupiedRanges,
} from "@/lib/appointments/occupancy";
import {
  appointmentTypes,
  availabilityExceptions,
  practiceAppointmentSettings,
  practiceHourBreaks,
  practiceHours,
} from "@/lib/appointments/schema";
import {
  addLocalDays,
  addMinutes,
  formatLocalDate,
  isCivilDateAfter,
  isoWeekdayInZone,
  parseLocalDate,
  parseLocalTime,
  startOfLocalDay,
  startOfNextLocalDay,
  zonedCivilToUtc,
} from "@/lib/appointments/timezone";
import type { IdentityContext } from "@/lib/identity/context";
import { eq, inArray } from "drizzle-orm";
import { logStructured } from "@/lib/observability/logger";

/**
 * Interval semantics: half-open `[start, end)`.
 * A slot may end exactly at closing time. Adjacent appointments that meet
 * at an instant do not overlap. Occupied ranges from buffers use the same
 * bounds when checked with PostgreSQL `tstzrange(..., '[)')`.
 */
export const SLOT_INTERVAL_BOUNDS = "[start, end)" as const;

export type PracticeHourInput = {
  dayOfWeek: number;
  opensLocal: string;
  closesLocal: string;
  active: boolean;
  breaks: { startsLocal: string; endsLocal: string }[];
};

export type AvailabilityExceptionInput = {
  kind: AvailabilityExceptionKind;
  localDate: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  opensLocal: string | null;
  closesLocal: string | null;
};

export type OccupiedRange = { start: Date; end: Date };

export type GeneratedSlot = {
  startsAt: Date;
  endsAt: Date;
  occupiedStartsAt: Date;
  occupiedEndsAt: Date;
};

export type SlotGenerationInput = {
  dateLocal: string;
  timeZone?: string;
  now: Date;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  slotGranularityMinutes: number | null;
  minimumNoticeMinutes: number | null;
  maximumAdvanceDays: number | null;
  hours: PracticeHourInput[];
  exceptions: AvailabilityExceptionInput[];
  blockingOccupied: OccupiedRange[];
};

export type Interval = { start: Date; end: Date };

export type AvailableSlotView = {
  start: string;
  end: string;
};

export type AvailableSlotsResult =
  | {
      ok: true;
      date: string;
      timezone: typeof PRACTICE_TIMEZONE | string;
      appointmentType: {
        publicId: string;
        name: string;
        durationMinutes: number;
      };
      slots: AvailableSlotView[];
    }
  | { ok: false; message: string; code: string };

export type PracticeAvailabilityResult =
  | {
      ok: true;
      date: string;
      timezone: string;
      windows: AvailableSlotView[];
    }
  | { ok: false; message: string; code: string };

export type SlotAvailabilityResult =
  | { ok: true; available: true; start: string; end: string }
  | { ok: true; available: false; reason: string }
  | { ok: false; message: string; code: string };

type LocalHm = { hour: number; minute: number };

function toHm(value: string): LocalHm | null {
  const parsed = parseLocalTime(value);
  if (!parsed) {
    return null;
  }
  return { hour: parsed.hour, minute: parsed.minute };
}

function civilAt(
  date: { year: number; month: number; day: number },
  hm: LocalHm,
  timeZone: string,
): Date {
  return zonedCivilToUtc(
    { ...date, hour: hm.hour, minute: hm.minute, second: 0 },
    timeZone,
  );
}

function dateKeyOf(date: { year: number; month: number; day: number }): string {
  return `${String(date.year).padStart(4, "0")}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

/**
 * Half-open overlap: `[a, b)` overlaps `[c, d)` iff a < d && c < b.
 * Instant comparisons only — not string ordering.
 */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

export function subtractIntervals(
  windows: Interval[],
  holes: Interval[],
): Interval[] {
  let current = windows.filter((window) => window.start < window.end);
  for (const hole of holes) {
    const next: Interval[] = [];
    for (const window of current) {
      if (!intervalsOverlap(window, hole)) {
        next.push(window);
        continue;
      }
      if (window.start < hole.start) {
        next.push({
          start: window.start,
          end: hole.start < window.end ? hole.start : window.end,
        });
      }
      if (hole.end < window.end) {
        next.push({
          start: hole.end > window.start ? hole.end : window.start,
          end: window.end,
        });
      }
    }
    current = next.filter((window) => window.start < window.end);
  }
  return current.sort((left, right) => left.start.getTime() - right.start.getTime());
}

/**
 * Exception priority (deterministic):
 * 1. FULL_DAY_CLOSURE on the local date → no windows.
 * 2. Else CUSTOM_AVAILABILITY on the local date replaces weekday hours
 *    (union of custom windows; weekday breaks are not applied).
 * 3. Else active weekday practice hours, then subtract that day's breaks.
 * 4. UNAVAILABLE_PERIOD always subtracts from the resolved windows.
 */
export function resolvePracticeWindows(
  date: { year: number; month: number; day: number },
  input: Pick<SlotGenerationInput, "hours" | "exceptions">,
  timeZone: string,
): Interval[] {
  const dateKey = dateKeyOf(date);
  const closed = input.exceptions.some(
    (exception) =>
      exception.kind === "FULL_DAY_CLOSURE" && exception.localDate === dateKey,
  );
  if (closed) {
    return [];
  }

  const custom = input.exceptions.filter(
    (exception) =>
      exception.kind === "CUSTOM_AVAILABILITY" && exception.localDate === dateKey,
  );
  let windows: Interval[] = [];
  if (custom.length > 0) {
    windows = custom
      .map((exception) => {
        if (!exception.opensLocal || !exception.closesLocal) {
          return null;
        }
        const opens = toHm(exception.opensLocal);
        const closes = toHm(exception.closesLocal);
        if (!opens || !closes) {
          return null;
        }
        const start = civilAt(date, opens, timeZone);
        const end = civilAt(date, closes, timeZone);
        if (!(start < end)) {
          return null;
        }
        return { start, end };
      })
      .filter((row): row is Interval => row !== null);
  } else {
    const weekday = isoWeekdayInZone(date, timeZone);
    const hours = input.hours.find(
      (row) => row.dayOfWeek === weekday && row.active,
    );
    if (!hours) {
      return [];
    }
    const opens = toHm(hours.opensLocal);
    const closes = toHm(hours.closesLocal);
    if (!opens || !closes) {
      return [];
    }
    windows = [{ start: civilAt(date, opens, timeZone), end: civilAt(date, closes, timeZone) }];
    const breaks = hours.breaks
      .map((row) => {
        const start = toHm(row.startsLocal);
        const end = toHm(row.endsLocal);
        if (!start || !end) {
          return null;
        }
        return {
          start: civilAt(date, start, timeZone),
          end: civilAt(date, end, timeZone),
        };
      })
      .filter((row): row is Interval => row !== null);
    windows = subtractIntervals(windows, breaks);
  }

  const unavailable = input.exceptions
    .filter((exception) => exception.kind === "UNAVAILABLE_PERIOD")
    .map((exception) => {
      if (!exception.startsAt || !exception.endsAt) {
        return null;
      }
      return { start: exception.startsAt, end: exception.endsAt };
    })
    .filter((row): row is Interval => row !== null);
  return subtractIntervals(windows, unavailable);
}

function slotFitsWindow(slotStart: Date, slotEnd: Date, window: Interval): boolean {
  return slotStart >= window.start && slotEnd <= window.end;
}

export class AvailabilityService {
  generateWindows(input: SlotGenerationInput): Interval[] {
    const timeZone = input.timeZone ?? PRACTICE_TIMEZONE;
    const date = parseLocalDate(input.dateLocal);
    if (!date) {
      return [];
    }
    return resolvePracticeWindows(date, input, timeZone);
  }

  generateSlots(input: SlotGenerationInput): GeneratedSlot[] {
    const timeZone = input.timeZone ?? PRACTICE_TIMEZONE;
    if (
      input.slotGranularityMinutes === null ||
      input.slotGranularityMinutes <= 0 ||
      input.durationMinutes <= 0
    ) {
      return [];
    }
    const date = parseLocalDate(input.dateLocal);
    if (!date) {
      return [];
    }

    if (input.maximumAdvanceDays !== null) {
      const today = parseLocalDate(formatLocalDate(input.now, timeZone));
      if (today) {
        const limit = addLocalDays(today, input.maximumAdvanceDays);
        if (isCivilDateAfter(date, limit)) {
          return [];
        }
      }
    }

    const windows = resolvePracticeWindows(date, input, timeZone);
    const durationMs = input.durationMinutes * 60_000;
    const stepMs = input.slotGranularityMinutes * 60_000;
    const noticeMs = (input.minimumNoticeMinutes ?? 0) * 60_000;
    const earliest = new Date(input.now.getTime() + noticeMs);
    const slots: GeneratedSlot[] = [];

    for (const window of windows) {
      let cursor = window.start.getTime();
      const lastStart = window.end.getTime() - durationMs;
      while (cursor <= lastStart) {
        const startsAt = new Date(cursor);
        const endsAt = new Date(cursor + durationMs);
        if (startsAt <= earliest) {
          cursor += stepMs;
          continue;
        }
        if (!slotFitsWindow(startsAt, endsAt, window)) {
          cursor += stepMs;
          continue;
        }
        const occupiedStartsAt = addMinutes(startsAt, -input.bufferBeforeMinutes);
        const occupiedEndsAt = addMinutes(endsAt, input.bufferAfterMinutes);
        const occupied = { start: occupiedStartsAt, end: occupiedEndsAt };
        const conflicts = input.blockingOccupied.some((range) =>
          intervalsOverlap(occupied, range),
        );
        if (!conflicts) {
          slots.push({
            startsAt,
            endsAt,
            occupiedStartsAt,
            occupiedEndsAt,
          });
        }
        cursor += stepMs;
      }
    }
    return slots;
  }

  isExactSlot(input: SlotGenerationInput, startsAt: Date): GeneratedSlot | null {
    return (
      this.generateSlots(input).find(
        (slot) => slot.startsAt.getTime() === startsAt.getTime(),
      ) ?? null
    );
  }

  async getPracticeAvailability(
    ctx: IdentityContext,
    input: { appointmentTypePublicId: string; dateLocal: string },
  ): Promise<PracticeAvailabilityResult> {
    try {
      const loaded = await this.loadFromDatabase(ctx, input);
      const windows = this.generateWindows(loaded.slotsInput);
      return {
        ok: true,
        date: input.dateLocal,
        timezone: loaded.slotsInput.timeZone ?? PRACTICE_TIMEZONE,
        windows: windows.map((window) => ({
          start: window.start.toISOString(),
          end: window.end.toISOString(),
        })),
      };
    } catch (error) {
      logAvailabilityFailure(error);
      return safeAvailabilityFailure(error);
    }
  }

  async getAvailableSlots(
    ctx: IdentityContext,
    input: { appointmentTypePublicId: string; dateLocal: string },
  ): Promise<AvailableSlotsResult> {
    try {
      const loaded = await this.loadFromDatabase(ctx, input);
      const slots = this.generateSlots(loaded.slotsInput);
      return {
        ok: true,
        date: input.dateLocal,
        timezone: loaded.slotsInput.timeZone ?? PRACTICE_TIMEZONE,
        appointmentType: {
          publicId: loaded.appointmentType.publicId,
          name: loaded.appointmentType.name,
          durationMinutes: loaded.appointmentType.durationMinutes,
        },
        slots: slots.map((slot) => ({
          start: slot.startsAt.toISOString(),
          end: slot.endsAt.toISOString(),
        })),
      };
    } catch (error) {
      logAvailabilityFailure(error);
      return safeAvailabilityFailure(error);
    }
  }

  /**
   * Independent server-side check. Callers must still authenticate and
   * authorize before booking. A true result is advisory only.
   */
  async isSlotAvailable(
    ctx: IdentityContext,
    input: { appointmentTypePublicId: string; startsAt: Date },
  ): Promise<SlotAvailabilityResult> {
    try {
      if (Number.isNaN(input.startsAt.getTime())) {
        throw new AppointmentDomainError(
          "VALIDATION",
          APPOINTMENT_SAFE_MESSAGES.outsideAvailability,
        );
      }
      const dateLocal = formatLocalDate(input.startsAt, PRACTICE_TIMEZONE);
      const loaded = await this.loadFromDatabase(ctx, {
        appointmentTypePublicId: input.appointmentTypePublicId,
        dateLocal,
      });
      const match = this.isExactSlot(loaded.slotsInput, input.startsAt);
      if (!match) {
        if (input.startsAt <= loaded.slotsInput.now) {
          return {
            ok: true,
            available: false,
            reason: APPOINTMENT_SAFE_MESSAGES.inThePast,
          };
        }
        return {
          ok: true,
          available: false,
          reason: APPOINTMENT_SAFE_MESSAGES.outsideAvailability,
        };
      }
      const occupied = await hasBlockingOccupiedOverlap(
        ctx.db,
        loaded.appointmentType.psychologistUserId,
        match.occupiedStartsAt,
        match.occupiedEndsAt,
      );
      if (occupied) {
        return {
          ok: true,
          available: false,
          reason: APPOINTMENT_SAFE_MESSAGES.slotUnavailable,
        };
      }
      return {
        ok: true,
        available: true,
        start: match.startsAt.toISOString(),
        end: match.endsAt.toISOString(),
      };
    } catch (error) {
      logAvailabilityFailure(error);
      return safeAvailabilityFailure(error);
    }
  }

  private async loadFromDatabase(
    ctx: IdentityContext,
    input: { appointmentTypePublicId: string; dateLocal: string },
  ) {
    if (!PUBLIC_APPOINTMENT_TYPE_ID_PATTERN.test(input.appointmentTypePublicId)) {
      throw new AppointmentDomainError(
        "VALIDATION",
        APPOINTMENT_SAFE_MESSAGES.notConfigured,
      );
    }
    if (!parseLocalDate(input.dateLocal)) {
      throw new AppointmentDomainError(
        "VALIDATION",
        APPOINTMENT_SAFE_MESSAGES.outsideAvailability,
      );
    }
    const [appointmentType] = await ctx.db
      .select({
        id: appointmentTypes.id,
        publicId: appointmentTypes.publicId,
        psychologistUserId: appointmentTypes.psychologistUserId,
        name: appointmentTypes.name,
        durationMinutes: appointmentTypes.durationMinutes,
        bufferBeforeMinutes: appointmentTypes.bufferBeforeMinutes,
        bufferAfterMinutes: appointmentTypes.bufferAfterMinutes,
        active: appointmentTypes.active,
      })
      .from(appointmentTypes)
      .where(eq(appointmentTypes.publicId, input.appointmentTypePublicId))
      .limit(1);
    if (!appointmentType || !appointmentType.active) {
      throw new AppointmentDomainError(
        "NOT_CONFIGURED",
        APPOINTMENT_SAFE_MESSAGES.notConfigured,
      );
    }

    const date = parseLocalDate(input.dateLocal);
    if (!date) {
      throw new AppointmentDomainError(
        "VALIDATION",
        APPOINTMENT_SAFE_MESSAGES.outsideAvailability,
      );
    }
    const timeZone = PRACTICE_TIMEZONE;
    const dayStart = startOfLocalDay(date, timeZone);
    const dayEnd = startOfNextLocalDay(date, timeZone);

    const [settings] = await ctx.db
      .select()
      .from(practiceAppointmentSettings)
      .where(
        eq(
          practiceAppointmentSettings.psychologistUserId,
          appointmentType.psychologistUserId,
        ),
      )
      .limit(1);

    const hourRows = await ctx.db
      .select()
      .from(practiceHours)
      .where(eq(practiceHours.psychologistUserId, appointmentType.psychologistUserId));
    const hourIds = hourRows.map((row) => row.id);
    const breakRows =
      hourIds.length === 0
        ? []
        : await ctx.db
            .select()
            .from(practiceHourBreaks)
            .where(inArray(practiceHourBreaks.practiceHourId, hourIds));

    const exceptionRows = await ctx.db
      .select({
        kind: availabilityExceptions.kind,
        localDate: availabilityExceptions.localDate,
        startsAt: availabilityExceptions.startsAt,
        endsAt: availabilityExceptions.endsAt,
        opensLocal: availabilityExceptions.opensLocal,
        closesLocal: availabilityExceptions.closesLocal,
      })
      .from(availabilityExceptions)
      .where(
        eq(
          availabilityExceptions.psychologistUserId,
          appointmentType.psychologistUserId,
        ),
      );

    const blockingOccupied = await loadBlockingOccupiedRanges(
      ctx.db,
      appointmentType.psychologistUserId,
      dayStart,
      dayEnd,
    );

    const hours: PracticeHourInput[] = hourRows.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      opensLocal: row.opensLocal,
      closesLocal: row.closesLocal,
      active: row.active,
      breaks: breakRows
        .filter((item) => item.practiceHourId === row.id)
        .map((item) => ({
          startsLocal: item.startsLocal,
          endsLocal: item.endsLocal,
        })),
    }));

    const exceptions: AvailabilityExceptionInput[] = exceptionRows.map((row) => ({
      kind: row.kind as AvailabilityExceptionKind,
      localDate: row.localDate,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      opensLocal: row.opensLocal,
      closesLocal: row.closesLocal,
    }));

    return {
      appointmentType,
      slotsInput: {
        dateLocal: input.dateLocal,
        timeZone: settings?.timezone ?? PRACTICE_TIMEZONE,
        now: ctx.now(),
        durationMinutes: appointmentType.durationMinutes,
        bufferBeforeMinutes: appointmentType.bufferBeforeMinutes,
        bufferAfterMinutes: appointmentType.bufferAfterMinutes,
        slotGranularityMinutes: settings?.slotGranularityMinutes ?? null,
        minimumNoticeMinutes: settings?.minimumNoticeMinutes ?? null,
        maximumAdvanceDays: settings?.maximumAdvanceDays ?? null,
        hours,
        exceptions,
        blockingOccupied,
      } satisfies SlotGenerationInput,
    };
  }
}

function logAvailabilityFailure(error: unknown): void {
  if (error instanceof AppointmentDomainError) {
    return;
  }
  logStructured("ERROR", {
    operation: "availability",
    errorType: "unexpected",
  });
}

export const availabilityService = new AvailabilityService();
