import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";

import { appendAuditLog, recordSecurityEvent } from "@/lib/identity/audit";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import type { IdentityContext } from "@/lib/identity/context";
import { generateNumericOtp, generateUuid, hashWithSecret } from "@/lib/identity/crypto";
import { otpAttempts, phoneVerifications } from "@/lib/identity/schema";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";
import type {
  OtpChannel,
  OtpDeliveryProvider,
  OtpDeliveryResult,
  OtpPurpose,
} from "@/lib/identity/otp-types";

export type {
  OtpChannel,
  OtpDeliveryProvider,
  OtpDeliveryResult,
  OtpDeliveryStatus,
  OtpPurpose,
} from "@/lib/identity/otp-types";

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

export type OtpSendFailureCode =
  | "RATE_LIMITED"
  | "COOLDOWN"
  | "PROVIDER_FAILURE"
  | "UNCONFIGURED"
  | "NOT_CONFIGURED_SECRET"
  | "INVALID_DESTINATION";

export type OtpSendResult =
  | { ok: true }
  | {
      ok: false;
      code: OtpSendFailureCode;
      message: string;
    };

export type OtpService = {
  sendPhoneVerification: (input: {
    userId: string;
    mobileNormalized: string;
    ip: string;
  }) => Promise<OtpSendResult>;
  sendPasswordResetSms: (input: {
    userId: string;
    mobileNormalized: string;
    ip: string;
  }) => Promise<OtpSendResult>;
  sendEmailOtp: (input: {
    userId: string;
    emailNormalized: string;
    purpose: Extract<OtpPurpose, "EMAIL_VERIFY" | "EMAIL_LOGIN" | "PASSWORD_RESET">;
    ip: string;
  }) => Promise<OtpSendResult>;
  verifyPhoneOtp: (input: {
    userId: string;
    code: string;
    ip: string;
    expectedDestination?: string;
  }) => Promise<OtpVerifyResult>;
  verifyPasswordResetSms: (input: {
    userId: string;
    code: string;
    ip: string;
    expectedDestination: string;
  }) => Promise<OtpVerifyResult>;
  verifyEmailOtp: (input: {
    userId: string;
    code: string;
    ip: string;
    purpose: Extract<OtpPurpose, "EMAIL_VERIFY" | "EMAIL_LOGIN" | "PASSWORD_RESET">;
    expectedDestination: string;
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
    purpose: OtpPurpose;
    result: string;
  },
): Promise<void> {
  await ctx.db.insert(otpAttempts).values({
    id: generateUuid(),
    userId: input.userId,
    purpose: input.purpose,
    ipHash: hashedIp(ctx, input.ip),
    result: input.result,
    createdAt: ctx.now(),
  });
}

async function consumeLatestOtpChallenge(
  ctx: IdentityContext,
  input: {
    userId: string;
    code: string;
    ip: string;
    purpose: OtpPurpose;
    channel: OtpChannel;
    expectedDestination?: string;
  },
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
        eq(phoneVerifications.purpose, input.purpose),
        eq(phoneVerifications.channel, input.channel),
        isNull(phoneVerifications.verifiedAt),
        eq(phoneVerifications.deliveryStatus, "DELIVERED"),
      ),
    )
    .orderBy(desc(phoneVerifications.createdAt))
    .limit(1);

  if (!latest) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_VERIFICATION_FAILURE",
      metadata: { reason: "missing", purpose: input.purpose },
    });
    return { ok: false, code: "INVALID", message: SAFE_MESSAGES.otpInvalid };
  }

  if (
    input.expectedDestination &&
    latest.destination &&
    latest.destination !== input.expectedDestination
  ) {
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_VERIFICATION_FAILURE",
      metadata: { reason: "destination_mismatch", purpose: input.purpose },
    });
    return { ok: false, code: "INVALID", message: SAFE_MESSAGES.otpInvalid };
  }

  if (latest.expiresAt.getTime() <= now.getTime()) {
    await ctx.db
      .update(phoneVerifications)
      .set({ deliveryStatus: "EXPIRED" })
      .where(
        and(
          eq(phoneVerifications.id, latest.id),
          isNull(phoneVerifications.verifiedAt),
        ),
      );
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_EXPIRED",
      metadata: { purpose: input.purpose },
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
      deliveryStatus: "CONSUMED",
    })
    .where(
      and(
        eq(phoneVerifications.id, latest.id),
        isNull(phoneVerifications.verifiedAt),
        eq(phoneVerifications.otpHash, presented),
        eq(phoneVerifications.purpose, input.purpose),
        eq(phoneVerifications.channel, input.channel),
        eq(phoneVerifications.deliveryStatus, "DELIVERED"),
        gt(phoneVerifications.expiresAt, now),
        sql`${phoneVerifications.attemptCount} < ${phoneVerifications.maxAttempts}`,
      ),
    )
    .returning({ id: phoneVerifications.id });

  if (consumed.length > 0) {
    await recordOtpAttempt(ctx, {
      userId: input.userId,
      ip: input.ip,
      purpose: input.purpose,
      result: "VERIFY_SUCCESS",
    });
    await appendAuditLog(ctx, {
      actorUserId: input.userId,
      action:
        input.channel === "SMS" ? "PHONE_VERIFIED" : "EMAIL_OTP_VERIFIED",
      targetType: "user",
      targetId: input.userId,
      result: "SUCCESS",
    });
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_VERIFICATION_SUCCESS",
      metadata: { purpose: input.purpose, channel: input.channel },
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
    purpose: input.purpose,
    result: "VERIFY_FAILURE",
  });
  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "OTP_VERIFICATION_FAILURE",
    metadata: { reason: "mismatch", purpose: input.purpose },
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

