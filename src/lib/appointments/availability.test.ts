import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  availabilityService,
  intervalsOverlap,
  resolvePracticeWindows,
  type SlotGenerationInput,
} from "@/lib/appointments/availability";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import {
  TEST_APPOINTMENT_DURATION_MINUTES,
  TEST_BUFFER_AFTER_MINUTES,
  TEST_BUFFER_BEFORE_MINUTES,
  TEST_PRACTICE_HOURS,
  TEST_SLOT_GRANULARITY_MINUTES,
} from "@/lib/appointments/fixtures";
import { addMinutes, zonedCivilToUtc } from "@/lib/appointments/timezone";

function hoursInput() {
  return TEST_PRACTICE_HOURS.map((hour) => ({
    dayOfWeek: hour.dayOfWeek,
    opensLocal: hour.opensLocal,
    closesLocal: hour.closesLocal,
    active: true,
    breaks: [
      { startsLocal: hour.breakStartsLocal, endsLocal: hour.breakEndsLocal },
    ],
  }));
}

function ist(day: number, hour: number, minute = 0, month = 8, year = 2026) {
  return zonedCivilToUtc({ year, month, day, hour, minute, second: 0 });
}

function iso(day: number, hour: number, minute = 0, month = 8, year = 2026) {
  return ist(day, hour, minute, month, year).toISOString();
}

function baseInput(overrides: Partial<SlotGenerationInput> = {}): SlotGenerationInput {
  return {
    dateLocal: "2026-08-17",
    timeZone: PRACTICE_TIMEZONE,
    now: ist(14, 9, 0),
    durationMinutes: TEST_APPOINTMENT_DURATION_MINUTES,
    bufferBeforeMinutes: TEST_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes: TEST_BUFFER_AFTER_MINUTES,
    slotGranularityMinutes: TEST_SLOT_GRANULARITY_MINUTES,
    minimumNoticeMinutes: 0,
    maximumAdvanceDays: 14,
    hours: hoursInput(),
    exceptions: [],
    blockingOccupied: [],
    ...overrides,
  };
}

function starts(input: Partial<SlotGenerationInput> = {}) {
  return availabilityService
    .generateSlots(baseInput(input))
    .map((slot) => slot.startsAt.toISOString());
}

describe("availability service — practice hours", () => {
  it("includes a slot exactly at opening", () => {
    assert.ok(starts().includes(iso(17, 10, 0)));
  });

  it("includes a slot that ends exactly at closing", () => {
    assert.ok(starts().includes(iso(17, 17, 30)));
  });

  it("excludes a slot that would extend beyond closing", () => {
    assert.equal(starts().includes(iso(17, 17, 45)), false);
    assert.equal(starts().includes(iso(17, 18, 0)), false);
  });

  it("returns no slots on a closed weekday with inactive hours", () => {
    const hours = hoursInput().map((hour) =>
      hour.dayOfWeek === 1 ? { ...hour, active: false } : hour,
    );
    assert.equal(starts({ hours }).length, 0);
  });

  it("returns no slots on Saturday when weekend hours are absent", () => {
    assert.equal(starts({ dateLocal: "2026-08-15" }).length, 0);
  });
});

describe("availability service — breaks", () => {
  it("includes the last slot ending exactly at the break", () => {
    assert.ok(starts().includes(iso(17, 12, 30)));
  });

  it("excludes slots during the break", () => {
    const values = starts();
    assert.equal(values.includes(iso(17, 12, 45)), false);
    assert.equal(values.includes(iso(17, 13, 0)), false);
    assert.equal(values.includes(iso(17, 13, 30)), false);
    assert.equal(values.includes(iso(17, 13, 45)), false);
  });

  it("includes the first slot immediately after the break", () => {
    assert.ok(starts().includes(iso(17, 14, 0)));
  });
});

