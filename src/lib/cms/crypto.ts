import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string, salt?: string): string {
  const usedSalt = salt ?? randomBytes(16).toString("hex");
  const derived = scryptSync(password, usedSalt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${usedSalt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, expected] = parts;
  const actual = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
