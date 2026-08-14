import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateNumericOtp, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { otpAttempts, phoneVerifications } from "@/lib/identity/schema";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";

export type OtpPurpose = "PHONE_VERIFY";

export type OtpDeliveryResult =
  | { ok: true }
  | { ok: false; reason: "provider_error" | "unconfigured" | "production_forbidden" };

/**
 * Delivery-only abstraction. The domain service generates and hashes OTPs.
 * Providers must never log the code.
 */
export type OtpDeliveryProvider = {
  readonly id: string;
  /** TEST ONLY providers must set this to true. */
  readonly testOnly: boolean;
  deliver: (input: {
    destination: string;
    purpose: OtpPurpose;
    code: string;
  }) => Promise<OtpDeliveryResult>;
};

export type OtpVerifyFailureCode =
  | "INVALID"
  | "EXPIRED"
  | "TOO_MANY_ATTEMPTS"
  | "RATE_LIMITED";

export type OtpVerifyResult =
  | { ok: true }
  | {
      ok: false;
      code: OtpVerifyFailureCode;
      message: string;
    };

export type OtpService = {
  sendPhoneVerification: (input: {
    userId: string;
    mobileNormalized: string;
    ip: string;
  }) => Promise<
    | { ok: true }
    | {
        ok: false;
        code:
          | "RATE_LIMITED"
          | "COOLDOWN"
          | "PROVIDER_FAILURE"
          | "UNCONFIGURED"
          | "NOT_CONFIGURED_SECRET";
        message: string;
      }
  >;
  verifyPhoneOtp: (input: {
    userId: string;
    code: string;
    ip: string;
  }) => Promise<OtpVerifyResult>;
};

function hashedIp(ctx: IdentityContext, ip: string): string | null {
  if (!ctx.config.sessionSecret) {
    return null;
  }
  return hashWithSecret("ip", ip, ctx.config.sessionSecret);
}

async function recordOtpAttempt(
  ctx: IdentityContext,
  input: {
    userId: string;
    ip: string;
    result: string;
  },
): Promise<void> {
  await ctx.db.insert(otpAttempts).values({
    id: generateUuid(),
    userId: input.userId,
    purpose: "PHONE_VERIFY",
    ipHash: hashedIp(ctx, input.ip),
    result: input.result,
    createdAt: ctx.now(),
  });
}

/**
 * Atomically consume the latest unused OTP for a user.
 * Safe under concurrent verification attempts: only one UPDATE can win.
 */
