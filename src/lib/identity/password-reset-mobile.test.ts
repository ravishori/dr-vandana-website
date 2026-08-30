import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { loginWithPassword } from "@/lib/identity/authentication";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  generateTotpCodeForTests,
} from "@/lib/identity/mfa";
import {
  requestPasswordResetByIdentifier,
  resetPasswordWithToken,
  verifyMobilePasswordResetOtp,
} from "@/lib/identity/password-reset";
import { provisionPrivilegedUser } from "@/lib/identity/provision";
import { mfaCredentials, phoneVerifications, sessions, users } from "@/lib/identity/schema";
import {
  createIdentityTestWorld,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";

const STRONG_PASSWORD = "correct-horse-battery";
const NEW_PASSWORD = "another-strong-pass";
const TEMP_PASSWORD = "12345";

describe("mobile password reset OTP", () => {
  const worlds: IdentityTestWorld[] = [];

  afterEach(async () => {
    while (worlds.length) {
      const world = worlds.pop();
      if (world) {
        await world.close();
      }
    }
  });

  async function world() {
    const created = await createIdentityTestWorld();
    worlds.push(created);
    return created;
  }

  async function provisionWithVerifiedMobile(w: IdentityTestWorld) {
    const provisioned = await provisionPrivilegedUser(w.ctx, {
      role: "PSYCHOLOGIST",
      email: "reset-psy@example.test",
      password: TEMP_PASSWORD,
      displayName: "Reset Psychologist",
      mobile: "9876543210",
      mustChangePassword: true,
    });
    assert.equal(provisioned.ok, true);
    if (!provisioned.ok) {
      throw new Error("provision failed");
    }
    return provisioned;
  }

  it("accepts unknown mobile with a generic response and does not send OTP", async () => {
    const w = await world();
    const result = await requestPasswordResetByIdentifier(w.ctx, {
      identifier: "9000000000",
      ip: "203.0.113.50",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.message, SAFE_MESSAGES.passwordResetAccepted);
    assert.equal(result.channelHint, "sms");
    assert.equal(w.otpProvider.peekLastCode("+919000000000"), undefined);
  });

  it("requires verified mobile before sending password-reset OTP", async () => {
    const w = await world();
    const provisioned = await provisionWithVerifiedMobile(w);
    await w.ctx.db
      .update(users)
      .set({ mobileVerifiedAt: null })
      .where(eq(users.id, provisioned.userId));

    const result = await requestPasswordResetByIdentifier(w.ctx, {
      identifier: "9876543210",
      ip: "203.0.113.51",
    });
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.message, SAFE_MESSAGES.passwordResetAccepted);
    assert.equal(w.otpProvider.peekLastCode("+919876543210"), undefined);
  });

  it("sends hashed single-use OTP, resets password, invalidates sessions, preserves MFA", async () => {
    const w = await world();
    const provisioned = await provisionWithVerifiedMobile(w);

    const login = await loginWithPassword(w.ctx, {
      email: "reset-psy@example.test",
      password: TEMP_PASSWORD,
      ip: "203.0.113.52",
      expectedRole: "PSYCHOLOGIST",
    });
    assert.equal(login.ok, true);
    if (!login.ok) {
      return;
    }

    const begin = await beginMfaEnrollment(w.ctx, { userId: provisioned.userId });
    assert.equal(begin.ok, true);
    if (!begin.ok) {
      return;
    }
    const timestamp = w.ctx.now().getTime();
    const confirmed = await confirmMfaEnrollment(w.ctx, {
      userId: provisioned.userId,
      code: generateTotpCodeForTests(
        begin.secretBase32,
        timestamp,
        "reset-psy@example.test",
      ),
      timestamp,
    });
    assert.equal(confirmed.ok, true);

    const requested = await requestPasswordResetByIdentifier(w.ctx, {
      identifier: "9876543210",
      ip: "203.0.113.53",
    });
    assert.equal(requested.ok, true);
    if (!requested.ok) {
      return;
    }
    assert.equal(requested.channelHint, "sms");
    const code = w.otpProvider.peekLastCode("+919876543210");
    assert.ok(code);
    assert.equal(code.length, 6);

    const [challenge] = await w.ctx.db
      .select({
        otpHash: phoneVerifications.otpHash,
        purpose: phoneVerifications.purpose,
        channel: phoneVerifications.channel,
      })
      .from(phoneVerifications)
      .where(eq(phoneVerifications.userId, provisioned.userId));
    assert.equal(challenge?.purpose, "PASSWORD_RESET");
    assert.equal(challenge?.channel, "SMS");
    assert.notEqual(challenge?.otpHash, code);

    const bad = await verifyMobilePasswordResetOtp(w.ctx, {
      mobile: "9876543210",
      code: "000000",
      ip: "203.0.113.54",
    });
    assert.equal(bad.ok, false);

    const verified = await verifyMobilePasswordResetOtp(w.ctx, {
      mobile: "9876543210",
      code,
      ip: "203.0.113.54",
    });
    assert.equal(verified.ok, true);
    if (!verified.ok) {
      return;
    }
    assert.ok(verified.resetToken);
    assert.notEqual(verified.resetToken, code);

    const replay = await verifyMobilePasswordResetOtp(w.ctx, {
      mobile: "9876543210",
      code,
      ip: "203.0.113.54",
    });
    assert.equal(replay.ok, false);

    const reset = await resetPasswordWithToken(w.ctx, {
      token: verified.resetToken,
      password: NEW_PASSWORD,
      passwordConfirm: NEW_PASSWORD,
    });
    assert.equal(reset.ok, true);

    const staleSession = await w.ctx.db
      .select({ revokedAt: sessions.revokedAt })
      .from(sessions)
      .where(eq(sessions.id, login.sessionId));
    assert.ok(staleSession[0]?.revokedAt);

    const [mfa] = await w.ctx.db
      .select({ id: mfaCredentials.id })
      .from(mfaCredentials)
      .where(eq(mfaCredentials.userId, provisioned.userId));
    assert.ok(mfa);

    const oldRejected = await loginWithPassword(w.ctx, {
      email: "reset-psy@example.test",
      password: TEMP_PASSWORD,
      ip: "203.0.113.55",
      expectedRole: "PSYCHOLOGIST",
    });
    assert.equal(oldRejected.ok, false);

    const newLogin = await loginWithPassword(w.ctx, {
      email: "9876543210",
      password: NEW_PASSWORD,
      ip: "203.0.113.56",
      expectedRole: "PSYCHOLOGIST",
    });
    assert.equal(newLogin.ok, true);
    if (!newLogin.ok) {
      return;
    }
    assert.equal(newLogin.mfaEnrolled, true);
    assert.equal(newLogin.mfaRequired, true);
    assert.equal(newLogin.mustChangePassword, false);
  });

  it("rejects expired password-reset OTP", async () => {
    const w = await world();
    await provisionWithVerifiedMobile(w);
    const requested = await requestPasswordResetByIdentifier(w.ctx, {
      identifier: "9876543210",
      ip: "203.0.113.57",
    });
    assert.equal(requested.ok, true);
    const code = w.otpProvider.peekLastCode("+919876543210");
    assert.ok(code);
    w.advanceMs(w.ctx.config.otpTtlMs + 1_000);
    const expired = await verifyMobilePasswordResetOtp(w.ctx, {
      mobile: "9876543210",
      code,
      ip: "203.0.113.58",
    });
    assert.equal(expired.ok, false);
  });

  it("does not allow arbitrary mobile to reset another account", async () => {
    const w = await world();
    await provisionWithVerifiedMobile(w);
    await requestPasswordResetByIdentifier(w.ctx, {
      identifier: "9876543210",
      ip: "203.0.113.59",
    });
    const code = w.otpProvider.peekLastCode("+919876543210");
    assert.ok(code);
    const stolen = await verifyMobilePasswordResetOtp(w.ctx, {
      mobile: "9000000001",
      code,
      ip: "203.0.113.60",
    });
    assert.equal(stolen.ok, false);
  });

  it("rate-limits repeated password-reset requests for the same mobile", async () => {
    const w = await world();
    await provisionWithVerifiedMobile(w);
    let limited = false;
    for (let i = 0; i < 8; i += 1) {
      const result = await requestPasswordResetByIdentifier(w.ctx, {
        identifier: "9876543210",
        ip: `203.0.113.${70 + i}`,
      });
      if (!result.ok) {
        limited = true;
        assert.equal(result.message, SAFE_MESSAGES.rateLimited);
        break;
      }
      w.advanceMs(w.ctx.config.otpResendCooldownMs + 1);
    }
    assert.equal(limited, true);
  });
});
