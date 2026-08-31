/**
 * Read-only production schema verification.
 * Never prints DATABASE_URL or credentials. Does not migrate or mutate schema.
 *
 * Appointment integrity: presence of btree_gist and appointments_blocking_occupied_excl
 * is mandatory. Historical drizzle/0003 may NOTICE-skip the exclusion constraint;
 * migrate/verify gates must fail closed when the catalog invariant is absent or wrong.
 */

export type SchemaCheckStatus = "PASS" | "FAIL";

export type SchemaCheck = {
  name: string;
  status: SchemaCheckStatus;
};

export type SchemaVerificationReport = {
  status: "PASS" | "FAIL" | "NOT CONFIGURED";
  checks: SchemaCheck[];
};

export type SchemaQueryFn = (sql: string) => Promise<Record<string, unknown>[]>;

export type ConstraintCatalogRow = {
  name: string;
  contype?: string | null;
  relname?: string | null;
  definition?: string | null;
};

export const REQUIRED_TABLES = [
  "users",
  "roles",
  "permissions",
  "user_roles",
  "role_permissions",
  "patient_profiles",
  "psychologist_profiles",
  "sessions",
  "email_verifications",
  "phone_verifications",
  "otp_attempts",
  "password_reset_tokens",
  "mfa_credentials",
  "mfa_recovery_codes",
  "audit_logs",
  "security_events",
  "appointment_types",
  "practice_appointment_settings",
  "practice_hours",
  "practice_hour_breaks",
  "availability_exceptions",
  "appointments",
  "appointment_history",
  "appointment_notification_outbox",
  "appointment_notification_deliveries",
  "appointment_notification_attempts",
  "booking_idempotency",
] as const;

export const REQUIRED_EXTENSIONS = ["btree_gist"] as const;

export const REQUIRED_CONSTRAINTS = [
  "appointments_blocking_occupied_excl",
] as const;

/**
 * Statuses that must appear in the exclusion WHERE predicate.
 * Must match drizzle/0003 and BLOCKING_STATUSES (CANCELLED/REJECTED/etc. must not block).
 */
export const EXCLUSION_BLOCKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "RESCHEDULE_REQUESTED",
] as const;

/** Terminal statuses that must not appear in the exclusion blocking predicate. */
export const EXCLUSION_NON_BLOCKING_STATUSES = [
  "CANCELLED",
  "REJECTED",
  "COMPLETED",
  "NO_SHOW",
  "REQUESTED",
] as const;

export const REQUIRED_INDEXES = [
  "booking_idempotency_user_op_key_uidx",
  "appointment_delivery_outbox_channel_role_uidx",
  "appointments_public_id_uidx",
] as const;

export const REQUIRED_TRIGGERS = ["appointment_history_no_update"] as const;

export const CONSTRAINT_CATALOG_SQL = `
SELECT c.conname AS name,
       c.contype::text AS contype,
       cl.relname AS relname,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class cl ON cl.oid = c.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'public'
`.replace(/\s+/g, " ").trim();

