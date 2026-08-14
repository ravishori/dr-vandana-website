import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import { PUBLIC_ID_ALPHABET } from "@/lib/identity/constants";

export function generateUuid(): string {
  return crypto.randomUUID();
}

export function generatePublicId(
  prefix: "PAT" | "PSY" | "ADM" | "STF" | "APT" | "ATY",
): string {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) {
    body += PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length];
  }
  return `${prefix}-${body}`;
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export type HashPurpose =
  | "session"
  | "otp"
  | "email-verify"
  | "password-reset"
  | "mfa-recovery"
  | "ip"
  | "user-agent";

export function hashWithSecret(
  purpose: HashPurpose,
  value: string,
  secret: string,
): string {
  return createHmac("sha256", secret).update(`${purpose}:${value}`).digest("hex");
}

export function tokensMatch(
  leftHash: string,
  rightHash: string,
): boolean {
  const left = Buffer.from(leftHash);
  const right = Buffer.from(rightHash);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, "0");
}

export function generateRecoveryCode(): string {
  const bytes = randomBytes(5);
  let code = "";
  for (const byte of bytes) {
    code += PUBLIC_ID_ALPHABET[byte % PUBLIC_ID_ALPHABET.length];
  }
  return code;
}

function decodeMfaKey(key: string): Buffer {
  const trimmed = key.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const asB64 = Buffer.from(trimmed, "base64");
  if (asB64.length === 32) {
    return asB64;
  }
  throw new Error("MFA_KEY_INVALID");
}

export function isMfaKeyUsable(key: string | undefined): boolean {
  if (!key) {
    return false;
  }
  try {
    return decodeMfaKey(key).length === 32;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string, keyMaterial: string): string {
  const key = decodeMfaKey(keyMaterial);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string, keyMaterial: string): string {
  const key = decodeMfaKey(keyMaterial);
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !dataPart) {
    throw new Error("MFA_CIPHERTEXT_INVALID");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