export async function consumeLatestPhoneOtp(
  ctx: IdentityContext,
  input: { userId: string; code: string; ip: string },
): Promise<OtpVerifyResult> {
  if (!ctx.config.sessionSecret) {
    return {
      ok: false,
      code: "INVALID",
      message: SAFE_MESSAGES.otpInvalid,
    };
  }

  const now = ctx.now();
  const [latest] = await ctx.db
    .select()
    .from(phoneVerifications)
    .where(
      and(
        eq(phoneVerifications.userId, input.userId),
        isNull(phoneVerifications.verifiedAt),
      ),
    )
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1);

  if (!latest) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_FAILURE",
      metadata: { reason: "missing" },
    });
    return { ok: false, code: "INVALID", message: SAFE_MESSAGES.otpInvalid };
  }
  if (latest.expiresAt.getTime() <= now.getTime()) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_FAILURE",
      metadata: { reason: "expired" },
    });
    return { ok: false, code: "EXPIRED", message: SAFE_MESSAGES.otpInvalid };
  }
  if (latest.attemptCount >= latest.maxAttempts) {
    return {
      ok: false,
      code: "TOO_MANY_ATTEMPTS",
      message: SAFE_MESSAGES.otpInvalid,
    };
  }

  const presented = hashWithSecret("otp", input.code.trim(), ctx.config.sessionSecret);
  const consumed = await ctx.db
    .update(phoneVerifications)
    .set({
      verifiedAt: now,
      attemptCount: sql`${phoneVerifications.attemptCount} + 1`,
    })
    .where(
      and(
        eq(phoneVerifications.id, latest.id),
        isNull(phoneVerifications.verifiedAt),
        eq(phoneVerifications.otpHash, presented),
        gt(phoneVerifications.expiresAt, now),
        sql`${phoneVerifications.attemptCount} < ${phoneVerifications.maxAttempts}`,
      ),
    )
    .returning({ id: phoneVerifications.id });

  if (consumed.length > 0) {
    await recordOtpAttempt(ctx, {
      userId: input.userId,
      ip: input.ip,
      result: "VERIFY_SUCCESS",
    });
    await appendAuditLog(ctx, {
      actorUserId: input.userId,
      action: "PHONE_VERIFIED",
      targetType: "user",
      targetId: input.userId,
      result: "SUCCESS",
    });
    return { ok: true };
  }

  const incremented = await ctx.db
    .update(phoneVerifications)
    .set({
      attemptCount: sql`${phoneVerifications.attemptCount} + 1`,
    })
    .where(
      and(
        eq(phoneVerifications.id, latest.id),
        isNull(phoneVerifications.verifiedAt),
        sql`${phoneVerifications.attemptCount} < ${phoneVerifications.maxAttempts}`,
      ),
    )
    .returning({
      attemptCount: phoneVerifications.attemptCount,
      maxAttempts: phoneVerifications.maxAttempts,
    });

  await recordOtpAttempt(ctx, {
    userId: input.userId,
    ip: input.ip,
    result: "VERIFY_FAILURE",
  });
  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "OTP_FAILURE",
    metadata: { reason: "mismatch" },
  });

  const nextCount = incremented[0]?.attemptCount ?? latest.attemptCount + 1;
  const maxAttempts = incremented[0]?.maxAttempts ?? latest.maxAttempts;
  if (nextCount >= maxAttempts) {
    return {
      ok: false,
      code: "TOO_MANY_ATTEMPTS",
      message: SAFE_MESSAGES.otpInvalid,
    };
  }
  return { ok: false, code: "INVALID", message: SAFE_MESSAGES.otpInvalid };
}

export function createTestOtpProvider(): OtpDeliveryProvider & {
  /** TEST ONLY. Never log. Exposed for automated tests. */
  peekLastCode: (destination: string) => string | undefined;
} {
  const lastCodes = new Map<string, string>();
  return {
    id: "test",
    testOnly: true,
    async deliver(input) {
      lastCodes.set(input.destination, input.code);
      return { ok: true };
    },
    peekLastCode(destination) {
      return lastCodes.get(destination);
    },
  };
}

export function createUnconfiguredOtpProvider(): OtpDeliveryProvider {
  return {
    id: "unconfigured",
    testOnly: false,
    async deliver() {
      return { ok: false, reason: "unconfigured" };
    },
  };
}

export function createProductionBoundaryOtpProvider(): OtpDeliveryProvider {
  return {
    id: "production_required",
    testOnly: false,
    async deliver() {
      return { ok: false, reason: "unconfigured" };
    },
  };
}

export function assertOtpProviderAllowed(
  provider: OtpDeliveryProvider,
  nodeEnv: string,
): OtpDeliveryResult | null {
  if (nodeEnv === "production" && provider.testOnly) {
    return { ok: false, reason: "production_forbidden" };
  }
  return null;
}

