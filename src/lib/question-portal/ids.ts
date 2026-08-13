import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createQuestionId(): string {
  return crypto.randomUUID();
}

export function createPublicReferenceId(): string {
  const bytes = randomBytes(6);
  let token = "";
  for (const byte of bytes) {
    token += ALPHABET[byte % ALPHABET.length];
  }
  return `QV-${token}`;
}

export function createAuditId(): string {
  return `AUD-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function fingerprintSubmission(
  question: string,
  email: string | null,
): string {
  return createHash("sha256")
    .update(`${email ?? ""}::${question.trim().toLowerCase().replace(/\s+/g, " ")}`)
    .digest("hex");
}
