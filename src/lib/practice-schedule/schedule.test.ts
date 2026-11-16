import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INTAKE_REVIEW_TARGET_STATUS,
  computeIntakeReviewDue,
} from "@/lib/practice-schedule/intake-review-due";
import {
  APPROVED_PRACTICE_SCHEDULE,
  addWorkingMinutes,
  clockStart,
  parseHolidayList,
} from "@/lib/practice-schedule/schedule";

/** Wall-clock IST helper: "2026-11-17T14:00" -> instant. */
const ist = (local: string) => new Date(`${local}:00+05:30`);
const show = (d: Date) =>
  new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);

const NO_HOLIDAYS = parseHolidayList([]);
const THU_HOLIDAY = parseHolidayList(["2026-11-19"]);

describe("approved practice schedule (OD-H2)", () => {
  it("is Monday-Sunday, 09:00-18:00, Asia/Kolkata, no weekly holiday", () => {
    assert.equal(APPROVED_PRACTICE_SCHEDULE.timeZone, "Asia/Kolkata");
    assert.equal(APPROVED_PRACTICE_SCHEDULE.openMinute, 540);
    assert.equal(APPROVED_PRACTICE_SCHEDULE.closeMinute, 1080);
    assert.deepEqual([...APPROVED_PRACTICE_SCHEDULE.operatingWeekdays], [1, 2, 3, 4, 5, 6, 7]);
  });

  it("treats 09:00:00 as inside and 18:00:00 as outside", () => {
    assert.equal(show(clockStart(ist("2026-11-17T09:00"))), "2026-11-17T09:00");
    assert.equal(show(clockStart(ist("2026-11-17T18:00"))), "2026-11-18T09:00");
    assert.equal(show(clockStart(ist("2026-11-17T08:59"))), "2026-11-17T09:00");
  });

  it("counts Saturday and Sunday as operating days", () => {
    assert.equal(show(clockStart(ist("2026-11-21T20:00"))), "2026-11-22T09:00"); // Sat night -> Sun
    assert.equal(show(clockStart(ist("2026-11-22T20:00"))), "2026-11-23T09:00"); // Sun night -> Mon
  });

  it("skips declared holidays only", () => {
    assert.equal(
      show(clockStart(ist("2026-11-19T11:00"), APPROVED_PRACTICE_SCHEDULE, THU_HOLIDAY)),
      "2026-11-20T09:00",
    );
    assert.equal(
      show(clockStart(ist("2026-11-19T11:00"), APPROVED_PRACTICE_SCHEDULE, NO_HOLIDAYS)),
      "2026-11-19T11:00",
    );
  });

  it("rejects invalid holiday dates", () => {
    assert.throws(() => parseHolidayList(["2026-02-30"]));
    assert.throws(() => parseHolidayList(["19/11/2026"]));
  });

  it("throws rather than looping forever if every day is a holiday", () => {
    const all: string[] = [];
    const base = Date.UTC(2026, 10, 1);
    for (let i = 0; i < 420; i += 1) {
      all.push(new Date(base + i * 86_400_000).toISOString().slice(0, 10));
    }
    assert.throws(() =>
      clockStart(ist("2026-11-17T20:00"), APPROVED_PRACTICE_SCHEDULE, parseHolidayList(all)),
    );
  });

  it("addWorkingMinutes requires a start inside a working period", () => {
    assert.throws(() => addWorkingMinutes(ist("2026-11-17T20:00"), 60));
  });
});

describe("intake review due time (PROPOSED targets, Doc 25 A4.3 examples)", () => {
  const due = (
    submitted: string,
    consultation?: string,
    opts: Parameters<typeof computeIntakeReviewDue>[1] = {},
  ) =>
    computeIntakeReviewDue(
      {
        submittedAt: ist(submitted),
        consultationStart: consultation ? ist(consultation) : null,
      },
      opts,
    );

  it("is labelled PROPOSED so it cannot be mistaken for an approved target", () => {
    assert.equal(INTAKE_REVIEW_TARGET_STATUS, "PROPOSED_PENDING_OWNER_CONFIRMATION");
  });

  const cases: Array<[string, string, string]> = [
    ["inside hours", "2026-11-17T14:00", "2026-11-18T14:00"],
    ["near close", "2026-11-17T17:30", "2026-11-18T17:30"],
    ["after hours", "2026-11-17T20:00", "2026-11-18T18:00"],
    ["before opening", "2026-11-18T07:30", "2026-11-18T18:00"],
    ["exactly at close (outside)", "2026-11-17T18:00", "2026-11-18T18:00"],
    // Nine working hours from opening end exactly at closing the same day.
    ["exactly at open (inside)", "2026-11-17T09:00", "2026-11-17T18:00"],
    // Discontinuity of the "add one working period" rule (open sub-decision
    // OD-H1c): one minute later the due time jumps to the next day.
    ["one minute after opening", "2026-11-17T09:01", "2026-11-18T09:01"],
    ["Saturday has no weekend gap", "2026-11-21T14:00", "2026-11-22T14:00"],
  ];
  for (const [name, submitted, expected] of cases) {
    it(name, () => {
      assert.equal(show(due(submitted).dueAt), expected);
    });
  }

  it("skips a declared holiday after submission", () => {
    const r = due("2026-11-18T14:00", undefined, { holidays: THU_HOLIDAY });
    assert.equal(show(r.dueAt), "2026-11-20T14:00");
  });

  it("starts the clock after a holiday when submitted on it", () => {
    const r = due("2026-11-19T11:00", undefined, { holidays: THU_HOLIDAY });
    assert.equal(show(r.dueAt), "2026-11-20T18:00");
    assert.equal(r.rule, "next_working_period");
  });

  it("uses the consultation start when a consultation is booked in the future", () => {
    const r = due("2026-11-17T14:00", "2026-11-23T10:00");
    assert.equal(show(r.dueAt), "2026-11-23T10:00");
    assert.equal(r.rule, "before_consultation");
  });

  it("handles an early consultation", () => {
    const r = due("2026-11-17T17:50", "2026-11-18T09:30");
    assert.equal(show(r.dueAt), "2026-11-18T09:30");
  });

  it("falls back to the business-day rule if the consultation already started", () => {
    const r = due("2026-11-17T14:00", "2026-11-17T10:00");
    assert.equal(show(r.dueAt), "2026-11-18T14:00");
  });

  it("supports the open earlier-of option (OD-H1a) without making it the default", () => {
    const earlier = due("2026-11-17T14:00", "2026-11-23T10:00", {
      appointmentRule: "earlier_of_consultation_and_business_day",
    });
    assert.equal(show(earlier.dueAt), "2026-11-18T14:00");
    const sooner = due("2026-11-17T17:50", "2026-11-18T09:30", {
      appointmentRule: "earlier_of_consultation_and_business_day",
    });
    assert.equal(show(sooner.dueAt), "2026-11-18T09:30");
  });

  it("depends only on calendar facts, never on answers", () => {
    const a = due("2026-11-17T14:00");
    const b = due("2026-11-17T14:00");
    assert.equal(a.dueAt.getTime(), b.dueAt.getTime());
    assert.deepEqual(Object.keys(a).sort(), ["clockStartedAt", "dueAt", "rule"]);
  });
});
