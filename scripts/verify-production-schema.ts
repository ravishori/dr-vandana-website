/**
 * Operator-only schema verification against DATABASE_URL.
 * Read-only. Never prints the URL or credentials.
 */

import postgres from "postgres";

import { isPostgresUrl } from "../src/lib/identity/config";
import {
  formatSchemaVerification,
  verifyPracticeSchema,
} from "../src/lib/identity/schema-verification";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    process.stdout.write("NOT CONFIGURED\n");
    process.exit(0);
  }
  const sql = postgres(url, { max: 1, prepare: false });
  try {
    const report = await verifyPracticeSchema(async (text) => {
      const rows = await sql.unsafe(text);
      return rows as unknown as Record<string, unknown>[];
    });
    process.stdout.write(`${formatSchemaVerification(report)}\n`);
    process.exit(report.status === "PASS" ? 0 : 1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch(() => {
  process.stderr.write("FAIL schema verification could not run\n");
  process.exit(1);
});
