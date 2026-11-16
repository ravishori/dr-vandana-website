/**
 * Authoring-time guard for questionnaire DEFINITIONS (not for patient input).
 *
 * Owner decision IN-3: safety-related questions are clinician-led and are not
 * part of the asynchronous V1 intake. PHQ-9 and GAD-7 are not adopted
 * (OD-G2/G3). This guard stops such content from being published into the
 * engine by mistake. It inspects the text of question PROMPTS and OPTION
 * LABELS written by the practice; it never inspects or classifies anything a
 * patient wrote, so it does not conflict with the ban on keyword-based
 * interpretation of patient messages.
 */
const SAFETY_SCREENING_PATTERNS: readonly RegExp[] = [
  /suicid/i,
  /self[\s-]?harm/i,
  /kill\s+(my|your)self/i,
  /end(ing)?\s+(my|your)\s+life/i,
  /better\s+off\s+dead/i,
  /hurt(ing)?\s+(my|your)self/i,
  /harm(ing)?\s+(others|someone|another)/i,
];

const UNAPPROVED_INSTRUMENT_PATTERNS: readonly RegExp[] = [
  /phq[\s-]?9/i,
  /gad[\s-]?7/i,
  /patient health questionnaire/i,
  /generalized anxiety disorder\s*(7|scale)/i,
  /\bC-?SSRS\b/i,
];

export function authoringViolations(text: string): string[] {
  const out: string[] = [];
  if (SAFETY_SCREENING_PATTERNS.some((p) => p.test(text))) {
    out.push("safety_screening_not_allowed_in_async_intake");
  }
  if (UNAPPROVED_INSTRUMENT_PATTERNS.some((p) => p.test(text))) {
    out.push("instrument_not_approved");
  }
  return out;
}
