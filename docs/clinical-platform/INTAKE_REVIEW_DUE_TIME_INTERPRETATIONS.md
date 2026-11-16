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

## Addendum: owner-requested alternative - review by close of the next operating day, earlier before a scheduled consultation
**Still PROPOSED. The implementation and the default are unchanged; no SLA is activated.** Analysis only (`interpretationCWithConsultation`, tested). Rule: due = close (18:00) of the next operating day after submission clock start; if a consultation is already scheduled and starts earlier, due = consultation start. Compared with reading A given the same "earlier of consultation" rule (`interpretationAWithConsultation`).

Consultation scenarios (submitted Tue 17 Nov 14:00 IST):
| Consultation | A + earlier-of | C + earlier-of (requested alternative) |
|---|---|---|
| none | Wed 14:00 | Wed 18:00 |
| Wed 10:00 | Wed 10:00 | Wed 10:00 |
| Wed 16:00 | Wed 14:00 | Wed 16:00 |
| Thu 10:00 | Wed 14:00 | Wed 18:00 |
| following Tue 10:00 | Wed 14:00 | Wed 18:00 |

Batching (24 forms submitted one per hour across Tue 17 Nov): A spreads due times over many different clock times; **C puts 15 of 24 on one deadline (Wed 18:00) and the other 9 on Tue 18:00**, D puts 18 on Tue 18:00.

Operational consequences (descriptive, for the owner's decision):
- **Predictability and workload:** C gives a fixed daily review point (end of working day), easy to explain and to schedule as one sitting; A produces rolling deadlines through the day.
- **Longest wait:** C up to 33 hours (a form sent just after opening is due close of the next day); A at most 24 hours. C is therefore less strict on the clock for daytime forms.
- **Consultation rule:** with "earlier of consultation", C never waits beyond the next close of day and never lets a review fall after the consultation start; but a consultation in the next few days adds no extra urgency beyond that day's close.
- **Cliff:** C has one 24-hour jump at opening time (08:59 due 18:00 same day; 09:00 due 18:00 next day) instead of A's 15-hour jump; forms sent before opening are treated more urgently than ones sent a minute later in both readings.
- **Holidays and weekends:** both skip declared holidays; weekends are working days.
- **Safety framing:** none of these is an emergency response guarantee or a clinical safety SLA. Free-text disclosures are not assessed by the system under any reading; the doctor-review queue and the patient "not continuously monitored" wording are what apply. A longer maximum wait (C) should be weighed against that wording and the clinical reviewer's view (OD-H1 / clinical approval).

Owner questions added: choose A, B or the requested C+ (or keep rules 2 and 3 as proposed); whether a 33-hour maximum is acceptable as an operational target; whether the "earlier of consultation" rule applies to consultations beyond the next working day (it is available as `earlier_of_consultation_and_business_day` in the implemented option for reading A).

