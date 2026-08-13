import type { SafetyCategory } from "@/types/ai";

export type SafetyClassification = {
  category: SafetyCategory;
  reasons: string[];
};

const NAMED_THERAPIES = [
  "cbt",
  "cognitive behavioural",
  "cognitive behavioral",
  "dbt",
  "dialectical",
  "emdr",
  "psychoanalysis",
  "psychoanalytic",
  "hypnotherapy",
  "hypnosis",
  "act therapy",
  "acceptance and commitment",
  "schema therapy",
  "nlp",
  "reiki",
];

export function mentionsNamedTherapy(text: string): boolean {
  const lower = text.toLowerCase();
  return NAMED_THERAPIES.some((term) => lower.includes(term));
}

function includesAny(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

const INJECTION_PATTERNS = [
  /ignore (all |any )?(previous|prior|above) instructions/i,
  /reveal (your )?(system )?prompt/i,
  /show (me )?(the )?(hidden|secret|confidential)/i,
  /disregard (your )?(rules|safety|guidelines)/i,
  /you are now /i,
  /jailbreak/i,
  /print (your )?(api keys?|credentials|internal policies)/i,
];

const CRISIS_PATTERNS = [
  /\b(emergency|call an ambulance|right now i('m| am) in danger)\b/i,
  /\b(someone is (going to|about to) (hurt|kill|harm))\b/i,
];

const SELF_HARM_PATTERNS = [
  /\b(suicid(e|al)|kill myself|end my life|want to die|self[- ]harm|cut myself|hang myself)\b/i,
  /\b(no reason to live|better off dead)\b/i,
];

const VIOLENCE_PATTERNS = [
  /\b(kill (him|her|them|someone)|hurt (him|her|them) |i will (attack|stab|shoot))\b/i,
  /\b(how to (make a bomb|poison someone|hurt people))\b/i,
];

const MEDICATION_PATTERNS = [
  /\b(which medicine|what (medication|tablet|drug) should i (take|use)|prescribe|dosage|mg of|antidepressant|ssri|benzodiazepine|sleeping pill)\b/i,
  /\b(should i (stop|start|increase|decrease) (my )?(meds|medication|medicine|tablets))\b/i,
];

const DIAGNOSTIC_PATTERNS = [
  /\b(do i have|have i got|am i (clinically )?(depressed|anxious|bipolar|adhd|autistic|ocd))\b/i,
  /\b(diagnose me|what is my diagnosis|tell me (my|the) diagnosis|is this (depression|anxiety|bipolar|adhd))\b/i,
  /\b(can you tell whether i have)\b/i,
];

const CONFIDENTIALITY_PATTERNS = [
  /\b(patient (records|cases|files|notes)|real patients?|confidential (cases?|records))\b/i,
  /\b(who (did|have) you treat|tell me about .*(patients?|clients?) (of|dr\.? vandana treated))\b/i,
  /\b(dr\.? vandana'?s patient)\b/i,
];

const DR_VANDANA_PATTERNS = [
  /\bdr\.?\s*vandana\b/i,
  /\bher (methodology|approach|technique|method)\b/i,
  /\b(your|vandana'?s) (methodology|approach|technique)\b/i,
];

const PERSONAL_PATTERNS = [
  /\b(i (feel|am feeling|have been|can't sleep|cannot sleep)|my (anxiety|depression|panic|marriage|husband|wife|child))\b/i,
  /\b(help me with my|i am struggling|i've been crying)\b/i,
];

const OUT_OF_SCOPE_PATTERNS = [
  /\b(write (python|javascript|code)|stock market|crypto|recipe|weather|homework essay)\b/i,
  /\b(who will win|lottery|legal notice|court case strategy)\b/i,
];

export function classifySafety(question: string): SafetyClassification {
  const text = question.trim();
  const reasons: string[] = [];

  if (includesAny(text, INJECTION_PATTERNS)) {
    reasons.push("prompt-injection-pattern");
    return { category: "PROMPT_INJECTION", reasons };
  }
  if (includesAny(text, SELF_HARM_PATTERNS)) {
    reasons.push("self-harm-language");
    return { category: "SELF_HARM_OR_SUICIDE", reasons };
  }
  if (includesAny(text, VIOLENCE_PATTERNS)) {
    reasons.push("violence-language");
    return { category: "VIOLENCE_OR_HARM", reasons };
  }
  if (includesAny(text, CRISIS_PATTERNS)) {
    reasons.push("crisis-language");
    return { category: "CRISIS_OR_EMERGENCY", reasons };
  }
  if (includesAny(text, MEDICATION_PATTERNS)) {
    reasons.push("medication-request");
    return { category: "MEDICATION_REQUEST", reasons };
  }
  if (includesAny(text, DIAGNOSTIC_PATTERNS)) {
    reasons.push("diagnostic-request");
    return { category: "DIAGNOSTIC_REQUEST", reasons };
  }
  if (includesAny(text, CONFIDENTIALITY_PATTERNS)) {
    reasons.push("patient-privacy-request");
    return { category: "CONFIDENTIALITY_REQUEST", reasons };
  }
  if (includesAny(text, DR_VANDANA_PATTERNS)) {
    reasons.push("practice-specific");
    return { category: "DR_VANDANA_SPECIFIC", reasons };
  }
  if (includesAny(text, OUT_OF_SCOPE_PATTERNS)) {
    reasons.push("unrelated-topic");
    return { category: "OUT_OF_SCOPE", reasons };
  }
  if (includesAny(text, PERSONAL_PATTERNS)) {
    reasons.push("personal-concern");
    return { category: "PERSONAL_MENTAL_HEALTH", reasons };
  }

  return { category: "SAFE_EDUCATIONAL", reasons: ["educational-default"] };
}

export interface SafetyService {
  classify(question: string): SafetyClassification;
}

export class RuleSafetyService implements SafetyService {
  classify(question: string): SafetyClassification {
    return classifySafety(question);
  }
}

export const safetyService: SafetyService = new RuleSafetyService();
