import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { BLOCKING_STATUSES } from "@/lib/appointments/constants";
import {
  CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
  CONSTRAINT_CATALOG_SQL,
  EXCLUSION_BLOCKING_STATUSES,
  REQUIRED_CONSTRAINTS,
  REQUIRED_EXTENSIONS,
  REQUIRED_INDEXES,
  REQUIRED_TABLES,
  REQUIRED_TRIGGERS,
  evaluateAppointmentsBlockingOccupiedExclusion,
  formatSchemaVerification,
  passingExclusionDefinitionChecks,
  summarizeSchemaChecks,
  verifyPracticeSchema,
} from "@/lib/identity/schema-verification";

const VALID_EXCLUSION_ROW = {
  name: "appointments_blocking_occupied_excl",
  contype: "x",
  relname: "appointments",
  definition: CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
};

async function mockCatalog(options: {
  tables?: readonly string[];
  extensions?: readonly string[];
  constraints?: Record<string, unknown>[];
  indexes?: readonly string[];
  triggers?: readonly string[];
}) {
  return verifyPracticeSchema(async (sql) => {
    if (sql.includes("pg_tables")) {
      return (options.tables ?? REQUIRED_TABLES).map((name) => ({ name }));
    }
    if (sql.includes("pg_extension")) {
      return (options.extensions ?? REQUIRED_EXTENSIONS).map((name) => ({ name }));
    }
    if (sql.includes("pg_constraint") || sql.includes("pg_get_constraintdef")) {
      return options.constraints ?? [VALID_EXCLUSION_ROW];
    }
    if (sql.includes("pg_indexes")) {
      return (options.indexes ?? REQUIRED_INDEXES).map((name) => ({ name }));
    }
    if (sql.includes("pg_trigger")) {
      return (options.triggers ?? REQUIRED_TRIGGERS).map((name) => ({ name }));
    }
    return [];
  });
}

describe("practice schema verification", () => {
  it("fails closed when btree_gist or the exclusion constraint is missing", async () => {
    const report = await mockCatalog({
      extensions: [],
      constraints: [],
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
    assert.ok(
      report.checks.some(
        (check) =>
          check.name ===
            "constraint-def:appointments_blocking_occupied_excl:blocking-statuses" &&
          check.status === "FAIL",
      ),
    );
    const rendered = formatSchemaVerification(report);
    assert.match(rendered, /^SCHEMA FAIL/m);
    assert.doesNotMatch(rendered, /postgres:\/\//);
    assert.doesNotMatch(rendered, /DATABASE_URL/);
  });

  it("fails closed when exclusion constraint definition is wrong", async () => {
    const report = await mockCatalog({
      constraints: [
        {
          name: "appointments_blocking_occupied_excl",
          contype: "c",
          relname: "appointments",
          definition:
            "CHECK ((status = ANY (ARRAY['CANCELLED'::text, 'REJECTED'::text])))",
        },
      ],
    });
    assert.equal(report.status, "FAIL");
    assert.ok(
      report.checks.some(
        (check) =>
          check.name === "constraint:appointments_blocking_occupied_excl" &&
          check.status === "PASS",
      ),
    );
    assert.ok(
      report.checks.some(
        (check) =>
          check.name ===
            "constraint-def:appointments_blocking_occupied_excl:exclusion-type" &&
          check.status === "FAIL",
      ),
    );
    assert.ok(
      report.checks.some(
        (check) =>
          check.name ===
            "constraint-def:appointments_blocking_occupied_excl:blocking-statuses" &&
          check.status === "FAIL",
      ),
    );
  });

  it("fails closed when btree_gist extension alone is missing", async () => {
    const report = await mockCatalog({ extensions: [] });
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
          check.status === "PASS",
      ),
    );
  });

  it("passes when required catalog objects and exclusion semantics match", async () => {
    const report = await mockCatalog({});
    assert.equal(report.status, "PASS");
    assert.ok(
      report.checks.every((check) => check.status === "PASS"),
      formatSchemaVerification(report),
    );
  });

  it("keeps historical 0003 unchanged and requires post-migrate verification", () => {
    const source = readFileSync(
      join(process.cwd(), "drizzle/0003_appointment_engine.sql"),
      "utf8",
    );
    assert.match(source, /EXCEPTION WHEN OTHERS/);
    assert.match(source, /appointments_blocking_occupied_excl/);
    assert.match(source, /CREATE EXTENSION IF NOT EXISTS btree_gist/);
    assert.match(
      source,
      /status IN \('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'\)/,
    );
    const migrate = readFileSync(
      join(process.cwd(), "scripts/migrate-identity.ts"),
      "utf8",
    );
    assert.match(migrate, /verifyPracticeSchema/);
    assert.match(migrate, /process\.exit\(1\)/);
    const verify = readFileSync(
      join(process.cwd(), "scripts/verify-production-schema.ts"),
      "utf8",
    );
    assert.match(verify, /verifyPracticeSchema/);
    assert.match(CONSTRAINT_CATALOG_SQL, /pg_get_constraintdef/);
  });

  it("aligns exclusion blocking statuses with appointment engine constants", () => {
    assert.deepEqual(
      [...EXCLUSION_BLOCKING_STATUSES],
      [...BLOCKING_STATUSES],
    );
  });

  it("evaluates canonical exclusion definition as PASS", () => {
    const checks = passingExclusionDefinitionChecks();
    assert.ok(checks.every((check) => check.status === "PASS"));
  });

  it("rejects a differently partitioned or ranged exclusion definition", () => {
    const wrongPsychologist = evaluateAppointmentsBlockingOccupiedExclusion({
      name: "appointments_blocking_occupied_excl",
      contype: "x",
      relname: "appointments",
      definition:
        "EXCLUDE USING gist (patient_user_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'))",
    });
    assert.ok(
      wrongPsychologist.some(
        (check) =>
          check.name ===
            "constraint-def:appointments_blocking_occupied_excl:psychologist" &&
          check.status === "FAIL",
      ),
    );
    assert.ok(
      wrongPsychologist.some(
        (check) =>
          check.name ===
            "constraint-def:appointments_blocking_occupied_excl:occupied-range" &&
          check.status === "FAIL",
      ),
    );
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
      ...passingExclusionDefinitionChecks(),
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

  it("requires practice scheduling tables and otp_attempts", () => {
    const required = REQUIRED_TABLES as readonly string[];
    for (const name of [
      "practice_hours",
      "practice_hour_breaks",
      "availability_exceptions",
      "practice_appointment_settings",
      "otp_attempts",
    ] as const) {
      assert.ok(required.includes(name), `missing required table ${name}`);
    }
  });

  it("fails when a required practice scheduling table is absent", async () => {
    const presentTables = REQUIRED_TABLES.filter(
      (name) => name !== "practice_hours",
    );
    const report = await mockCatalog({ tables: presentTables });
    assert.equal(report.status, "FAIL");
    assert.ok(
      report.checks.some(
        (check) =>
          check.name === "table:practice_hours" && check.status === "FAIL",
      ),
    );
  });
});
