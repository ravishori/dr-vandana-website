import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectDoctorPortalConfigIssues } from "@/config/validate-server-config";
import { hashPassword } from "@/lib/doctor-auth/crypto";

describe("collectDoctorPortalConfigIssues", () => {
  it("returns no doctor-portal issues outside production", () => {
    const issues = collectDoctorPortalConfigIssues(
      {
        NODE_ENV: "development",
      } as NodeJS.ProcessEnv,
      "development",
    );
    assert.equal(issues.length, 0);
  });

  it("flags missing doctor auth and non-upstash stores in production", () => {
    const issues = collectDoctorPortalConfigIssues(
      {
        NODE_ENV: "production",
        ARTICLES_STORE: "memory",
        COMMUNICATIONS_STORE: "file",
      } as NodeJS.ProcessEnv,
      "production",
    );

    const codes = new Set(issues.map((issue) => issue.code));
    assert.equal(codes.has("DOCTOR_AUTH_MISCONFIGURED"), true);
    assert.equal(codes.has("ARTICLES_STORE_MISCONFIGURED"), true);
    assert.equal(codes.has("COMMUNICATIONS_STORE_MISCONFIGURED"), true);
    assert.equal(codes.has("UPSTASH_MISCONFIGURED"), true);
    assert.equal(codes.has("DOCTOR_LOGIN_RATE_LIMIT_MISCONFIGURED"), true);

    for (const issue of issues) {
      assert.equal(typeof issue.message, "string");
      assert.ok(issue.variables.length > 0);
      assert.equal(issue.message.includes("scrypt$"), false);
      assert.equal(issue.message.toLowerCase().includes("password hash value"), false);
    }
  });

  it("accepts fully configured production doctor portal env contract", () => {
    const issues = collectDoctorPortalConfigIssues(
      {
        NODE_ENV: "production",
        DOCTOR_LOGIN_EMAIL: "doctor@example.com",
        DOCTOR_PASSWORD_HASH: hashPassword("correct-horse-battery"),
        DOCTOR_SESSION_SECRET: "production-doctor-session-secret-32chars",
        ARTICLES_STORE: "upstash",
        COMMUNICATIONS_STORE: "upstash",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "example-token",
        // SMTP is validated via live getters — not asserted here.
      } as NodeJS.ProcessEnv,
      "production",
    );

    const blocking = issues.filter(
      (issue) =>
        issue.code === "DOCTOR_AUTH_MISCONFIGURED" ||
        issue.code === "ARTICLES_STORE_MISCONFIGURED" ||
        issue.code === "COMMUNICATIONS_STORE_MISCONFIGURED" ||
        issue.code === "UPSTASH_MISCONFIGURED" ||
        issue.code === "DOCTOR_LOGIN_RATE_LIMIT_MISCONFIGURED",
    );
    assert.equal(blocking.length, 0);
  });
});
