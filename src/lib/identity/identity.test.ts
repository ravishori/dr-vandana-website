import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { loginWithPassword, logoutSession } from "@/lib/identity/authentication";
import {
  authorizationService,
  hasAnyClinicalPermission,
  type AuthorizationPrincipal,
} from "@/lib/identity/authorization";
import { SAFE_MESSAGES } from "@/lib/identity/constants";
import { generateTotpCodeForTests } from "@/lib/identity/mfa";
import {
  beginMfaEnrollment,
  confirmMfaEnrollment,
  consumeRecoveryCode,
  verifyMfaChallenge,
} from "@/lib/identity/mfa";
import { createUnconfiguredOtpProvider, type OtpDeliveryProvider } from "@/lib/identity/otp";
import { loadPrincipal } from "@/lib/identity/principal";
import { assignRole, grantPermissionToRole, provisionPrivilegedUser } from "@/lib/identity/provision";
import { registerPatient } from "@/lib/identity/registration";
import { requestPasswordReset, resetPasswordWithToken } from "@/lib/identity/password-reset";
import { patientProfiles, users } from "@/lib/identity/schema";
import {
  createSession,
  readSession,
  revokeSession,
  sessionCookieOptions,
} from "@/lib/identity/sessions";
import {
  createIdentityTestWorld,
  extractTokenFromLastEmail,
  type IdentityTestWorld,
} from "@/lib/identity/test-harness";
import {
  resendEmailVerification,
  requestPhoneOtpForPendingUser,
  verifyEmailToken,
  verifyPhoneOtpAndActivate,
} from "@/lib/identity/verification";
import { IDENTITY_RATE_LIMITS } from "@/lib/identity/rate-limit";

const STRONG_PASSWORD = "correct-horse-battery";

function patientInput(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Asha Rao",
    email: "asha@example.test",
    mobile: "9876543210",
    password: STRONG_PASSWORD,
    passwordConfirm: STRONG_PASSWORD,
    acceptedTerms: true,
    ip: "203.0.113.10",
    ...overrides,
  };
}

async function registerAndVerifyEmail(world: IdentityTestWorld, email: string, mobile: string) {
  const registered = await registerPatient(
    world.ctx,
    patientInput({ email, mobile }),
  );
  assert.equal(registered.ok, true);
  const token = extractTokenFromLastEmail(world.email, "verify");
  assert.ok(token);
  const verified = await verifyEmailToken(world.ctx, token);
  assert.equal(verified.ok, true);
  return token;
}

async function activatePatient(
  world: IdentityTestWorld,
  email: string,
  mobile: string,
) {
  await registerAndVerifyEmail(world, email, mobile);
  const sent = await requestPhoneOtpForPendingUser(world.ctx, {
    email,
    ip: "203.0.113.10",
  });
  assert.equal(sent.ok, true);
  const normalized = `+91${mobile.replace(/\D/g, "").slice(-10)}`;
  const otp = world.otpProvider.peekLastCode(normalized);
  assert.ok(otp);
  const activated = await verifyPhoneOtpAndActivate(world.ctx, {
    email,
    code: otp,
    ip: "203.0.113.10",
  });
  assert.equal(activated.ok, true);
}

async function principalForSession(
  world: IdentityTestWorld,
  token: string,
): Promise<AuthorizationPrincipal> {
  const session = await readSession(world.ctx, token);
  assert.ok(session);
  return loadPrincipal(world.ctx, session);
}