describe("availability service — exceptions", () => {
  it("returns no windows on a full-day closure, including when custom hours exist", () => {
    const input = baseInput({
      exceptions: [
        {
          kind: "CUSTOM_AVAILABILITY",
          localDate: "2026-08-17",
          startsAt: null,
          endsAt: null,
          opensLocal: "11:00:00",
          closesLocal: "12:00:00",
        },
        {
          kind: "FULL_DAY_CLOSURE",
          localDate: "2026-08-17",
          startsAt: null,
          endsAt: null,
          opensLocal: null,
          closesLocal: null,
        },
      ],
    });
    assert.equal(resolvePracticeWindows({ year: 2026, month: 8, day: 17 }, input, PRACTICE_TIMEZONE).length, 0);
    assert.equal(availabilityService.generateSlots(input).length, 0);
  });

  it("uses special opening hours instead of weekday hours", () => {
    const values = starts({
      exceptions: [
        {
          kind: "CUSTOM_AVAILABILITY",
          localDate: "2026-08-17",
          startsAt: null,
          endsAt: null,
          opensLocal: "11:00:00",
          closesLocal: "12:00:00",
        },
      ],
    });
    assert.ok(values.includes(iso(17, 11, 0)));
    assert.equal(values.includes(iso(17, 10, 0)), false);
    assert.equal(values.includes(iso(17, 14, 0)), false);
  });

  it("allows a special opening on a normally closed day", () => {
    const values = starts({
      dateLocal: "2026-08-16",
      exceptions: [
        {
          kind: "CUSTOM_AVAILABILITY",
          localDate: "2026-08-16",
          startsAt: null,
          endsAt: null,
          opensLocal: "10:00:00",
          closesLocal: "11:00:00",
        },
      ],
    });
    assert.ok(values.includes(iso(16, 10, 0)));
  });

  it("subtracts a partial unavailable period", () => {
    const values = starts({
      exceptions: [
        {
          kind: "UNAVAILABLE_PERIOD",
          localDate: null,
          startsAt: ist(17, 10, 0),
          endsAt: ist(17, 11, 0),
          opensLocal: null,
          closesLocal: null,
        },
      ],
    });
    assert.equal(values.includes(iso(17, 10, 0)), false);
    assert.equal(values.includes(iso(17, 10, 30)), false);
    assert.ok(values.includes(iso(17, 11, 0)));
  });
});

describe("availability service — duration", () => {
  it("fits a short duration into the morning window", () => {
    const values = starts({ durationMinutes: 15 });
    assert.ok(values.includes(iso(17, 12, 45)));
  });

  it("uses a longer configured duration without hard-coding production policy", () => {
    const values = starts({ durationMinutes: 90 });
    assert.ok(values.includes(iso(17, 10, 0)));
    assert.equal(values.includes(iso(17, 12, 0)), false);
  });

  it("returns no slots when duration exceeds every remaining window", () => {
    assert.equal(starts({ durationMinutes: 300 }).length, 0);
  });
});

describe("availability service — buffers and existing appointments", () => {
  it("treats an exact overlap as unavailable", () => {
    const values = starts({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      blockingOccupied: [{ start: ist(17, 10, 0), end: ist(17, 10, 30) }],
    });
    assert.equal(values.includes(iso(17, 10, 0)), false);
  });

  it("treats a partial overlap as unavailable", () => {
    const values = starts({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      blockingOccupied: [{ start: ist(17, 10, 0), end: ist(17, 10, 30) }],
    });
    assert.equal(values.includes(iso(17, 10, 15)), false);
  });

  it("allows an adjacent appointment when buffers are zero (half-open intervals)", () => {
    const values = starts({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      blockingOccupied: [{ start: ist(17, 10, 0), end: ist(17, 10, 30) }],
    });
    assert.ok(values.includes(iso(17, 10, 30)));
  });

  it("applies buffer after so the next start waits until the blocked interval ends", () => {
    const values = starts({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 10,
      blockingOccupied: [{ start: ist(17, 10, 0), end: ist(17, 10, 40) }],
    });
    assert.equal(values.includes(iso(17, 10, 30)), false);
    assert.ok(values.includes(iso(17, 10, 45)));
  });

  it("applies buffer before so an earlier candidate that collides is excluded", () => {
    const values = starts({
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 0,
      blockingOccupied: [{ start: ist(17, 10, 20), end: ist(17, 10, 50) }],
    });
    assert.equal(values.includes(iso(17, 10, 0)), false);
    assert.ok(values.includes(iso(17, 11, 0)));
  });

  it("applies both buffers together", () => {
    const values = starts({
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      blockingOccupied: [{ start: ist(17, 10, 25), end: ist(17, 11, 10) }],
    });
    assert.equal(values.includes(iso(17, 10, 0)), false);
    assert.equal(values.includes(iso(17, 10, 15)), false);
    assert.ok(values.includes(iso(17, 11, 15)));
  });

  it("excludes candidates against multiple existing occupied ranges", () => {
    const values = starts({
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      blockingOccupied: [
        { start: ist(17, 10, 0), end: ist(17, 10, 30) },
        { start: ist(17, 14, 0), end: ist(17, 15, 0) },
      ],
    });
    assert.equal(values.includes(iso(17, 10, 0)), false);
    assert.equal(values.includes(iso(17, 14, 15)), false);
    assert.ok(values.includes(iso(17, 10, 30)));
    assert.ok(values.includes(iso(17, 15, 0)));
  });
});

