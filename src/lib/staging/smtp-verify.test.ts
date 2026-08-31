import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { isSmtpVerifyEnvironmentAllowed } from "@/lib/staging/smtp-verify-env";
import {
  assertSmtpVerifyRequestBodySafe,
  sanitizeSmtpVerifyErrorMessage,
  verifyConfiguredSmtpAuth,
} from "@/lib/staging/smtp-verify";

describe("staging SMTP verify environment guard", () => {
  it("allows Vercel Preview", () => {
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({ VERCEL_ENV: "preview" }),
      true,
    );
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({
        VERCEL_ENV: "preview",
        APP_ENV: "staging",
      }),
      true,
    );
  });

  it("denies Production (VERCEL_ENV and APP_ENV)", () => {
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({ VERCEL_ENV: "production" }),
      false,
    );
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({
        VERCEL_ENV: "preview",
        APP_ENV: "production",
      }),
      false,
    );
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({ APP_ENV: "production" }),
      false,
    );
  });

  it("denies unknown / local / development without Preview", () => {
    assert.equal(isSmtpVerifyEnvironmentAllowed({}), false);
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({ VERCEL_ENV: "development" }),
      false,
    );
    assert.equal(
      isSmtpVerifyEnvironmentAllowed({ APP_ENV: "staging" }),
      false,
    );
  });
});

describe("staging SMTP verify request body protection", () => {
  it("allows empty body", () => {
    assert.equal(assertSmtpVerifyRequestBodySafe(undefined).ok, true);
    assert.equal(assertSmtpVerifyRequestBodySafe(null).ok, true);
    assert.equal(assertSmtpVerifyRequestBodySafe("").ok, true);
    assert.equal(assertSmtpVerifyRequestBodySafe({}).ok, true);
  });

  it("rejects host / port / credential / recipient injection", () => {
    assert.equal(
      assertSmtpVerifyRequestBodySafe({ host: "evil.example" }).ok,
      false,
    );
    assert.equal(assertSmtpVerifyRequestBodySafe({ port: 25 }).ok, false);
    assert.equal(
      assertSmtpVerifyRequestBodySafe({ password: "secret" }).ok,
      false,
    );
    assert.equal(
      assertSmtpVerifyRequestBodySafe({ SMTP_PASSWORD: "secret" }).ok,
      false,
    );
    assert.equal(
      assertSmtpVerifyRequestBodySafe({ to: "anyone@example.com" }).ok,
      false,
    );
    assert.equal(
      assertSmtpVerifyRequestBodySafe({ arbitrary: true }).ok,
      false,
    );
  });
});

describe("staging SMTP verify AUTH (mocked transport)", () => {
  const saved: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of Object.keys(saved)) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
      delete saved[key];
    }
  });

  function stash(name: string, value: string | undefined) {
    if (!(name in saved)) {
      saved[name] = process.env[name];
    }
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  it("returns SMTP_NOT_CONFIGURED when env incomplete", async () => {
    stash("SMTP_HOST", undefined);
    stash("SMTP_SERVER", undefined);
    stash("SMTP_PORT", undefined);
    stash("SMTP_USER", undefined);
    stash("SMTP_EMAIL", undefined);
    stash("SMTP_PASSWORD", undefined);

    const result = await verifyConfiguredSmtpAuth({
      createTransport: (() => {
        throw new Error("createTransport must not run when not configured");
      }) as never,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "SMTP_NOT_CONFIGURED");
  });

  it("returns SMTP_AUTH_PASS on successful verify without sendMail", async () => {
    stash("SMTP_HOST", "smtp.gmail.com");
    stash("SMTP_PORT", "587");
    stash("SMTP_USER", "operator@example.com");
    stash("SMTP_PASSWORD", "app-password-not-a-real-secret");
    stash("SMTP_FROM_EMAIL", "from@example.com");

    let verifyCalled = 0;
    let sendMailCalled = 0;

    const result = await verifyConfiguredSmtpAuth({
      createTransport: (() => ({
        verify: async () => {
          verifyCalled += 1;
        },
        sendMail: async () => {
          sendMailCalled += 1;
          throw new Error("sendMail must not be called");
        },
      })) as never,
    });

    assert.equal(result.ok, true);
    assert.equal(result.status, "SMTP_AUTH_PASS");
    assert.equal(result.transport, "STARTTLS");
    assert.equal(verifyCalled, 1);
    assert.equal(sendMailCalled, 0);
    assert.doesNotMatch(JSON.stringify(result), /app-password-not-a-real-secret/);
  });

  it("returns sanitized SMTP_AUTH_FAIL without echoing password", async () => {
    stash("SMTP_HOST", "smtp.gmail.com");
    stash("SMTP_PORT", "587");
    stash("SMTP_USER", "operator@example.com");
    stash("SMTP_PASSWORD", "app-password-not-a-real-secret");
    stash("SMTP_FROM_EMAIL", "from@example.com");

    const result = await verifyConfiguredSmtpAuth({
      createTransport: (() => ({
        verify: async () => {
          const err = new Error(
            "Invalid login: app-password-not-a-real-secret",
          ) as Error & { code: string };
          err.code = "EAUTH";
          throw err;
        },
      })) as never,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, "SMTP_AUTH_FAIL");
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /app-password-not-a-real-secret/);
    assert.doesNotMatch(serialized, /Invalid login/);
  });

  it("never lets caller override host via getConfig — uses injected config only from server", async () => {
    // Caller cannot pass host into verifyConfiguredSmtpAuth; only deps.getConfig (server).
    const result = await verifyConfiguredSmtpAuth({
      getConfig: () => ({
        ok: true,
        config: {
          host: "smtp.gmail.com",
          port: 587,
          user: "operator@example.com",
          password: "app-password-not-a-real-secret",
          fromEmail: "from@example.com",
          fromName: "Test",
        },
      }),
      createTransport: ((options: {
        host: string;
        port: number;
        auth: { user: string; pass: string };
      }) => {
        assert.equal(options.host, "smtp.gmail.com");
        assert.equal(options.port, 587);
        assert.equal(options.auth.pass, "app-password-not-a-real-secret");
        return {
          verify: async () => undefined,
          sendMail: async () => {
            throw new Error("sendMail must not be called");
          },
        };
      }) as never,
    });
    assert.equal(result.ok, true);
  });
});

describe("sanitizeSmtpVerifyErrorMessage", () => {
  it("redacts app-password-shaped tokens and pass fields", () => {
    const sanitized = sanitizeSmtpVerifyErrorMessage(
      "auth failed pass=abcd efgh ijkl mnop qrst uvwx",
    );
    assert.doesNotMatch(sanitized, /abcd efgh ijkl mnop/);
    assert.match(sanitized, /\[REDACTED\]/);
  });
});
