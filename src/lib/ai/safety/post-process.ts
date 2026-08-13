const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?91[\s-]?)?[6-9]\d{9}\b/g;
const NAME_HINT_RE =
  /\b((my name is|i am|i'm)\s+)[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g;

export function stripObviousPii(text: string): string {
  return text
    .replace(EMAIL_RE, "[redacted-email]")
    .replace(PHONE_RE, "[redacted-phone]")
    .replace(NAME_HINT_RE, "$1[redacted-name]");
}

const FORBIDDEN_CLAIMS = [
  /i am dr\.?\s*vandana/i,
  /i have treated you/i,
  /i diagnosed you/i,
  /you definitely have\b/i,
  /this treatment will cure you/i,
  /i reviewed your (medical )?records/i,
  /dr\.?\s*vandana treated this patient/i,
];

export function containsForbiddenClaim(text: string): boolean {
  return FORBIDDEN_CLAIMS.some((pattern) => pattern.test(text));
}

export function postProcessAnswer(
  answer: string,
  allowedSourceTitles: readonly string[],
): string {
  let next = answer.trim();

  if (containsForbiddenClaim(next)) {
    next = next
      .replace(/i am dr\.?\s*vandana[^.?!]*/gi, "")
      .replace(/i have treated you[^.?!]*/gi, "")
      .replace(/i diagnosed you[^.?!]*/gi, "")
      .replace(/you definitely have[^.?!]*/gi, "A chat cannot determine a diagnosis")
      .replace(/this treatment will cure you[^.?!]*/gi, "")
      .replace(/i reviewed your (medical )?records[^.?!]*/gi, "")
      .replace(/dr\.?\s*vandana treated this patient[^.?!]*/gi, "");
  }

  // Drop any "Source:" lines that were not in retrieved, approved sources.
  next = next.replace(
    /(?:^|\n)\s*sources?:[\s\S]*$/i,
    "",
  );

  if (allowedSourceTitles.length === 0) {
    next = next.replace(/\[[0-9]+\]/g, "");
  }

  return next.replace(/\n{3,}/g, "\n\n").trim();
}