describe("availability service — booking window and past slots", () => {
  it("excludes already-past slots using the injected clock", () => {
    const values = starts({
      dateLocal: "2026-08-14",
      now: ist(14, 15, 30),
    });
    assert.equal(values.includes(iso(14, 15, 0)), false);
    assert.equal(values.includes(iso(14, 15, 30)), false);
    assert.ok(values.includes(iso(14, 15, 45)));
  });

  it("applies minimum notice from configuration, not a production default", () => {
    const values = starts({
      dateLocal: "2026-08-14",
      now: ist(14, 10, 0),
      minimumNoticeMinutes: 120,
    });
    assert.equal(values.includes(iso(14, 11, 0)), false);
    assert.ok(values.includes(iso(14, 12, 15)));
  });

  it("applies maximum advance days from configuration", () => {
    assert.ok(starts({ dateLocal: "2026-08-28", now: ist(14, 9, 0), maximumAdvanceDays: 14 }).length > 0);
    assert.equal(
      starts({ dateLocal: "2026-08-29", now: ist(14, 9, 0), maximumAdvanceDays: 14 }).length,
      0,
    );
  });

  it("returns no slots when granularity is not configured", () => {
    assert.equal(starts({ slotGranularityMinutes: null }).length, 0);
  });
});

describe("availability service — invariants", () => {
  it("never returns a slot that overlaps a break, blocking range, or the past", () => {
    const input = baseInput({
      now: ist(17, 11, 0),
      blockingOccupied: [{ start: ist(17, 14, 0), end: ist(17, 14, 40) }],
    });
    const breakInterval = { start: ist(17, 13, 0), end: ist(17, 14, 0) };
    const hoursWindowMorning = { start: ist(17, 10, 0), end: ist(17, 13, 0) };
    const hoursWindowAfternoon = { start: ist(17, 14, 0), end: ist(17, 18, 0) };
    for (const slot of availabilityService.generateSlots(input)) {
      const duration = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000;
      assert.equal(duration, input.durationMinutes);
      assert.equal(
        intervalsOverlap(
          { start: slot.startsAt, end: slot.endsAt },
          breakInterval,
        ),
        false,
      );
      assert.equal(
        intervalsOverlap(
          { start: slot.occupiedStartsAt, end: slot.occupiedEndsAt },
          input.blockingOccupied[0]!,
        ),
        false,
      );
      assert.equal(slot.startsAt > input.now, true);
      const inHours =
        (slot.startsAt >= hoursWindowMorning.start && slot.endsAt <= hoursWindowMorning.end) ||
        (slot.startsAt >= hoursWindowAfternoon.start && slot.endsAt <= hoursWindowAfternoon.end);
      assert.equal(inHours, true);
      assert.equal(slot.occupiedStartsAt.getTime(), addMinutes(slot.startsAt, -input.bufferBeforeMinutes).getTime());
      assert.equal(slot.occupiedEndsAt.getTime(), addMinutes(slot.endsAt, input.bufferAfterMinutes).getTime());
    }
  });
});
