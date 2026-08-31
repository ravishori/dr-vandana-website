import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { seedIdentityCatalog } from "@/lib/identity/catalog";
import { loadIdentityConfig } from "@/lib/identity/config";
import type { IdentityContext } from "@/lib/identity/context";
import {
  applyIdentityMigrationSql,
  practiceSchema,
  type IdentityDb,
} from "@/lib/identity/db";
import { createMemoryEmailService } from "@/lib/identity/email-service";
import { createOtpService, createTestOtpProvider, createUnconfiguredOtpProvider, type OtpDeliveryProvider } from "@/lib/identity/otp";
import { createMemoryRateLimiter } from "@/lib/identity/rate-limit";

export const TEST_SESSION_SECRET = "identity-test-session-secret-32chars!!";
export const TEST_MFA_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export type IdentityTestWorld = {
  ctx: IdentityContext;
  email: ReturnType<typeof createMemoryEmailService>;
  otpProvider: ReturnType<typeof createTestOtpProvider>;
  advanceMs: (ms: number) => void;
  close: () => Promise<void>;
};

export async function createIdentityTestWorld(options?: {
  otpProvider?: OtpDeliveryProvider;
  nodeEnv?: "test" | "development" | "production";
  registrationEnabled?: boolean;
  identityProvisionEnabled?: boolean;
}): Promise<IdentityTestWorld> {
  const client = new PGlite();
  await applyIdentityMigrationSql((sql) => client.exec(sql));
  const db = drizzle(client, { schema: practiceSchema }) as unknown as IdentityDb;
  let nowMs = Date.UTC(2026, 7, 14, 9, 0, 0);
  const config = loadIdentityConfig({
    nodeEnv: options?.nodeEnv ?? "test",
    sessionSecret: TEST_SESSION_SECRET,
    mfaEncryptionKey: TEST_MFA_KEY,
    otpProvider: "test",
    appBaseUrl: "http://localhost:3000",
    registrationEnabled: options?.registrationEnabled ?? true,
    identityProvisionEnabled: options?.identityProvisionEnabled ?? true,
    databaseUrl: "pglite",
  });
  await seedIdentityCatalog(db, new Date(nowMs));
  const email = createMemoryEmailService();
  const otpProvider =
    options?.otpProvider ??
    (options?.nodeEnv === "production"
      ? createUnconfiguredOtpProvider()
      : createTestOtpProvider());
  const rateLimit = createMemoryRateLimiter({ now: () => nowMs });
  const base = {
    db,
    config,
    now: () => new Date(nowMs),
    email,
    rateLimit,
  };
  const otp = createOtpService(base, otpProvider);
  const ctx: IdentityContext = { ...base, otp };
  return {
    ctx,
    email,
    otpProvider: otpProvider as ReturnType<typeof createTestOtpProvider>,
    advanceMs(ms) {
      nowMs += ms;
    },
    async close() {
      await client.close();
    },
  };
}

export function extractTokenFromLastEmail(
  email: ReturnType<typeof createMemoryEmailService>,
  kind: "verify" | "reset",
): string | null {
  const last = email.messages.at(-1);
  if (!last) {
    return null;
  }
  const pattern =
    kind === "verify"
      ? /verify-email\?token=([^&\s]+)/
      : /reset-password\?token=([^&\s]+)/;
  const match = last.text.match(pattern);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
