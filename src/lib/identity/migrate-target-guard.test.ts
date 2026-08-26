import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertStagingMigrateTarget } from "@/lib/identity/migrate-target-guard";

const FAKE_USER = "USER";
const FAKE_PASSWORD = "PASSWORD";

function buildUrl(host: string, database: string): string {
  return `postgresql://${FAKE_USER}:${FAKE_PASSWORD}@${host}:5432/${database}`;
}

describe("identity migrate staging target guard", () => {
  it("fails when DATABASE_URL is missing", () => {
    const missing = assertStagingMigrateTarget(undefined);
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.match(missing.reason, /missing/i);
    }

    const empty = assertStagingMigrateTarget("   ");
    assert.equal(empty.ok, false);
  });

  it("fails when DATABASE_URL is malformed", () => {
    const notPostgres = assertStagingMigrateTarget("https://example.com/db");
    assert.equal(notPostgres.ok, false);

    const broken = assertStagingMigrateTarget("postgresql://%");
    assert.equal(broken.ok, false);
  });

  it("fails for production hostname", () => {
    const result = assertStagingMigrateTarget(
      buildUrl(
        "pg-dr-vandana-prod.postgres.database.azure.com",
        "dr_vandana_db_staging",
      ),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /production/i);
      assert.match(result.reason, /pg-dr-vandana-prod/);
    }
  });

  it("fails for production database name", () => {
    const result = assertStagingMigrateTarget(
      buildUrl(
        "pg-dr-vandana-staging.postgres.database.azure.com",
        "dr_vandana_db",
      ),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /production/i);
      assert.match(result.reason, /dr_vandana_db/);
    }
  });

  it("passes for staging hostname and staging database", () => {
    const result = assertStagingMigrateTarget(
      buildUrl(
        "pg-dr-vandana-staging.postgres.database.azure.com",
        "dr_vandana_db_staging",
      ),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(
        result.hostname,
        "pg-dr-vandana-staging.postgres.database.azure.com",
      );
      assert.equal(result.database, "dr_vandana_db_staging");
    }
  });

  it("fails for wrong environment combinations", () => {
    const prodHostProdDb = assertStagingMigrateTarget(
      buildUrl(
        "pg-dr-vandana-prod.postgres.database.azure.com",
        "dr_vandana_db",
      ),
    );
    assert.equal(prodHostProdDb.ok, false);

    const unknownHostStagingDb = assertStagingMigrateTarget(
      buildUrl("localhost", "dr_vandana_db_staging"),
    );
    assert.equal(unknownHostStagingDb.ok, false);

    const stagingHostOtherDb = assertStagingMigrateTarget(
      buildUrl(
        "pg-dr-vandana-staging.postgres.database.azure.com",
        "some_other_db",
      ),
    );
    assert.equal(stagingHostOtherDb.ok, false);

    const ambiguousAzureHost = assertStagingMigrateTarget(
      buildUrl(
        "some-other-server.postgres.database.azure.com",
        "dr_vandana_db_staging",
      ),
    );
    assert.equal(ambiguousAzureHost.ok, false);
  });
});