describe("phase 1 identity foundation", () => {
  const worlds: IdentityTestWorld[] = [];

  afterEach(async () => {
    while (worlds.length > 0) {
      const world = worlds.pop();
      if (world) {
        await world.close();
      }
    }
  });

  async function world(options?: Parameters<typeof createIdentityTestWorld>[0]) {
    const created = await createIdentityTestWorld(options);
    worlds.push(created);
    return created;
  }

  describe("registration", () => {
    it("registers a valid patient without clinical fields", async () => {
      const w = await world();
      const result = await registerPatient(w.ctx, patientInput());
      assert.equal(result.ok, true);
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.ok(user);
      assert.equal(user.status, "PENDING_VERIFICATION");
      assert.match(user.publicId, /^PAT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
      assert.doesNotMatch(user.publicId, /000001/);
      assert.ok(user.passwordHash.startsWith("scrypt$"));
      assert.equal(user.emailNormalized, "asha@example.test");
      const [profile] = await w.ctx.db
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, user.id));
      assert.equal(profile?.displayName, "Asha Rao");
      assert.equal(profile?.dateOfBirth, null);
    });

    it("normalizes email uniqueness", async () => {
      const w = await world();
      assert.equal((await registerPatient(w.ctx, patientInput())).ok, true);
      const emails = w.email.messages.length;
      const duplicate = await registerPatient(
        w.ctx,
        patientInput({ email: "Asha@Example.test", mobile: "9876543211" }),
      );
      assert.equal(duplicate.ok, true);
      const rows = await w.ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.equal(rows.length, 1);
      assert.equal(w.email.messages.length, emails);
    });

    it("rejects duplicate mobile with a privacy-safe message", async () => {
      const w = await world();
      assert.equal((await registerPatient(w.ctx, patientInput())).ok, true);
      const emails = w.email.messages.length;
      const duplicate = await registerPatient(
        w.ctx,
        patientInput({ email: "other@example.test", mobile: "+91 98765 43210" }),
      );
      assert.equal(duplicate.ok, true);
      const rows = await w.ctx.db.select({ id: users.id }).from(users);
      assert.equal(rows.length, 1);
      assert.equal(w.email.messages.length, emails);
    });

    it("rejects invalid input", async () => {
      const w = await world();
      const result = await registerPatient(
        w.ctx,
        patientInput({
          email: "not-an-email",
          password: "short",
          passwordConfirm: "short",
          acceptedTerms: false,
        }),
      );
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, "VALIDATION");
        assert.ok(result.fieldErrors?.email);
        assert.ok(result.fieldErrors?.password);
        assert.ok(result.fieldErrors?.acceptedTerms);
      }
    });

    it("rate limits registration", async () => {
      const w = await world();
      for (let index = 0; index < IDENTITY_RATE_LIMITS.registerIp.max; index += 1) {
        const result = await registerPatient(
          w.ctx,
          patientInput({
            email: `user${index}@example.test`,
            mobile: `98765432${String(10 + index).slice(-2)}`,
          }),
        );
        assert.equal(result.ok, true, `registration ${index} should succeed`);
      }
      const limited = await registerPatient(
        w.ctx,
        patientInput({
          email: "last@example.test",
          mobile: "9876500000",
        }),
      );
      assert.equal(limited.ok, false);
      if (!limited.ok) {
        assert.equal(limited.code, "RATE_LIMITED");
      }
    });

    it("stores injection-like names as data, not SQL", async () => {
      const w = await world();
      const result = await registerPatient(
        w.ctx,
        patientInput({
          displayName: "Asha'); DROP TABLE users;--",
          email: "inject@example.test",
        }),
      );
      assert.equal(result.ok, true);
      const rows = await w.ctx.db.select().from(users);
      assert.ok(rows.length >= 1);
    });
  });

  describe("email verification", () => {
    it("accepts a valid token", async () => {
      const w = await world();
      await registerAndVerifyEmail(w, "asha@example.test", "9876543210");
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.ok(user?.emailVerifiedAt);
    });

    it("rejects expired, used, and invalid tokens", async () => {
      const w = await world();
      const token = await registerAndVerifyEmail(w, "asha@example.test", "9876543210");
      const reused = await verifyEmailToken(w.ctx, token);
      assert.equal(reused.ok, false);

      const w2 = await world();
      await registerPatient(w2.ctx, patientInput({ email: "exp@example.test", mobile: "9876543211" }));
      const expToken = extractTokenFromLastEmail(w2.email, "verify");
      assert.ok(expToken);
      w2.advanceMs(w2.ctx.config.emailVerificationTtlMs + 1000);
      const expired = await verifyEmailToken(w2.ctx, expToken);
      assert.equal(expired.ok, false);

      const invalid = await verifyEmailToken(w.ctx, "not-a-real-token");
      assert.equal(invalid.ok, false);
    });

    it("resends with cooldown and does not enumerate missing emails", async () => {
      const w = await world();
      await registerPatient(w.ctx, patientInput());
      const missing = await resendEmailVerification(w.ctx, {
        email: "nobody@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(missing.ok, true);
      w.advanceMs(w.ctx.config.emailResendCooldownMs + 1000);
      const first = await resendEmailVerification(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.11",
      });
      assert.equal(first.ok, true);
      const sentCount = w.email.messages.length;
      const cooldown = await resendEmailVerification(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.11",
      });
      assert.equal(cooldown.ok, true);
      assert.equal(w.email.messages.length, sentCount);
    });

    it("consumes an email token only once under concurrent attempts", async () => {
      const w = await world();
      await registerPatient(w.ctx, patientInput());
      const token = extractTokenFromLastEmail(w.email, "verify");
      assert.ok(token);
      const [first, second] = await Promise.all([
        verifyEmailToken(w.ctx, token),
        verifyEmailToken(w.ctx, token),
      ]);
      assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
    });
  });

  describe("otp", () => {
    it("verifies a valid OTP and rejects invalid, expired, and extra attempts", async () => {
      const w = await world();
      await registerAndVerifyEmail(w, "asha@example.test", "9876543210");
      await requestPhoneOtpForPendingUser(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.10",
      });
      const code = w.otpProvider.peekLastCode("+919876543210");
      assert.ok(code);
      const invalid = await verifyPhoneOtpAndActivate(w.ctx, {
        email: "asha@example.test",
        code: "000000",
        ip: "203.0.113.10",
      });
      assert.equal(invalid.ok, false);
      const valid = await verifyPhoneOtpAndActivate(w.ctx, {
        email: "asha@example.test",
        code,
        ip: "203.0.113.10",
      });
      assert.equal(valid.ok, true);
      const replay = await verifyPhoneOtpAndActivate(w.ctx, {
        email: "asha@example.test",
        code,
        ip: "203.0.113.10",
      });
      assert.equal(replay.ok, false);

      const w2 = await world();
      await registerAndVerifyEmail(w2, "exp@example.test", "9876543211");
      await requestPhoneOtpForPendingUser(w2.ctx, {
        email: "exp@example.test",
        ip: "203.0.113.10",
      });
      const expiredCode = w2.otpProvider.peekLastCode("+919876543211");
      assert.ok(expiredCode);
      w2.advanceMs(w2.ctx.config.otpTtlMs + 1000);
      const expired = await verifyPhoneOtpAndActivate(w2.ctx, {
        email: "exp@example.test",
        code: expiredCode,
        ip: "203.0.113.10",
      });
      assert.equal(expired.ok, false);
    });

    it("rate-limits OTP verification before revealing whether the account is pending", async () => {
      const w = await world();
      for (let index = 0; index < IDENTITY_RATE_LIMITS.otpVerifyIp.max; index += 1) {
        const result = await verifyPhoneOtpAndActivate(w.ctx, {
          email: "nobody@example.test",
          code: "000000",
          ip: "198.51.100.77",
        });
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.message, SAFE_MESSAGES.otpInvalid);
        }
      }
      const limited = await verifyPhoneOtpAndActivate(w.ctx, {
        email: "nobody@example.test",
        code: "000000",
        ip: "198.51.100.77",
      });
      assert.equal(limited.ok, false);
      if (!limited.ok) {
        assert.equal(limited.code, "RATE_LIMITED");
      }
    });

    it("enforces OTP attempt limits and resend cooldown", async () => {
      const w = await world();
      await registerAndVerifyEmail(w, "asha@example.test", "9876543210");
      await requestPhoneOtpForPendingUser(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.10",
      });
      const cooldown = await requestPhoneOtpForPendingUser(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(cooldown.ok, true);
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.ok(user?.mobileNormalized);
      const serviceCooldown = await w.ctx.otp.sendPhoneVerification({
        userId: user.id,
        mobileNormalized: user.mobileNormalized,
        ip: "203.0.113.10",
      });
      assert.equal(serviceCooldown.ok, false);
      if (!serviceCooldown.ok) {
        assert.equal(serviceCooldown.code, "COOLDOWN");
      }
      for (let index = 0; index < w.ctx.config.otpMaxAttempts; index += 1) {
        const result = await verifyPhoneOtpAndActivate(w.ctx, {
          email: "asha@example.test",
          code: "111111",
          ip: "203.0.113.10",
        });
        assert.equal(result.ok, false);
      }
      const real = w.otpProvider.peekLastCode("+919876543210");
      assert.ok(real);
      const locked = await verifyPhoneOtpAndActivate(w.ctx, {
        email: "asha@example.test",
        code: real,
        ip: "203.0.113.10",
      });
      assert.equal(locked.ok, false);
    });

    it("records provider failure and refuses production mock providers", async () => {
      const failing: OtpDeliveryProvider = {
        id: "fail",
        testOnly: true,
        async deliver() {
          return { ok: false, reason: "provider_error" };
        },
      };
      const w = await world({ otpProvider: failing });
      await registerAndVerifyEmail(w, "asha@example.test", "9876543210");
      const sent = await requestPhoneOtpForPendingUser(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(sent.ok, true);
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.ok(user?.mobileNormalized);
      const direct = await w.ctx.otp.sendPhoneVerification({
        userId: user.id,
        mobileNormalized: user.mobileNormalized,
        ip: "203.0.113.10",
      });
      assert.equal(direct.ok, false);

      const prod = await world({
        nodeEnv: "production",
        otpProvider: createUnconfiguredOtpProvider(),
      });
      prod.ctx.config.nodeEnv = "production";
      await registerAndVerifyEmail(prod, "prod@example.test", "9876543212");
      const blocked = await requestPhoneOtpForPendingUser(prod.ctx, {
        email: "prod@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(blocked.ok, true);
      const [prodUser] = await prod.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "prod@example.test"));
      assert.ok(prodUser?.mobileNormalized);
      const prodDirect = await prod.ctx.otp.sendPhoneVerification({
        userId: prodUser.id,
        mobileNormalized: prodUser.mobileNormalized,
        ip: "203.0.113.10",
      });
      assert.equal(prodDirect.ok, false);
    });

    it("does not reveal whether a mobile account exists through the public OTP API", async () => {
      const w = await world();
      const missing = await requestPhoneOtpForPendingUser(w.ctx, {
        email: "nobody@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(missing.ok, true);
      assert.match(missing.message, /If this account/i);
    });

    it("activates a patient only once under concurrent OTP verification", async () => {
      const w = await world();
      await registerAndVerifyEmail(w, "race@example.test", "9876543213");
      await requestPhoneOtpForPendingUser(w.ctx, {
        email: "race@example.test",
        ip: "203.0.113.10",
      });
      const code = w.otpProvider.peekLastCode("+919876543213");
      assert.ok(code);
      const [first, second] = await Promise.all([
        verifyPhoneOtpAndActivate(w.ctx, {
          email: "race@example.test",
          code,
          ip: "203.0.113.10",
        }),
        verifyPhoneOtpAndActivate(w.ctx, {
          email: "race@example.test",
          code,
          ip: "203.0.113.10",
        }),
      ]);
      assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "race@example.test"));
      assert.equal(user?.status, "ACTIVE");
    });
  });

  describe("login and sessions", () => {
    it("logs in an active patient and rejects invalid, unverified, and disabled accounts", async () => {
      const w = await world();
      const pendingLogin = await loginWithPassword(w.ctx, {
        email: "missing@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(pendingLogin.ok, false);

      await registerPatient(w.ctx, patientInput({ email: "wait@example.test", mobile: "9876543211" }));
      const unverified = await loginWithPassword(w.ctx, {
        email: "wait@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.11",
      });
      assert.equal(unverified.ok, false);
      if (!unverified.ok) {
        assert.equal(unverified.code, "UNVERIFIED");
      }

      await registerAndVerifyEmail(w, "forced@example.test", "9876543212");
      await w.ctx.db
        .update(users)
        .set({ status: "ACTIVE" })
        .where(eq(users.emailNormalized, "forced@example.test"));
      const forcedActive = await loginWithPassword(w.ctx, {
        email: "forced@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.16",
      });
      assert.equal(forcedActive.ok, false);
      if (!forcedActive.ok) {
        assert.equal(forcedActive.code, "UNVERIFIED");
      }

      await activatePatient(w, "asha@example.test", "9876543210");
      const wrong = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: "definitely-not-the-password",
        ip: "203.0.113.12",
      });
      assert.equal(wrong.ok, false);

      const ok = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.12",
      });
      assert.equal(ok.ok, true);
      if (!ok.ok) {
        return;
      }
      const session = await readSession(w.ctx, ok.token);
      assert.ok(session);
      assert.equal(session.mfaCompleted, true);

      await w.ctx.db
        .update(users)
        .set({ status: "DISABLED" })
        .where(eq(users.emailNormalized, "asha@example.test"));
      const disabled = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.13",
      });
      assert.equal(disabled.ok, false);
      if (!disabled.ok) {
        assert.equal(disabled.code, "DISABLED");
      }
      const stale = await readSession(w.ctx, ok.token);
      assert.equal(stale, null);
    });

    it("rate limits login attempts", async () => {
      const w = await world();
      await activatePatient(w, "asha@example.test", "9876543210");
      for (let index = 0; index < IDENTITY_RATE_LIMITS.loginIp.max; index += 1) {
        await loginWithPassword(w.ctx, {
          email: "asha@example.test",
          password: "wrong-password-12",
          ip: "198.51.100.9",
        });
      }
      const limited = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "198.51.100.9",
      });
      assert.equal(limited.ok, false);
      if (!limited.ok) {
        assert.equal(limited.code, "RATE_LIMITED");
      }
    });

    it("rejects expired, revoked, and forged sessions and invalidates logout", async () => {
      const w = await world();
      await activatePatient(w, "asha@example.test", "9876543210");
      const login = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        return;
      }
      const forged = await readSession(w.ctx, "forged-token");
      assert.equal(forged, null);

      await revokeSession(w.ctx, login.sessionId);
      const revoked = await readSession(w.ctx, login.token);
      assert.equal(revoked, null);

      const login2 = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.14",
      });
      assert.equal(login2.ok, true);
      if (!login2.ok) {
        return;
      }
      await logoutSession(w.ctx, login2.token);
      assert.equal(await readSession(w.ctx, login2.token), null);

      const login3 = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.15",
      });
      assert.equal(login3.ok, true);
      if (!login3.ok) {
        return;
      }
      w.advanceMs(w.ctx.config.patientIdleMs + 1000);
      assert.equal(await readSession(w.ctx, login3.token), null);
    });

    it("uses a new server session on login (session fixation)", async () => {
      const w = await world();
      await activatePatient(w, "asha@example.test", "9876543210");
      const [user] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "asha@example.test"));
      assert.ok(user);
      const pre = await createSession(w.ctx, {
        userId: user.id,
        roles: ["PATIENT"],
        mfaCompleted: true,
      });
      const login = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        return;
      }
      assert.notEqual(login.token, pre.token);
      assert.notEqual(login.sessionId, pre.sessionId);
    });

    it("documents SameSite=Lax httpOnly cookies", async () => {
      const w = await world();
      const options = sessionCookieOptions(w.ctx, 3600);
      assert.equal(options.httpOnly, true);
      assert.equal(options.sameSite, "lax");
      assert.equal(options.path, "/");
    });
  });

  describe("password reset", () => {
    it("resets a valid token, rejects expiry/reuse, and hides enumeration", async () => {
      const w = await world();
      await activatePatient(w, "asha@example.test", "9876543210");
      const missing = await requestPasswordReset(w.ctx, {
        email: "nobody@example.test",
        ip: "203.0.113.10",
      });
      assert.equal(missing.ok, true);
      assert.equal(missing.message, SAFE_MESSAGES.passwordResetAccepted);

      const loginBeforeReset = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.9",
      });
      assert.equal(loginBeforeReset.ok, true);
      if (!loginBeforeReset.ok) {
        return;
      }

      const requested = await requestPasswordReset(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.11",
      });
      assert.equal(requested.ok, true);
      const token = extractTokenFromLastEmail(w.email, "reset");
      assert.ok(token);
      const reset = await resetPasswordWithToken(w.ctx, {
        token,
        password: "new-correct-horse-1",
        passwordConfirm: "new-correct-horse-1",
      });
      assert.equal(reset.ok, true);
      assert.equal("token" in reset, false);
      assert.equal(await readSession(w.ctx, loginBeforeReset.token), null);
      const reused = await resetPasswordWithToken(w.ctx, {
        token,
        password: "another-correct-horse",
        passwordConfirm: "another-correct-horse",
      });
      assert.equal(reused.ok, false);

      const loginOld = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.12",
      });
      assert.equal(loginOld.ok, false);
      const loginNew = await loginWithPassword(w.ctx, {
        email: "asha@example.test",
        password: "new-correct-horse-1",
        ip: "203.0.113.12",
      });
      assert.equal(loginNew.ok, true);

      const w2 = await world();
      await activatePatient(w2, "exp@example.test", "9876543211");
      await requestPasswordReset(w2.ctx, {
        email: "exp@example.test",
        ip: "203.0.113.10",
      });
      const expToken = extractTokenFromLastEmail(w2.email, "reset");
      assert.ok(expToken);
      w2.advanceMs(w2.ctx.config.passwordResetTtlMs + 1000);
      const expired = await resetPasswordWithToken(w2.ctx, {
        token: expToken,
        password: "new-correct-horse-1",
        passwordConfirm: "new-correct-horse-1",
      });
      assert.equal(expired.ok, false);
    });

    it("invalidates previous unused reset tokens and consumes a token once", async () => {
      const w = await world();
      await activatePatient(w, "asha@example.test", "9876543210");
      await requestPasswordReset(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.21",
      });
      const firstToken = extractTokenFromLastEmail(w.email, "reset");
      assert.ok(firstToken);
      await requestPasswordReset(w.ctx, {
        email: "asha@example.test",
        ip: "203.0.113.22",
      });
      const secondToken = extractTokenFromLastEmail(w.email, "reset");
      assert.ok(secondToken);
      const stale = await resetPasswordWithToken(w.ctx, {
        token: firstToken,
        password: "new-correct-horse-1",
        passwordConfirm: "new-correct-horse-1",
      });
      assert.equal(stale.ok, false);
      const [first, second] = await Promise.all([
        resetPasswordWithToken(w.ctx, {
          token: secondToken,
          password: "new-correct-horse-2",
          passwordConfirm: "new-correct-horse-2",
        }),
        resetPasswordWithToken(w.ctx, {
          token: secondToken,
          password: "new-correct-horse-3",
          passwordConfirm: "new-correct-horse-3",
        }),
      ]);
      assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
    });
  });

  describe("rbac and authorization", () => {
    it("prevents patient A from accessing patient B", async () => {
      const w = await world();
      await activatePatient(w, "a@example.test", "9876543210");
      await activatePatient(w, "b@example.test", "9876543211");
      const loginA = await loginWithPassword(w.ctx, {
        email: "a@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(loginA.ok, true);
      if (!loginA.ok) {
        return;
      }
      const principalA = await principalForSession(w, loginA.token);
      const [userB] = await w.ctx.db
        .select()
        .from(users)
        .where(eq(users.emailNormalized, "b@example.test"));
      const [profileB] = await w.ctx.db
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.userId, userB.id));
      const access = authorizationService.canAccess(principalA, {
        resourceType: "patient_profile",
        resourceId: profileB.id,
      });
      assert.equal(access.allowed, false);
      if (!access.allowed) {
        assert.equal(access.reason, "forbidden");
      }
    });

    it("denies patients, staff, and unauthenticated callers from Super Admin configuration", async () => {
      const w = await world();
      await activatePatient(w, "a@example.test", "9876543210");
      const login = await loginWithPassword(w.ctx, {
        email: "a@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        return;
      }
      const patient = await principalForSession(w, login.token);
      const adminConfig = authorizationService.canAccess(patient, {
        permission: "MANAGE_SYSTEM_SETTINGS",
        roles: ["SUPER_ADMIN"],
      });
      assert.equal(adminConfig.allowed, false);

      const staff = await provisionPrivilegedUser(w.ctx, {
        role: "STAFF",
        email: "staff@example.test",
        password: STRONG_PASSWORD,
        displayName: "Practice Staff",
      });
      assert.equal(staff.ok, true);
      if (!staff.ok) {
        return;
      }
      const staffLogin = await loginWithPassword(w.ctx, {
        email: "staff@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.11",
        expectedRole: "STAFF",
      });
      assert.equal(staffLogin.ok, true);
      if (!staffLogin.ok) {
        return;
      }
      const staffPrincipal = await principalForSession(w, staffLogin.token);
      assert.equal(staffPrincipal.permissions.length, 0);
      assert.equal(
        authorizationService.canAccess(staffPrincipal, {
          permission: "MANAGE_USERS",
        }).allowed,
        false,
      );
      assert.equal(
        authorizationService.canAccess(null, {
          permission: "MANAGE_SYSTEM_SETTINGS",
        }).allowed,
        false,
      );
    });

    it("does not give psychologist Super Admin-only configuration or Super Admin clinical access", async () => {
      const w = await world();
      const psychologist = await provisionPrivilegedUser(w.ctx, {
        role: "PSYCHOLOGIST",
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        displayName: "Dr. Vandana Rajiv Chaudhary",
      });
      const admin = await provisionPrivilegedUser(w.ctx, {
        role: "SUPER_ADMIN",
        email: "admin@example.test",
        password: STRONG_PASSWORD,
        displayName: "Practice Admin",
      });
      assert.equal(psychologist.ok, true);
      assert.equal(admin.ok, true);
      if (!psychologist.ok || !admin.ok) {
        return;
      }
      const psyLogin = await loginWithPassword(w.ctx, {
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
        expectedRole: "PSYCHOLOGIST",
      });
      const adminLogin = await loginWithPassword(w.ctx, {
        email: "admin@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.11",
        expectedRole: "SUPER_ADMIN",
      });
      assert.equal(psyLogin.ok, true);
      assert.equal(adminLogin.ok, true);
      if (!psyLogin.ok || !adminLogin.ok) {
        return;
      }
      const psy = await loadPrincipal(w.ctx, {
        sessionId: psyLogin.sessionId,
        userId: psychologist.userId,
        mfaCompleted: true,
        expiresAt: new Date(),
      });
      const superAdmin = await loadPrincipal(w.ctx, {
        sessionId: adminLogin.sessionId,
        userId: admin.userId,
        mfaCompleted: true,
        expiresAt: new Date(),
      });
      assert.equal(
        authorizationService.canAccess(psy, {
          permission: "MANAGE_SYSTEM_SETTINGS",
        }).allowed,
        false,
      );
      assert.equal(
        authorizationService.canAccess(psy, {
          permission: "MANAGE_ROLES",
        }).allowed,
        false,
      );
      assert.equal(hasAnyClinicalPermission(superAdmin), false);
      assert.equal(
        authorizationService.hasPermission(superAdmin, "VIEW_CLINICAL_RECORDS"),
        false,
      );
      assert.equal(
        authorizationService.hasPermission(superAdmin, "MANAGE_SYSTEM_SETTINGS"),
        true,
      );
    });

    it("blocks role escalation and clinical permission grants", async () => {
      const w = await world();
      await activatePatient(w, "a@example.test", "9876543210");
      const login = await loginWithPassword(w.ctx, {
        email: "a@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        return;
      }
      const patient = await principalForSession(w, login.token);
      const escalate = await assignRole(w.ctx, patient, {
        userId: patient.userId,
        role: "SUPER_ADMIN",
      });
      assert.equal(escalate.ok, false);

      const admin = await provisionPrivilegedUser(w.ctx, {
        role: "SUPER_ADMIN",
        email: "admin@example.test",
        password: STRONG_PASSWORD,
        displayName: "Practice Admin",
      });
      assert.equal(admin.ok, true);
      if (!admin.ok) {
        return;
      }
      const adminPrincipal: AuthorizationPrincipal = {
        userId: admin.userId,
        roles: ["SUPER_ADMIN"],
        permissions: ["MANAGE_ROLES"],
        mfaCompleted: true,
      };
      const clinical = await grantPermissionToRole(w.ctx, adminPrincipal, {
        role: "SUPER_ADMIN",
        permission: "VIEW_CLINICAL_RECORDS",
      });
      assert.equal(clinical.ok, false);
    });
  });

  describe("mfa", () => {
    it("enforces MFA for psychologist and super admin and supports TOTP plus one-time recovery", async () => {
      const w = await world();
      const provisioned = await provisionPrivilegedUser(w.ctx, {
        role: "PSYCHOLOGIST",
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        displayName: "Dr. Vandana Rajiv Chaudhary",
      });
      assert.equal(provisioned.ok, true);
      if (!provisioned.ok) {
        return;
      }
      const login = await loginWithPassword(w.ctx, {
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.10",
        expectedRole: "PSYCHOLOGIST",
      });
      assert.equal(login.ok, true);
      if (!login.ok) {
        return;
      }
      assert.equal(login.mfaRequired, true);
      assert.equal(login.mfaEnrolled, false);
      const pending = await readSession(w.ctx, login.token);
      assert.ok(pending);
      assert.equal(pending.mfaCompleted, false);
      const blocked = authorizationService.canAccess(
        await loadPrincipal(w.ctx, pending),
        { permission: "MANAGE_APPOINTMENT_SETTINGS" },
      );
      assert.equal(blocked.allowed, false);
      if (!blocked.allowed) {
        assert.equal(blocked.reason, "mfa_required");
      }

      const begin = await beginMfaEnrollment(w.ctx, { userId: provisioned.userId });
      assert.equal(begin.ok, true);
      if (!begin.ok) {
        return;
      }
      const timestamp = w.ctx.now().getTime();
      const invalidEnroll = await confirmMfaEnrollment(w.ctx, {
        userId: provisioned.userId,
        code: "000000",
        timestamp,
      });
      assert.equal(invalidEnroll.ok, false);
      const totp = generateTotpCodeForTests(
        begin.secretBase32,
        timestamp,
        "vandana@example.test",
      );
      const confirmed = await confirmMfaEnrollment(w.ctx, {
        userId: provisioned.userId,
        code: totp,
        timestamp,
      });
      assert.equal(confirmed.ok, true);
      if (!confirmed.ok) {
        return;
      }
      assert.equal(confirmed.recoveryCodes.length, w.ctx.config.recoveryCodeCount);

      const invalidTotp = await verifyMfaChallenge(w.ctx, {
        userId: provisioned.userId,
        sessionId: login.sessionId,
        code: "000000",
        ip: "203.0.113.10",
        timestamp,
      });
      assert.equal(invalidTotp.ok, false);
      const loginTimestamp = timestamp + 30_000;
      const loginTotp = generateTotpCodeForTests(
        begin.secretBase32,
        loginTimestamp,
        "vandana@example.test",
      );
      const replayEnroll = await verifyMfaChallenge(w.ctx, {
        userId: provisioned.userId,
        sessionId: login.sessionId,
        code: totp,
        ip: "203.0.113.10",
        timestamp,
      });
      assert.equal(replayEnroll.ok, false);
      const validTotp = await verifyMfaChallenge(w.ctx, {
        userId: provisioned.userId,
        sessionId: login.sessionId,
        code: loginTotp,
        ip: "203.0.113.10",
        timestamp: loginTimestamp,
      });
      assert.equal(validTotp.ok, true);
      const replayLogin = await verifyMfaChallenge(w.ctx, {
        userId: provisioned.userId,
        sessionId: login.sessionId,
        code: loginTotp,
        ip: "203.0.113.10",
        timestamp: loginTimestamp,
      });
      assert.equal(replayLogin.ok, false);
      const completed = await readSession(w.ctx, login.token);
      assert.equal(completed?.mfaCompleted, true);
      const burned = await consumeRecoveryCode(w.ctx, {
        userId: provisioned.userId,
        sessionId: login.sessionId,
        code: confirmed.recoveryCodes[0],
        ip: "203.0.113.10",
      });
      assert.equal(burned.ok, false);
      if (!burned.ok) {
        assert.equal(burned.message, SAFE_MESSAGES.unauthorized);
      }

      const login2 = await loginWithPassword(w.ctx, {
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.20",
        expectedRole: "PSYCHOLOGIST",
      });
      assert.equal(login2.ok, true);
      if (!login2.ok) {
        return;
      }
      const recovery = confirmed.recoveryCodes[0];
      const used = await consumeRecoveryCode(w.ctx, {
        userId: provisioned.userId,
        sessionId: login2.sessionId,
        code: recovery,
        ip: "203.0.113.20",
      });
      assert.equal(used.ok, true);
      const reused = await consumeRecoveryCode(w.ctx, {
        userId: provisioned.userId,
        sessionId: login2.sessionId,
        code: recovery,
        ip: "203.0.113.20",
      });
      assert.equal(reused.ok, false);

      const login3 = await loginWithPassword(w.ctx, {
        email: "vandana@example.test",
        password: STRONG_PASSWORD,
        ip: "203.0.113.21",
        expectedRole: "PSYCHOLOGIST",
      });
      assert.equal(login3.ok, true);
      if (!login3.ok) {
        return;
      }
      const otherSession = login3.sessionId;
      const secondCode = confirmed.recoveryCodes[1];
      const [raceA, raceB] = await Promise.all([
        consumeRecoveryCode(w.ctx, {
          userId: provisioned.userId,
          sessionId: otherSession,
          code: secondCode,
          ip: "203.0.113.21",
        }),
        consumeRecoveryCode(w.ctx, {
          userId: provisioned.userId,
          sessionId: otherSession,
          code: secondCode,
          ip: "203.0.113.21",
        }),
      ]);
      assert.equal([raceA.ok, raceB.ok].filter(Boolean).length, 1);
    });

    it("refuses production privileged provisioning", async () => {
      const w = await world({ nodeEnv: "production", identityProvisionEnabled: true });
      const result = await provisionPrivilegedUser(w.ctx, {
        role: "SUPER_ADMIN",
        email: "admin@example.com",
        password: STRONG_PASSWORD,
        displayName: "Admin",
      });
      assert.equal(result.ok, false);
    });
  });
});
