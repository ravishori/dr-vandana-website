import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import { hashPassword } from "@/lib/doctor-auth/crypto";
import { authenticateDoctor } from "@/lib/doctor-auth/authenticate";
import {
  checkDoctorLoginRateLimit,
  createMemoryLoginAttemptStore,
  resolveDoctorLoginRateLimitMode,
  setDoctorLoginAttemptStoreForTests,
  setDoctorLoginRateLimitModeForTests,
} from "@/lib/doctor-auth/login-rate-limit";

const SECRET = "test-doctor-session-secret-32chars!!";

function testEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "test",
    DOCTOR_LOGIN_EMAIL: "doctor@example.com",
    DOCTOR_PASSWORD_HASH: hashPassword("correct-horse-battery"),
    DOCTOR_SESSION_SECRET: SECRET,
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("doctor login rate limit mode resolution", () => {
  it("uses upstash in production when credentials exist", () => {
    assert.equal(
      resolveDoctorLoginRateLimitMode(
        "production",
        "https://example.upstash.io",
        "token",
      ),
      "upstash",
    );
  });

  it("fail-closes as misconfigured in production without Upstash", () => {
    assert.equal(
      resolveDoctorLoginRateLimitMode("production", undefined, undefined),
      "misconfigured",
    );
  });

  it("allows memory fallback outside production without Upstash", () => {
    assert.equal(
      resolveDoctorLoginRateLimitMode("development", undefined, undefined),
      "memory",
    );
  });
});

describe("doctor login rate limit enforcement", () => {
  beforeEach(() => {
    setDoctorLoginAttemptStoreForTests(createMemoryLoginAttemptStore());
    setDoctorLoginRateLimitModeForTests("memory");
  });

  afterEach(() => {
    setDoctorLoginAttemptStoreForTests(null);
    setDoctorLoginRateLimitModeForTests(null);
  });

  it("rejects authentication after too many failures", async () => {
    const env = testEnv();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await authenticateDoctor(
        "doctor@example.com",
        "wrong-password",
        { ip: "203.0.113.10", env },
      );
      assert.equal(result.ok, false);
    }

    const limited = await authenticateDoctor(
      "doctor@example.com",
      "correct-horse-battery",
      { ip: "203.0.113.10", env },
    );
    assert.equal(limited.ok, false);
    if (!limited.ok) {
      assert.equal(limited.reason, "RATE_LIMITED");
    }
  });

  it("production store unavailability fails closed", async () => {
    setDoctorLoginRateLimitModeForTests("misconfigured");
    const result = await checkDoctorLoginRateLimit(
      "203.0.113.11",
      "doctor@example.com",
    );
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.reason, "STORE_UNAVAILABLE");
    }

    const auth = await authenticateDoctor(
      "doctor@example.com",
      "correct-horse-battery",
      { ip: "203.0.113.11", env: testEnv() },
    );
    assert.equal(auth.ok, false);
    if (!auth.ok) {
      assert.equal(auth.reason, "RATE_LIMIT_UNAVAILABLE");
    }
  });

  it("successful authentication clears failures and does not bypass prior limit incorrectly", async () => {
    const env = testEnv();
    const ip = "203.0.113.12";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await authenticateDoctor("doctor@example.com", "wrong-password", {
        ip,
        env,
      });
    }

    const success = await authenticateDoctor(
      "doctor@example.com",
      "correct-horse-battery",
      { ip, env },
    );
    assert.equal(success.ok, true);

    const check = await checkDoctorLoginRateLimit(ip, "doctor@example.com");
    assert.equal(check.allowed, true);
  });
});