function asName(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function namesFrom(rows: Record<string, unknown>[], key: string): Set<string> {
  return new Set(
    rows.map((row) => asName(row[key])).filter((name): name is string => Boolean(name)),
  );
}

function checksFor(
  required: readonly string[],
  present: Set<string>,
  prefix: string,
): SchemaCheck[] {
  return required.map((name) => ({
    name: `${prefix}:${name}`,
    status: present.has(name) ? "PASS" : "FAIL",
  }));
}

function normalizeSqlFragment(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Match status tokens as SQL string literals only.
 * Do not use bare substring search — REQUESTED is a substring of RESCHEDULE_REQUESTED.
 */
function definitionIncludesStatus(definitionUpper: string, status: string): boolean {
  return (
    definitionUpper.includes(`'${status}'`) ||
    definitionUpper.includes(`"${status}"`)
  );
}

/**
 * Semantic checks for appointments_blocking_occupied_excl.
 * Avoids brittle full-string equality; PostgreSQL normalizes formatting.
 */
export function evaluateAppointmentsBlockingOccupiedExclusion(
  row: ConstraintCatalogRow | undefined,
): SchemaCheck[] {
  const presenceName = "constraint:appointments_blocking_occupied_excl";
  const def = (suffix: string) =>
    `constraint-def:appointments_blocking_occupied_excl:${suffix}`;

  if (!row || row.name !== "appointments_blocking_occupied_excl") {
    return [
      { name: presenceName, status: "FAIL" },
      { name: def("exclusion-type"), status: "FAIL" },
      { name: def("table"), status: "FAIL" },
      { name: def("gist"), status: "FAIL" },
      { name: def("psychologist"), status: "FAIL" },
      { name: def("occupied-range"), status: "FAIL" },
      { name: def("blocking-statuses"), status: "FAIL" },
    ];
  }

  const definition = asOptionalString(row.definition) ?? "";
  const normalized = normalizeSqlFragment(definition);
  const upper = definition.toUpperCase();

  const blockingOk = EXCLUSION_BLOCKING_STATUSES.every((status) =>
    definitionIncludesStatus(upper, status),
  );
  const nonBlockingLeaked = EXCLUSION_NON_BLOCKING_STATUSES.some((status) =>
    definitionIncludesStatus(upper, status),
  );

  return [
    { name: presenceName, status: "PASS" },
    {
      name: def("exclusion-type"),
      status: row.contype === "x" ? "PASS" : "FAIL",
    },
    {
      name: def("table"),
      status: row.relname === "appointments" ? "PASS" : "FAIL",
    },
    {
      name: def("gist"),
      status: /\busing\s+gist\b/.test(normalized) ? "PASS" : "FAIL",
    },
    {
      name: def("psychologist"),
      status: normalized.includes("psychologist_user_id") ? "PASS" : "FAIL",
    },
    {
      name: def("occupied-range"),
      status:
        normalized.includes("tstzrange") &&
        normalized.includes("occupied_starts_at") &&
        normalized.includes("occupied_ends_at")
          ? "PASS"
          : "FAIL",
    },
    {
      name: def("blocking-statuses"),
      status: blockingOk && !nonBlockingLeaked ? "PASS" : "FAIL",
    },
  ];
}

/** Representative pg_get_constraintdef output (formatting may vary by PG version). */
export const CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION =
  "EXCLUDE USING gist (psychologist_user_id WITH =, tstzrange(occupied_starts_at, occupied_ends_at, '[)'::text) WITH &&) WHERE ((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'RESCHEDULE_REQUESTED'::character varying])::text[]))";

export function summarizeSchemaChecks(checks: SchemaCheck[]): SchemaVerificationReport {
  const failed = checks.some((check) => check.status === "FAIL");
  return {
    status: failed ? "FAIL" : "PASS",
    checks,
  };
}

function constraintRowFrom(row: Record<string, unknown>): ConstraintCatalogRow | undefined {
  const name = asName(row.name);
  if (!name) {
    return undefined;
  }
  return {
    name,
    contype: asOptionalString(row.contype),
    relname: asOptionalString(row.relname),
    definition: asOptionalString(row.definition),
  };
}

export async function verifyPracticeSchema(
  query: SchemaQueryFn,
): Promise<SchemaVerificationReport> {
  const tables = namesFrom(
    await query(
      "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public'",
    ),
    "name",
  );
  const extensions = namesFrom(
    await query("SELECT extname AS name FROM pg_extension"),
    "name",
  );
  const constraintCatalog = await query(CONSTRAINT_CATALOG_SQL);
  const indexes = namesFrom(
    await query("SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'"),
    "name",
  );
  const triggers = namesFrom(
    await query("SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal"),
    "name",
  );

  const exclusionCatalogRow = constraintCatalog
    .map(constraintRowFrom)
    .find((row) => row?.name === "appointments_blocking_occupied_excl");

  const checks = [
    ...checksFor(REQUIRED_TABLES, tables, "table"),
    ...checksFor(REQUIRED_EXTENSIONS, extensions, "extension"),
    ...evaluateAppointmentsBlockingOccupiedExclusion(exclusionCatalogRow),
    ...checksFor(REQUIRED_INDEXES, indexes, "index"),
    ...checksFor(REQUIRED_TRIGGERS, triggers, "trigger"),
  ];
  return summarizeSchemaChecks(checks);
}

export function formatSchemaVerification(report: SchemaVerificationReport): string {
  const lines = [
    `SCHEMA ${report.status}`,
    ...report.checks.map((check) => `${check.status} ${check.name}`),
  ];
  return lines.join("\n");
}

/** All PASS definition checks for a correctly shaped exclusion row (for unit fixtures). */
export function passingExclusionDefinitionChecks(): SchemaCheck[] {
  return evaluateAppointmentsBlockingOccupiedExclusion({
    name: "appointments_blocking_occupied_excl",
    contype: "x",
    relname: "appointments",
    definition: CANONICAL_BLOCKING_OCCUPIED_EXCL_DEFINITION,
  });
}
