import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertProductionNotificationWorkerAuthorization,
  PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE,
} from "@/lib/notifications/production-worker-guard";

const FAKE_USER = "USER";
const FAKE_PASSWORD = "PASSWORD";

function buildUrl(
  host: string,
  database: string,
  sslmode = "require",
): string {
  const query = sslmode ? `?sslmode=${sslmode}` : "";
  return `postgresql://${FAKE_USER}:${FAKE_PASSWORD}@${host}:5432/${database}${query}`;
}

function authorizedProductionEnv(
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    NOTIFICATION_WORKER_EXECUTION_PROFILE:
      PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE,
    DATABASE_URL: buildUrl(
      "pg-dr-vandana-prod.postgres.database.azure.com",
      "dr_vandana_db",
    ),
    PATIENT_REGISTRATION_ENABLED: "false",
    TWILIO_WHATSAPP_ENABLED: "false",
    ...overrides,
  };
}

describe("production notification worker authorization", () => {
  it("allows authorized Production hosted worker context", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv(),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(
        result.hostname,
        "pg-dr-vandana-prod.postgres.database.azure.com",
      );
      assert.equal(result.database, "dr_vandana_db");
    }
  });

  it("blocks when execution profile is missing or invalid", () => {
    const missing = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        NOTIFICATION_WORKER_EXECUTION_PROFILE: undefined,
      }),
    );
    assert.equal(missing.ok, false);

    const genericBypass = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        NOTIFICATION_WORKER_EXECUTION_PROFILE: "true",
      }),
    );
    assert.equal(genericBypass.ok, false);
  });

  it("blocks when NODE_ENV is not production", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({ NODE_ENV: "development" }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /NODE_ENV must be production/i);
    }
  });

  it("blocks public web runtime markers such as Vercel", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({ VERCEL: "1" }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /public web runtime/i);
    }
  });

  it("blocks staging database targets", () => {
    const stagingHost = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        DATABASE_URL: buildUrl(
          "pg-dr-vandana-staging.postgres.database.azure.com",
          "dr_vandana_db_staging",
        ),
      }),
    );
    assert.equal(stagingHost.ok, false);

    const stagingDbOnProdHost = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        DATABASE_URL: buildUrl(
          "pg-dr-vandana-prod.postgres.database.azure.com",
          "dr_vandana_db_staging",
        ),
      }),
    );
    assert.equal(stagingDbOnProdHost.ok, false);
  });

  it("blocks Production worker when registration is enabled", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({ PATIENT_REGISTRATION_ENABLED: "true" }),
    );
    assert.equal(result.ok, false);
  });

  it("blocks Production worker when WhatsApp is enabled", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({ TWILIO_WHATSAPP_ENABLED: "true" }),
    );
    assert.equal(result.ok, false);
  });

  it("requires sslmode=require on Production DATABASE_URL", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        DATABASE_URL: buildUrl(
          "pg-dr-vandana-prod.postgres.database.azure.com",
          "dr_vandana_db",
          "",
        ),
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /sslmode=require/i);
    }
  });

  it("does not echo DATABASE_URL or credentials in failure reasons", () => {
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        DATABASE_URL: "postgresql://secret-user:secret-pass@localhost/db",
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.doesNotMatch(result.reason, /secret-user/);
      assert.doesNotMatch(result.reason, /secret-pass/);
      assert.doesNotMatch(result.reason, /postgresql:\/\//);
    }
  });
});

describe("staging and development entrypoint separation", () => {
  it("does not authorize staging-like development runtime for Production worker", () => {
    const stagingLike = assertProductionNotificationWorkerAuthorization({
      NODE_ENV: "development",
      NOTIFICATION_WORKER_EXECUTION_PROFILE:
        PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE,
      DATABASE_URL: buildUrl(
        "pg-dr-vandana-staging.postgres.database.azure.com",
        "dr_vandana_db_staging",
      ),
    });
    assert.equal(stagingLike.ok, false);
  });

  it("does not authorize local development database for Production worker", () => {
    const localDev = assertProductionNotificationWorkerAuthorization({
      NODE_ENV: "development",
      NOTIFICATION_WORKER_EXECUTION_PROFILE:
        PRODUCTION_NOTIFICATION_WORKER_EXECUTION_PROFILE,
      DATABASE_URL: "postgresql://local:local@127.0.0.1:5432/dr_vandana_db",
    });
    assert.equal(localDev.ok, false);
  });
});

describe("secret-safe failure messages", () => {
  it("never echoes configured secret values in guard failure reasons", () => {
    const sessionSecret = "super-secret-auth-session-key-32chars";
    const mfaKey = "super-secret-mfa-encryption-key-value";
    const smtpPassword = "smtp-password-secret-value";
    const result = assertProductionNotificationWorkerAuthorization(
      authorizedProductionEnv({
        AUTH_SESSION_SECRET: sessionSecret,
        MFA_ENCRYPTION_KEY: mfaKey,
        SMTP_PASSWORD: smtpPassword,
        DATABASE_URL: buildUrl("127.0.0.1", "dr_vandana_db"),
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.doesNotMatch(result.reason, new RegExp(sessionSecret));
      assert.doesNotMatch(result.reason, new RegExp(mfaKey));
      assert.doesNotMatch(result.reason, new RegExp(smtpPassword));
    }
  });
});
