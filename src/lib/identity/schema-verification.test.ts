import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  REQUIRED_CONSTRAINTS,
  REQUIRED_EXTENSIONS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  REQUIRED_TRIGGERS,
  formatSchemaVerification,
  summarizeSchemaChecks,
  verifyPracticeSchema,
} from "@/lib/identity/schema-verification";

describe("practice schema verification", () => {
  it("fails closed when btree_gist or the exclusion constraint is missing", async () => {
    const report = await verifyPracticeSchema(async (sql) => {
      if (sql.includes("pg_tables")) {
        return REQUIRED_TABLES.map((name) => ({ name }));
      }
      if (sql.includes("pg_extension")) {
        return [];
      }
      if (sql.includes("pg_constraint")) {
        return [];
      }
      if (sql.includes("pg_indexes")) {
        return REQUIRED_INDEXES.map((name) => ({ name }));
      }
      if (sql.includes("pg_trigger")) {
        return REQUIRED_TRIGGERS.map((name) => ({ name }));
      }
      return [];
    });
    assert.equal(report.status, "FAIL");
    assert.ok(
      report.checks.some(
        (check) => check.name === "extension:btree_gist" && check.status === "FAIL",
      ),
    );
    assert.ok(
      report.checks.some(
        (check) =>
          check.name === "constraint:appointments_blocking_occupied_excl" &&
          check.status === "FAIL",
      ),
    );
    const rendered = formatSchemaVerification(report);
    assert.match(rendered, /^SCHEMA FAIL/m);
    assert.doesNotMatch(rendered, /postgres:\/\//);
    assert.doesNotMatch(rendered, /DATABASE_URL/);
  });

  it("keeps historical 0003 unchanged and requires post-migrate verification", () => {
    const source = readFileSync(
      join(process.cwd(), "drizzle/0003_appointment_engine.sql"),
      "utf8",
    );
    assert.match(source, /EXCEPTION WHEN OTHERS/);
    assert.match(source, /appointments_blocking_occupied_excl/);
    const migrate = readFileSync(
      join(process.cwd(), "scripts/migrate-identity.ts"),
      "utf8",
    );
    assert.match(migrate, /verifyPracticeSchema/);
  });

  it("passes when required tables, extension, constraint, indexes, and trigger exist", () => {
    const report = summarizeSchemaChecks([
      ...REQUIRED_TABLES.map((name) => ({
        name: `table:${name}`,
        status: "PASS" as const,
      })),
      ...REQUIRED_EXTENSIONS.map((name) => ({
        name: `extension:${name}`,
        status: "PASS" as const,
      })),
      ...REQUIRED_CONSTRAINTS.map((name) => ({
        name: `constraint:${name}`,
        status: "PASS" as const,
      })),
      ...REQUIRED_INDEXES.map((name) => ({
        name: `index:${name}`,
        status: "PASS" as const,
      })),
      ...REQUIRED_TRIGGERS.map((name) => ({
        name: `trigger:${name}`,
        status: "PASS" as const,
      })),
    ]);
    assert.equal(report.status, "PASS");
  });

  it("does not require clinical record tables in Option B schema verification", () => {
    const required = REQUIRED_TABLES as readonly string[];
    assert.equal(required.includes("consultations"), false);
    assert.equal(required.includes("consultation_notes"), false);
    assert.equal(required.includes("patient_documents"), false);
    assert.ok(required.includes("appointments"));
    assert.ok(REQUIRED_EXTENSIONS.includes("btree_gist"));
    assert.ok(REQUIRED_CONSTRAINTS.includes("appointments_blocking_occupied_excl"));
  });
});
