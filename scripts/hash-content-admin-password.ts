#!/usr/bin/env tsx
/**
 * Generate a CONTENT_ADMIN_PASSWORD_HASH for environment configuration.
 * Usage: npx tsx scripts/hash-content-admin-password.ts 'your-password'
 */
import { hashPassword } from "../src/lib/cms/crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npx tsx scripts/hash-content-admin-password.ts '<password>'");
  process.exit(1);
}

console.log(hashPassword(password));
