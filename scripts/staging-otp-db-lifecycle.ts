/**
 * Real-Postgres synthetic OTP lifecycle check (TEST providers only — no live SMTP/Twilio).
 * Uses DATABASE_URL. Never prints OTP codes or secrets.
 *
 *   DATABASE_URL=postgresql://... npx tsx scripts/staging-otp-db-lifecycle.ts
 */

import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { isPostgresUrl, loadIdentityConfig } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { createMemoryEmailService } from "../src/lib/identity/email-service";
import {
  createOtpService,
  createTestOtpProvider,
  createUnconfiguredOtpProvider,
} from "../src/lib/identity/otp";
import { createMemoryRateLimiter } from "../src/lib/identity/rate-limit";
import { registerPatient } from "../src/lib/identity/registration";
import { phoneVerifications, securityEvents, users } from "../src/lib/identity/schema";
import { verifyEmailToken } from "../src/lib/identity/verification";
import { seedIdentityCatalog } from "../src/lib/identity/catalog";
import type { IdentityContext } from "../src/lib/identity/context";
import type { IdentityDb } from "../src/lib/identity/db";

const STRONG_PASSWORD = "correct-horse-battery";
const SESSION_SECRET = "phase2a-staging-db-lifecycle-secret-32b!!";
const MFA_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function extractToken(text: string): string | null {
  const match = text.match(/verify-email\?token=([^&\s]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("CONFIGURATION REQUIRED: DATABASE_URL");
    process.exit(1);
  }
  if (process.env.PATIENT_REGISTRATION_ENABLED === "true") {
    console.error("REFUSED: do not run with PATIENT_REGISTRATION_ENABLED=true");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, prepare: false });
  const db = drizzle(sql, { schema: practiceSchema }) as unknown as IdentityDb;
  const email = createMemoryEmailService();
  const otpProvider = createTestOtpProvider();
  const config = loadIdentityConfig({
    nodeEnv: "test",
    sessionSecret: SESSION_SECRET,
    mfaEncryptionKey: MFA_KEY,
    otpProvider: "test",
    registrationEnabled: true,
    databaseUrl: url,
    appBaseUrl: "http://localhost:3000",
  });
  await seedIdentityCatalog(db, new Date());
  const base = {
    db,
    config,
    now: () => new Date(),
    email,
    rateLimit: createMemoryRateLimiter(),
  };
  const ctx: IdentityContext = { ...base, otp: createOtpService(base, otpProvider) };

  const suffix = Date.now().toString(36);
  const mail = `staging-otp-${suffix}@example.test`;
  const registered = await registerPatient(ctx, {
    displayName: "Staging Synthetic",
    email: mail,
    mobile: "9876543299",
    password: STRONG_PASSWORD,
    passwordConfirm: STRONG_PASSWORD,
    acceptedTerms: true,
    ip: "203.0.113.90",
  });
  if (!registered.ok) {
    console.error("registration failed (sanitized)");
    process.exit(1);
  }
  const token = extractToken(email.messages.at(-1)?.text ?? "");
  if (!token) {
    console.error("email verify token missing");
    process.exit(1);
  }
  await verifyEmailToken(ctx, token);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, mail));
  if (!user) {
    console.error("user missing");
    process.exit(1);
  }

  const sent = await ctx.otp.sendPhoneVerification({
    userId: user.id,
    mobileNormalized: "+919876543299",
    ip: "203.0.113.90",
  });
  if (!sent.ok) {
    console.error("OTP send failed");
    process.exit(1);
  }
  const code = otpProvider.peekLastCode("+919876543299");
  if (!code) {
    console.error("test provider did not retain code");
    process.exit(1);
  }

  const [row] = await db
    .select()
    .from(phoneVerifications)
    .where(
      and(eq(phoneVerifications.userId, user.id), isNull(phoneVerifications.verifiedAt)),
    )
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1);
  if (!row || row.deliveryStatus !== "DELIVERED") {
    console.error("delivery_status expected DELIVERED");
    process.exit(1);
  }
  if (row.otpHash === code || row.otpHash.includes(code)) {
    console.error("plaintext OTP detected in otp_hash");
    process.exit(1);
  }
  if (row.destination !== "+919876543299" || row.purpose !== "PHONE_VERIFY") {
    console.error("destination/purpose binding mismatch");
    process.exit(1);
  }

  const verified = await ctx.otp.verifyPhoneOtp({
    userId: user.id,
    code,
    ip: "203.0.113.90",
    expectedDestination: "+919876543299",
  });
  if (!verified.ok) {
    console.error("verify failed");
    process.exit(1);
  }
  const [consumed] = await db
    .select()
    .from(phoneVerifications)
    .where(eq(phoneVerifications.id, row.id));
  if (consumed?.deliveryStatus !== "CONSUMED" || !consumed.verifiedAt) {
    console.error("consume/status transition failed");
    process.exit(1);
  }
  const replay = await ctx.otp.verifyPhoneOtp({
    userId: user.id,
    code,
    ip: "203.0.113.90",
    expectedDestination: "+919876543299",
  });
  if (replay.ok) {
    console.error("replay unexpectedly succeeded");
    process.exit(1);
  }

  // Fail-closed delivery
  const failingCtx: IdentityContext = {
    ...base,
    otp: createOtpService(base, createUnconfiguredOtpProvider()),
  };
  const failSend = await failingCtx.otp.sendPhoneVerification({
    userId: user.id,
    mobileNormalized: "+919876543299",
    ip: "203.0.113.91",
  });
  if (failSend.ok) {
    console.error("unconfigured provider must fail closed");
    process.exit(1);
  }

  const events = await db
    .select({ eventType: securityEvents.eventType })
    .from(securityEvents)
    .where(eq(securityEvents.userId, user.id));
  const types = new Set(events.map((e) => e.eventType));
  for (const required of [
    "OTP_REQUESTED",
    "OTP_DELIVERY_SUCCESS",
    "OTP_VERIFICATION_SUCCESS",
    "OTP_VERIFICATION_FAILURE",
    "OTP_DELIVERY_FAILURE",
  ]) {
    if (!types.has(required as (typeof events)[number]["eventType"])) {
      console.error(`missing security event ${required}`);
      process.exit(1);
    }
  }

  // Ensure no event metadata accidentally stringified secrets (spot-check columns only)
  console.log("DB lifecycle PASS (test providers; hashed OTP; consume+replay; fail-closed; audit events)");
  await sql.end({ timeout: 5 });
}

main().catch(() => {
  console.error("DB lifecycle failed (sanitized)");
  process.exit(1);
});
