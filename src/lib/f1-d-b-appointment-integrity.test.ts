/**
 * F1-D-B — Appointment integrity hardening regressions.
 * Catalog verification uses isolated fixtures only (no shared DB mutation).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { BLOCKING_STATUSES } from "@/lib/appointments/constants";
import {
  CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
  EXCLUSION_BLOCKING_STATUSES,
  EXCLUSION_NON_BLOCKING_STATUSES,
  evaluateAppointmentsBlockingOccupiedExclusion,
  formatSchemaVerification,
  verifyPracticeSchema,
} from "@/lib/identity/schema-verification";

describe("F1-D-B appointment integrity hardening", () => {
  it("Test A — required constraint present with correct semantics passes", () => {
    const checks = evaluateAppointmentsBlockingOccupiedExclusion({
      name: "appointments_blocking_occupied_excl",
      contype: "x",
      relname: "appointments",
      definition: CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
    });
    assert.ok(checks.every((check) => check.status === "PASS"));
  });

  it("Test B — missing constraint is detected as not ready", async () => {
    const report = await verifyPracticeSchema(async (sql) => {
      if (sql.includes("pg_tables")) return [{ name: "appointments" }];
      if (sql.includes("pg_extension")) return [{ name: "btree_gist" }];
      if (sql.includes("pg_constraint") || sql.includes("pg_get_constraintdef")) {
        return [];
      }
      if (sql.includes("pg_indexes")) return [];
      if (sql.includes("pg_trigger")) return [];
      return [];
    });
    assert.equal(report.status, "FAIL");
    assert.match(formatSchemaVerification(report), /FAIL constraint:appointments_blocking_occupied_excl/);
  });

  it("Test C — wrong constraint definition is rejected", () => {
    const checks = evaluateAppointmentsBlockingOccupiedExclusion({
      name: "appointments_blocking_occupied_excl",
      contype: "x",
      relname: "users",
      definition:
        "EXCLUDE USING btree (id WITH =) WHERE (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED'))",
    });
    assert.equal(
      checks.find((c) => c.name.endsWith(":table"))?.status,
      "FAIL",
    );
    assert.equal(
      checks.find((c) => c.name.endsWith(":gist"))?.status,
      "FAIL",
    );
    assert.equal(
      checks.find((c) => c.name.endsWith(":occupied-range"))?.status,
      "FAIL",
    );
    assert.equal(
      checks.find((c) => c.name.endsWith(":psychologist"))?.status,
      "FAIL",
    );
  });

  it("Test D — missing btree_gist extension is detected as not ready", async () => {
    const report = await verifyPracticeSchema(async (sql) => {
      if (sql.includes("pg_tables")) return [{ name: "appointments" }];
      if (sql.includes("pg_extension")) return [];
      if (sql.includes("pg_constraint") || sql.includes("pg_get_constraintdef")) {
        return [
          {
            name: "appointments_blocking_occupied_excl",
            contype: "x",
            relname: "appointments",
            definition: CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
          },
        ];
      }
      if (sql.includes("pg_indexes")) return [];
      if (sql.includes("pg_trigger")) return [];
      return [];
    });
    assert.equal(report.status, "FAIL");
    assert.match(formatSchemaVerification(report), /FAIL extension:btree_gist/);
  });

  it("blocking predicate matches engine constants and excludes terminal statuses", () => {
    assert.deepEqual([...EXCLUSION_BLOCKING_STATUSES], [...BLOCKING_STATUSES]);
    for (const status of EXCLUSION_NON_BLOCKING_STATUSES) {
      assert.equal(
        (BLOCKING_STATUSES as readonly string[]).includes(status),
        false,
      );
    }
    const withCancelled = evaluateAppointmentsBlockingOccupiedExclusion({
      name: "appointments_blocking_occupied_excl",
      contype: "x",
      relname: "appointments",
      definition:
        "EXCLUDE USING gist (psychologist_user_id WITH =, tstzrange(occupied_starts_at, occupied_ends_at, '[)') WITH &&) WHERE (status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'CANCELLED'))",
    });
    assert.equal(
      withCancelled.find((c) => c.name.endsWith(":blocking-statuses"))?.status,
      "FAIL",
    );
  });

  it("does not auto-repair schema; detection remains read-only", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/identity/schema-verification.ts"),
      "utf8",
    );
    assert.doesNotMatch(source, /CREATE EXTENSION/i);
    assert.doesNotMatch(source, /ALTER TABLE/i);
    assert.doesNotMatch(source, /ADD CONSTRAINT/i);
    const verifyScript = readFileSync(
      join(process.cwd(), "scripts/verify-production-schema.ts"),
      "utf8",
    );
    assert.doesNotMatch(verifyScript, /CREATE EXTENSION/i);
    assert.doesNotMatch(verifyScript, /ALTER TABLE/i);
  });

  it("preserves advisory lock and occupancy layers in appointment engine", () => {
    const lock = readFileSync(
      join(process.cwd(), "src/lib/appointments/lock.ts"),
      "utf8",
    );
    assert.match(lock, /pg_advisory_xact_lock/);
    const occupancy = readFileSync(
      join(process.cwd(), "src/lib/appointments/occupancy.ts"),
      "utf8",
    );
    assert.match(occupancy, /BLOCKING_STATUSES/);
    const booking = readFileSync(
      join(process.cwd(), "src/lib/appointments/booking.ts"),
      "utf8",
    );
    assert.match(booking, /lockPsychologistCalendar/);
  });
});
