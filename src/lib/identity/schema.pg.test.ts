import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import postgres from "postgres";

import { applyIdentityMigrationSql } from "@/lib/identity/db";
import {
  REQUIRED_CONSTRAINTS,
  REQUIRED_EXTENSIONS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  REQUIRED_TRIGGERS,
  verifyPracticeSchema,
} from "@/lib/identity/schema-verification";

const url = process.env.APPOINTMENT_PG_URL;
const enabled = Boolean(url && /^postgres(ql)?:\/\//.test(url));

describe("phase 2H postgres schema integrity", { skip: !enabled }, () => {
  let sql: ReturnType<typeof postgres>;

  before(async () => {
    if (!url) {
      return;
    }
    sql = postgres(url, { max: 1, prepare: false });
    await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
    await applyIdentityMigrationSql((statement) => sql.unsafe(statement));
  });

  after(async () => {
    await sql?.end({ timeout: 5 });
  });

  it("requires btree_gist, exclusion constraint, history trigger, and uniqueness indexes", async () => {
    const report = await verifyPracticeSchema(async (text) => {
      const rows = await sql.unsafe(text);
      return rows as unknown as Record<string, unknown>[];
    });
    assert.equal(report.status, "PASS");
    for (const table of REQUIRED_TABLES) {
      assert.ok(report.checks.some((check) => check.name === `table:${table}` && check.status === "PASS"));
    }
    for (const name of REQUIRED_EXTENSIONS) {
      assert.ok(report.checks.some((check) => check.name === `extension:${name}` && check.status === "PASS"));
    }
    for (const name of REQUIRED_CONSTRAINTS) {
      assert.ok(report.checks.some((check) => check.name === `constraint:${name}` && check.status === "PASS"));
    }
    for (const name of REQUIRED_INDEXES) {
      assert.ok(report.checks.some((check) => check.name === `index:${name}` && check.status === "PASS"));
    }
    for (const name of REQUIRED_TRIGGERS) {
      assert.ok(report.checks.some((check) => check.name === `trigger:${name}` && check.status === "PASS"));
    }
  });
});
