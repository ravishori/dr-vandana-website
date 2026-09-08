/**
 * Hash a doctor portal password with scrypt for DOCTOR_PASSWORD_HASH.
 *
 * Usage:
 *   npx tsx scripts/hash-doctor-password.ts "your-secure-password"
 *
 * Paste the printed value into .env.local (never commit secrets).
 */

import { hashPassword } from "../src/lib/doctor-auth/crypto";

const password = process.argv[2];

if (!password || password.trim().length < 8) {
  console.error(
    "Usage: npx tsx scripts/hash-doctor-password.ts \"your-secure-password\"",
  );
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const hash = hashPassword(password);
console.log(hash);