/**
 * Atomically consume the latest unused phone OTP for a user.
 * Safe under concurrent verification attempts: only one UPDATE can win.
 */
export async function consumeLatestPhoneOtp(
  ctx: IdentityContext,
  input: { userId: string; code: string; ip: string; expectedDestination?: string },
): Promise<OtpVerifyResult> {
  return consumeLatestOtpChallenge(ctx, {
    userId: input.userId,
    code: input.code,
    ip: input.ip,
    purpose: "PHONE_VERIFY",
    channel: "SMS",
    expectedDestination: input.expectedDestination,
  });
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

async function issueOtpChallenge(
  ctx: IdentityContext,
  provider: OtpDeliveryProvider,
  input: {
    userId: string;
    destination: string;
    purpose: OtpPurpose;
    channel: OtpChannel;
    ip: string;
  },
): Promise<OtpSendResult> {
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
      eventType: "OTP_DELIVERY_FAILURE",
      metadata: { reason: "production_forbidden", purpose: input.purpose },
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
  const destinationLimit = await ctx.rateLimit.consume(
    `otp-send-dest:${input.channel}:${input.destination}`,
    IDENTITY_RATE_LIMITS.otpSendDestination.max,
    IDENTITY_RATE_LIMITS.otpSendDestination.windowMs,
  );
  if (!ipLimit.allowed || !accountLimit.allowed || !destinationLimit.allowed) {
    await recordOtpAttempt(ctx, {
      userId: input.userId,
      ip: input.ip,
      purpose: input.purpose,
      result: "RATE_LIMITED",
    });
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_RATE_LIMITED",
      metadata: { purpose: input.purpose, channel: input.channel },
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
        eq(phoneVerifications.purpose, input.purpose),
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
  const challengeId = generateUuid();
  const now = ctx.now();

  await ctx.db
    .update(phoneVerifications)
    .set({
      expiresAt: now,
      deliveryStatus: "EXPIRED",
    })
    .where(
      and(
        eq(phoneVerifications.userId, input.userId),
        eq(phoneVerifications.purpose, input.purpose),
        isNull(phoneVerifications.verifiedAt),
      ),
    );

  await ctx.db.insert(phoneVerifications).values({
    id: challengeId,
    userId: input.userId,
    destination: input.destination,
    purpose: input.purpose,
    channel: input.channel,
    otpHash: hashWithSecret("otp", code, ctx.config.sessionSecret),
    expiresAt: new Date(now.getTime() + ctx.config.otpTtlMs),
    attemptCount: 0,
    maxAttempts: ctx.config.otpMaxAttempts,
    deliveryStatus: "CREATED",
    lastSentAt: null,
    verifiedAt: null,
    createdAt: now,
  });

  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "OTP_REQUESTED",
    metadata: { purpose: input.purpose, channel: input.channel },
  });

  await ctx.db
    .update(phoneVerifications)
    .set({ deliveryStatus: "DELIVERY_ATTEMPTED" })
    .where(eq(phoneVerifications.id, challengeId));

  const delivered = await provider.deliver({
    destination: input.destination,
    purpose: input.purpose,
    channel: input.channel,
    code,
  });

  if (!delivered.ok) {
    await ctx.db
      .update(phoneVerifications)
      .set({
        deliveryStatus: "DELIVERY_FAILED",
        expiresAt: ctx.now(),
      })
      .where(eq(phoneVerifications.id, challengeId));
    await recordOtpAttempt(ctx, {
      userId: input.userId,
      ip: input.ip,
      purpose: input.purpose,
      result: "PROVIDER_FAILURE",
    });
    await recordSecurityEvent(ctx, {
      userId: input.userId,
      eventType: "OTP_DELIVERY_FAILURE",
      metadata: { reason: delivered.reason, purpose: input.purpose },
    });
    return {
      ok: false,
      code:
        delivered.reason === "unconfigured" ||
        delivered.reason === "production_forbidden"
          ? "UNCONFIGURED"
          : "PROVIDER_FAILURE",
      message: SAFE_MESSAGES.otpUnavailable,
    };
  }

  await ctx.db
    .update(phoneVerifications)
    .set({
      deliveryStatus: "DELIVERED",
      lastSentAt: ctx.now(),
    })
    .where(eq(phoneVerifications.id, challengeId));

  await recordOtpAttempt(ctx, {
    userId: input.userId,
    ip: input.ip,
    purpose: input.purpose,
    result: "SENT",
  });
  await recordSecurityEvent(ctx, {
    userId: input.userId,
    eventType: "OTP_DELIVERY_SUCCESS",
    metadata: { purpose: input.purpose, channel: input.channel },
  });
  return { ok: true };
}

