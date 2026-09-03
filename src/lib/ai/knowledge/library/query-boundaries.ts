/**
 * Query-level boundaries for Ask Dr. Vandana AI.
 * Prevents public university curriculum requests and clearly non-psychology questions
 * from retrieving unrelated psychology knowledge.
 */

const UNIVERSITY_CURRICULUM_PATTERNS = [
  /\buniversity of mumbai\b/i,
  /\bmumbai university\b/i,
  /\bnep 2020\b/i,
  /\b(m\.?a\.?\s*)?psychology\s+(syllabus|curriculum|course list)\b/i,
  /\b(syllabus|curriculum)\b.*\b(university|semester|course code)\b/i,
  /\bsemester\s+(i|ii|iii|iv|1|2|3|4)\b.*\b(psychology|syllabus|course)\b/i,
];

const NON_PSYCHOLOGY_PATTERNS = [
  /\bwhat is the capital of\b/i,
  /\bcapital of [a-z]+\b/i,
  /\bwho won (the )?(world cup|election)\b/i,
  /\b(stock market|crypto|bitcoin price)\b/i,
  /\bweather in\b/i,
  /\bwrite (me )?(a )?(python|javascript|code)\b/i,
];

export function isPublicUniversityCurriculumQuery(question: string): boolean {
  return UNIVERSITY_CURRICULUM_PATTERNS.some((pattern) => pattern.test(question));
}

export function isClearlyNonPsychologyQuery(question: string): boolean {
  return NON_PSYCHOLOGY_PATTERNS.some((pattern) => pattern.test(question));
}

export function shouldBypassPsychologyRetrieval(question: string): boolean {
  return (
    isPublicUniversityCurriculumQuery(question) ||
    isClearlyNonPsychologyQuery(question)
  );
}