export function createOtpService(
  ctxBase: Omit<IdentityContext, "otp">,
  provider: OtpDeliveryProvider,
): OtpService {
  return {
    async sendPhoneVerification(input) {
      const ctx = ctxBase as IdentityContext;
      if (!ctx.config.sessionSecret) {
        return {
          ok: false,
          code: "NOT_CONFIGURED_SECRET",
          message: SAFE_MESSAGES.notConfigured,
        };
      }
      const forbidden = assertOtpProviderAllowed(provider, ctx.config.nodeEnv);
      if (forbidden) {
        await recordSecurityEvent(ctx, {
          userId: input.userId,
          eventType: "OTP_FAILURE",
          metadata: { reason: "production_forbidden" },
        });
        return {
          ok: false,
          code: "UNCONFIGURED",
          message: SAFE_MESSAGES.otpUnavailable,
        };
      }

      const ipLimit = await ctx.rateLimit.consume(
        `otp-send-ip:${input.ip}`,
        IDENTITY_RATE_LIMITS.otpSendIp.max,
        IDENTITY_RATE_LIMITS.otpSendIp.windowMs,
      );
      const accountLimit = await ctx.rateLimit.consume(
        `otp-send-user:${input.userId}`,
        IDENTITY_RATE_LIMITS.otpSendAccount.max,
        IDENTITY_RATE_LIMITS.otpSendAccount.windowMs,
      );
      if (!ipLimit.allowed || !accountLimit.allowed) {
        await recordOtpAttempt(ctx, {
          userId: input.userId,
          ip: input.ip,
          result: "RATE_LIMITED",
        });
        return {
          ok: false,
          code: "RATE_LIMITED",
          message: SAFE_MESSAGES.rateLimited,
        };
      }

      const [latest] = await ctx.db
        .select()
        .from(phoneVerifications)
        .where(
          and(
            eq(phoneVerifications.userId, input.userId),
            isNull(phoneVerifications.verifiedAt),
          ),
        )
        .orderBy(desc(phoneVerifications.createdAt))
        .limit(1);

      if (
        latest &&
        ctx.now().getTime() - latest.createdAt.getTime() <
          ctx.config.otpResendCooldownMs
      ) {
        return {
          ok: false,
          code: "COOLDOWN",
          message: SAFE_MESSAGES.rateLimited,
        };
      }

      const code = generateNumericOtp(6);
      const delivered = await provider.deliver({
        destination: input.mobileNormalized,
        purpose: "PHONE_VERIFY",
        code,
      });
      if (!delivered.ok) {
        await recordOtpAttempt(ctx, {
          userId: input.userId,
          ip: input.ip,
          result: "PROVIDER_FAILURE",
        });
        await recordSecurityEvent(ctx, {
          userId: input.userId,
          eventType: "OTP_FAILURE",
          metadata: { reason: delivered.reason },
        });
        return {
          ok: false,
          code: "PROVIDER_FAILURE",
          message: SAFE_MESSAGES.otpUnavailable,
        };
      }

      await ctx.db
        .update(phoneVerifications)
        .set({ expiresAt: ctx.now() })
        .where(
          and(
            eq(phoneVerifications.userId, input.userId),
            isNull(phoneVerifications.verifiedAt),
          ),
        );

      await ctx.db.insert(phoneVerifications).values({
        id: generateUuid(),
        userId: input.userId,
        otpHash: hashWithSecret("otp", code, ctx.config.sessionSecret),
        expiresAt: new Date(ctx.now().getTime() + ctx.config.otpTtlMs),
        attemptCount: 0,
        maxAttempts: ctx.config.otpMaxAttempts,
        verifiedAt: null,
        createdAt: ctx.now(),
      });
      await recordOtpAttempt(ctx, {
        userId: input.userId,
        ip: input.ip,
        result: "SENT",
      });
      await recordSecurityEvent(ctx, {
        userId: input.userId,
        eventType: "OTP_SENT",
        metadata: { purpose: "PHONE_VERIFY" },
      });
      return { ok: true };
    },

    async verifyPhoneOtp(input) {
      const ctx = ctxBase as IdentityContext;
      const ipLimit = await ctx.rateLimit.consume(
        `otp-verify-ip:${input.ip}`,
        IDENTITY_RATE_LIMITS.otpVerifyIp.max,
        IDENTITY_RATE_LIMITS.otpVerifyIp.windowMs,
      );
      if (!ipLimit.allowed) {
        return {
          ok: false,
          code: "RATE_LIMITED",
          message: SAFE_MESSAGES.rateLimited,
        };
      }
      return consumeLatestPhoneOtp(ctx, input);
    },
  };
}
