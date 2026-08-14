import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import {
  formatLocalDate,
  instantToZonedCivil,
  isoWeekdayInZone,
  parseLocalDate,
  zonedCivilToUtc,
} from "@/lib/appointments/timezone";

describe("practice timezone Asia/Kolkata", () => {
  it("converts civil IST to the expected UTC instant", () => {
    const instant = zonedCivilToUtc({
      year: 2026,
      month: 8,
      day: 17,
      hour: 10,
      minute: 0,
    });
    assert.equal(instant.toISOString(), "2026-08-17T04:30:00.000Z");
    const civil = instantToZonedCivil(instant, PRACTICE_TIMEZONE);
    assert.equal(civil.hour, 10);
    assert.equal(civil.minute, 0);
    assert.equal(formatLocalDate(instant), "2026-08-17");
  });

  it("does not change offset between January and July (no DST in India)", () => {
    const january = zonedCivilToUtc({ year: 2026, month: 1, day: 15, hour: 10 });
    const july = zonedCivilToUtc({ year: 2026, month: 7, day: 15, hour: 10 });
    assert.equal(january.toISOString(), "2026-01-15T04:30:00.000Z");
    assert.equal(july.toISOString(), "2026-07-15T04:30:00.000Z");
  });

  it("handles midnight and month/year boundaries in IST", () => {
    const midnight = zonedCivilToUtc({ year: 2026, month: 9, day: 1, hour: 0, minute: 0 });
    assert.equal(midnight.toISOString(), "2026-08-31T18:30:00.000Z");
    assert.equal(formatLocalDate(midnight), "2026-09-01");
    const newYear = zonedCivilToUtc({ year: 2027, month: 1, day: 1, hour: 0, minute: 0 });
    assert.equal(newYear.toISOString(), "2026-12-31T18:30:00.000Z");
    assert.equal(formatLocalDate(newYear), "2027-01-01");
  });

  it("rejects invalid calendar dates", () => {
    assert.equal(parseLocalDate("2026-02-30"), null);
    assert.equal(parseLocalDate("17-08-2026"), null);
  });

  it("handles leap-year 29 February in IST", () => {
    const leap = zonedCivilToUtc({ year: 2024, month: 2, day: 29, hour: 0, minute: 0 });
    assert.equal(formatLocalDate(leap), "2024-02-29");
    assert.equal(parseLocalDate("2024-02-29")?.day, 29);
    assert.equal(parseLocalDate("2023-02-29"), null);
  });

  it("uses ISO weekdays (Monday=1)", () => {
    assert.equal(isoWeekdayInZone({ year: 2026, month: 8, day: 17 }), 1);
    assert.equal(isoWeekdayInZone({ year: 2026, month: 8, day: 16 }), 7);
  });
});