export function createOtpService(
  ctxBase: Omit<IdentityContext, "otp">,
  provider: OtpDeliveryProvider,
): OtpService {
  return {
    async sendPhoneVerification(input) {
      const ctx = ctxBase as IdentityContext;
      return issueOtpChallenge(ctx, provider, {
        userId: input.userId,
        destination: input.mobileNormalized,
        purpose: "PHONE_VERIFY",
        channel: "SMS",
        ip: input.ip,
      });
    },

    async sendPasswordResetSms(input) {
      const ctx = ctxBase as IdentityContext;
      return issueOtpChallenge(ctx, provider, {
        userId: input.userId,
        destination: input.mobileNormalized,
        purpose: "PASSWORD_RESET",
        channel: "SMS",
        ip: input.ip,
      });
    },

    async sendEmailOtp(input) {
      const ctx = ctxBase as IdentityContext;
      return issueOtpChallenge(ctx, provider, {
        userId: input.userId,
        destination: input.emailNormalized,
        purpose: input.purpose,
        channel: "EMAIL",
        ip: input.ip,
      });
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

    async verifyPasswordResetSms(input) {
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
      return consumeLatestOtpChallenge(ctx, {
        userId: input.userId,
        code: input.code,
        ip: input.ip,
        purpose: "PASSWORD_RESET",
        channel: "SMS",
        expectedDestination: input.expectedDestination,
      });
    },

    async verifyEmailOtp(input) {
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
      return consumeLatestOtpChallenge(ctx, {
        userId: input.userId,
        code: input.code,
        ip: input.ip,
        purpose: input.purpose,
        channel: "EMAIL",
        expectedDestination: input.expectedDestination,
      });
    },
  };
}
