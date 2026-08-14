/**
 * Read-only production schema verification.
 * Never prints DATABASE_URL or credentials. Does not migrate or mutate schema.
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
  "password_reset_tokens",
  "mfa_credentials",
  "mfa_recovery_codes",
  "audit_logs",
  "security_events",
  "appointments",
  "appointment_types",
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

export const REQUIRED_INDEXES = [
  "booking_idempotency_user_op_key_uidx",
  "appointment_delivery_outbox_channel_role_uidx",
  "appointments_public_id_uidx",
] as const;

export const REQUIRED_TRIGGERS = ["appointment_history_no_update"] as const;

function asName(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
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

export function summarizeSchemaChecks(checks: SchemaCheck[]): SchemaVerificationReport {
  const failed = checks.some((check) => check.status === "FAIL");
  return {
    status: failed ? "FAIL" : "PASS",
    checks,
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
  const constraints = namesFrom(
    await query("SELECT conname AS name FROM pg_constraint"),
    "name",
  );
  const indexes = namesFrom(
    await query("SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public'"),
    "name",
  );
  const triggers = namesFrom(
    await query("SELECT tgname AS name FROM pg_trigger WHERE NOT tgisinternal"),
    "name",
  );

  const checks = [
    ...checksFor(REQUIRED_TABLES, tables, "table"),
    ...checksFor(REQUIRED_EXTENSIONS, extensions, "extension"),
    ...checksFor(REQUIRED_CONSTRAINTS, constraints, "constraint"),
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
