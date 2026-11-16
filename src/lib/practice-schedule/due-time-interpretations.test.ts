/**
 * Pins the findings of the OD-H1c analysis. These tests describe the
 * alternatives; they do not select one and do not approve any target.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeIntakeReviewDue } from "@/lib/practice-schedule/intake-review-due";
import {
  INTERPRETATIONS,
  interpretationA,
  interpretationB,
  interpretationC,
  interpretationD,
} from "@/lib/practice-schedule/due-time-interpretations";

const ist = (s: string) => new Date(`${s}:00+05:30`);
const show = (d: Date) => new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 16);

function sweep(): Date[] {
  const out: Date[] = [];
  for (let m = 0; m < 24 * 60; m += 1) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(ist(`2026-11-17T${hh}:${mm}`));
  }
  return out;
}

describe("OD-H1c interpretations (analysis only)", () => {
  it("interpretation A is exactly the implemented default", () => {
    for (const t of sweep()) {
      assert.equal(
        interpretationA(t).getTime(),
        computeIntakeReviewDue({ submittedAt: t }).dueAt.getTime(),
      );
    }
  });

  it("every interpretation is never earlier than submission and never decreases as submission time increases", () => {
    for (const [name, f] of Object.entries(INTERPRETATIONS)) {
      let prev = 0;
      for (const t of sweep()) {
        const due = f(t).getTime();
        assert.ok(due >= t.getTime(), `${name} due before submission`);
        assert.ok(due >= prev, `${name} decreased`);
        prev = due;
      }
    }
  });

  it("A and B differ only for a submission at exactly 09:00:00", () => {
    const diffs = sweep().filter(
      (t) => interpretationA(t).getTime() !== interpretationB(t).getTime(),
    );
    assert.deepEqual(diffs.map((d) => show(d)), ["2026-11-17T09:00"]);
  });

  it("all readings have a cliff at an opening/closing boundary (it comes from the proposed targets, not from the arithmetic)", () => {
    const cliff = (f: (t: Date) => Date) => {
      let max = 0;
      let prev: number | null = null;
      for (const t of sweep()) {
        const due = f(t).getTime();
        if (prev !== null) max = Math.max(max, (due - prev) / 3_600_000);
        prev = due;
      }
      return Math.round(max * 10) / 10;
    };
    assert.equal(cliff(interpretationA), 15);
    assert.equal(cliff(interpretationB), 15);
    assert.equal(cliff(interpretationC), 24);
    assert.equal(cliff(interpretationD), 24);
  });

  it("D can leave one minute to review (shown to illustrate why it is unlikely to be chosen)", () => {
    const t = ist("2026-11-17T17:59");
    assert.equal(show(interpretationD(t)), "2026-11-17T18:00");
  });

  it("C can allow more than a day (33 hours at opening)", () => {
    const t = ist("2026-11-17T09:01");
    assert.equal((interpretationC(t).getTime() - t.getTime()) / 3_600_000 > 32, true);
  });
});
