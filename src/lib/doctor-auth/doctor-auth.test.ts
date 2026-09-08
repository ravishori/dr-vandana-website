import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  createMemoryLoginAttemptStore,
  setDoctorLoginAttemptStoreForTests,
} from "@/lib/doctor-auth/login-rate-limit";
import { hashPassword, verifyPassword } from "@/lib/doctor-auth/crypto";
import {
  createSessionToken,
  readSessionToken,
} from "@/lib/doctor-auth/session";
import { authenticateDoctor } from "@/lib/doctor-auth/authenticate";

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

describe("doctor-auth crypto and session", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const encoded = hashPassword("secret-pass-123");
    assert.match(encoded, /^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    assert.equal(verifyPassword("secret-pass-123", encoded), true);
    assert.equal(verifyPassword("wrong-password", encoded), false);
  });

  it("creates and reads a signed doctor session token", () => {
    const env = testEnv();
    const token = createSessionToken("doctor@example.com", env);
    assert.ok(token);
    const session = readSessionToken(token, env);
    assert.ok(session);
    assert.equal(session.email, "doctor@example.com");
    assert.equal(session.role, "DOCTOR");
  });

  it("rejects tampered session tokens", () => {
    const env = testEnv();
    const token = createSessionToken("doctor@example.com", env);
    assert.ok(token);
    const tampered = `${token.slice(0, -4)}xxxx`;
    assert.equal(readSessionToken(tampered, env), null);
  });
});

describe("authenticateDoctor", () => {
  beforeEach(() => {
    setDoctorLoginAttemptStoreForTests(createMemoryLoginAttemptStore());
  });

  afterEach(() => {
    setDoctorLoginAttemptStoreForTests(null);
  });

  it("accepts valid credentials with password hash", async () => {
    const env = testEnv();
    const result = await authenticateDoctor(
      "doctor@example.com",
      "correct-horse-battery",
      { ip: "127.0.0.1", env },
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.token.includes("."));
    }
  });

  it("rejects invalid password", async () => {
    const env = testEnv();
    const result = await authenticateDoctor(
      "doctor@example.com",
      "wrong-password",
      { ip: "127.0.0.1", env },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "INVALID_CREDENTIALS");
    }
  });

  it("rejects unknown email", async () => {
    const env = testEnv();
    const result = await authenticateDoctor("other@example.com", "anything", {
      ip: "127.0.0.1",
      env,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "INVALID_CREDENTIALS");
    }
  });
});
