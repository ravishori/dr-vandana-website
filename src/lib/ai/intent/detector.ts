import type { AskIntent, SafetyCategory } from "@/types/ai";

export type IntentResolution = {
  intent: AskIntent;
  secondary?: AskIntent;
};

const HOW_TO_PATTERNS = [
  /\bhow (can|do|should|to) i\b/i,
  /\bhow to\b/i,
  /\bwhat can i do\b/i,
  /\bways to\b/i,
  /\bsteps to\b/i,
  /\bpractise\b/i,
  /\bpractice\b/i,
  /\bimprove\b/i,
  /\bmanage\b/i,
  /\bcontrol\b/i,
  /\bbuild\b/i,
  /\bstop\b/i,
  /\breduce\b/i,
];

const DEFINITION_PATTERNS = [
  /^what is\b/i,
  /^what are\b/i,
  /^what does\b/i,
  /^define\b/i,
  /^explain\b/i,
  /^tell me about\b/i,
];

const TECHNIQUE_PATTERNS = [
  /\btechnique\b/i,
  /\bexercise\b/i,
  /\bpractise\b/i,
  /\bpractice\b/i,
  /\bvisuali[sz]ation\b/i,
  /\bmeditation\b/i,
  /\bmindfulness\b/i,
];

const BENEFITS_PATTERNS = [/\bbenefits?\b/i, /\badvantages?\b/i, /\bhelp with\b/i];

const COMPARISON_PATTERNS = [
  /\bdifference between\b/i,
  /\bcompare\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
];

const WHEN_HELP_PATTERNS = [
  /\bwhen should\b/i,
  /\bwhen to seek\b/i,
  /\bwhen is it okay\b/i,
  /\bwhen professional support\b/i,
];

const SYMPTOM_PATTERNS = [
  /\bwhy do i feel\b/i,
  /\bsymptoms?\b/i,
  /\bwhy am i\b/i,
  /\bwhy do i\b/i,
];

const EXAMPLE_PATTERNS = [/\bexample\b/i, /\bfor instance\b/i, /\bscenario\b/i];

export function detectIntent(
  question: string,
  safetyCategory: SafetyCategory,
): IntentResolution {
  const text = question.trim();

  if (safetyCategory === "DR_VANDANA_SPECIFIC") {
    return { intent: "DR_VANDANA_SPECIFIC" };
  }
  if (safetyCategory === "OUT_OF_SCOPE") {
    return { intent: "OUT_OF_SCOPE" };
  }
  if (
    safetyCategory === "CRISIS_OR_EMERGENCY" ||
    safetyCategory === "SELF_HARM_OR_SUICIDE" ||
    safetyCategory === "VIOLENCE_OR_HARM"
  ) {
    return { intent: "SAFETY" };
  }

  if (COMPARISON_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "COMPARISON" };
  }
  if (WHEN_HELP_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "WHEN_TO_SEEK_HELP" };
  }
  if (BENEFITS_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "BENEFITS" };
  }
  if (SYMPTOM_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "SYMPTOMS", secondary: "SELF_HELP" };
  }
  if (HOW_TO_PATTERNS.some((pattern) => pattern.test(text))) {
    const technique = TECHNIQUE_PATTERNS.some((pattern) => pattern.test(text));
    return {
      intent: technique ? "TECHNIQUE" : "HOW_TO",
      secondary: "SELF_HELP",
    };
  }
  if (TECHNIQUE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "TECHNIQUE", secondary: "DEFINITION" };
  }
  if (DEFINITION_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "DEFINITION" };
  }
  if (EXAMPLE_PATTERNS.some((pattern) => pattern.test(text))) {
    return { intent: "EXAMPLE" };
  }

  return { intent: "GENERAL_EDUCATION" };
}
