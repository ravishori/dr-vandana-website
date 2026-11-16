# OD-H1c - Interpretations of the proposed "within one business day" intake-review target

**Status: PROPOSED targets, pending the owner's confirmation (register OD-H1). Nothing here is an approved operational SLA, an emergency response guarantee or a clinical safety SLA.** The implementation in this PR (`computeIntakeReviewDue`, reading A) is unchanged. The alternatives live in `due-time-interpretations.ts`, are not wired anywhere and exist for analysis and tests only. The practice schedule itself (Mon-Sun, 09:00-18:00 IST, declared holidays only) is owner-approved (OD-H2).

## The proposed policy being interpreted
1. Intake before a scheduled consultation: review before that consultation.
2. Intake without an appointment: review within one business day.
3. Intake outside practice hours: review during the next working period.
4. Doctor absent: stays pending (no change to the due time).

## Readings compared
| | Rule | Inside hours | Outside hours |
|---|---|---|---|
| **A (implemented)** | add one working period (9 working hours) | same clock time next operating day | end of the next working period (18:00) |
| B | same wall-clock time next operating day | same clock time next day (also at exactly 09:00:00) | end of the next working period |
| C | close of the next operating day's working period | 18:00 next operating day | end of the next working period |
| D | close of business of the current/next working period | 18:00 today | end of the next working period |

## Results (synthetic sweep of every minute of Tuesday 17 Nov 2026 IST; local run of `scripts/analysis-due-interpretations.ts`)
| Submitted | A | B | C | D |
|---|---|---|---|---|
| 08:59 | Tue 18:00 | Tue 18:00 | Tue 18:00 | Tue 18:00 |
| 09:00 | Tue 18:00 | Wed 09:00 | Wed 18:00 | Tue 18:00 |
| 09:01 | Wed 09:01 | Wed 09:01 | Wed 18:00 | Tue 18:00 |
| 12:00 | Wed 12:00 | Wed 12:00 | Wed 18:00 | Tue 18:00 |
| 17:59 | Wed 17:59 | Wed 17:59 | Wed 18:00 | Tue 18:00 |
| 18:00 | Wed 18:00 | Wed 18:00 | Wed 18:00 | Wed 18:00 |
| 20:00 / 23:59 | Wed 18:00 | Wed 18:00 | Wed 18:00 | Wed 18:00 |

| | Turnaround range | Largest jump in due time between consecutive minutes | Where |
|---|---|---|---|
| A | 9.00 h to 24.00 h | +15 h | 09:01 |
| B | 9.02 h to 24.00 h | +15 h | 09:00 |
| C | 9.02 h to 33.00 h | +24 h | 09:00 |
| D | 0.02 h to 24.00 h | +24 h | 18:00 |
All four are monotone (a later submission is never due earlier). Declared-holiday and weekend behaviour is identical in A and B (Wed 14:00 with Thursday declared a holiday gives Fri 14:00; Saturday 14:00 gives Sunday 14:00); C and D differ only in the clock time returned.

## Findings
1. **The cliff is a consequence of the proposed targets, not an arithmetic bug.** Rule 3 gives a form sent just before opening a due time later the same day (18:00) while rule 2 gives a form sent just after opening a due time the next day. Any reading that keeps both rules has a jump of 15-24 hours at an opening or closing boundary; readings only move where it falls.
2. **A and B differ only for a submission at exactly 09:00:00.** Choosing between them matters little in practice.
3. **C** is simple to explain ("by end of the next day") but allows up to 33 hours. **D** can leave one minute to review (17:59 -> 18:00) and is unlikely to suit.
4. **Removing the cliff needs a policy change**, for example one rule for all submissions ("by close of the next operating day") or treating pre-opening forms like post-opening ones. That would change the proposed targets and is the owner's decision.

## Owner questions (OD-H1 family, all OPEN)
- Keep rules 2 and 3 as proposed (accepting the cliff), or choose one rule for all submissions?
- If keeping them: A (implemented) or B?
- Should a consultation far in the future also carry the business-day target (OD-H1a, `earlier_of` is available as an option)?
- Clinical reviewer to confirm that a due time of up to 24 hours (A/B) or 33 hours (C) is acceptable as an operational review target.
