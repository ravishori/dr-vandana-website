/**
 * Permanent security regression guards for the clinical platform.
 * Static checks: they fail the build if forbidden constructs appear.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { MFA_REQUIRED_ROLES } from "@/lib/identity/constants";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(path, acc);
    } else {
      acc.push(path);
    }
  }
  return acc;
}

const sourceFiles = walk(join(ROOT, "src")).filter(
  (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
);

describe("mandatory MFA regression", () => {
  it("keeps TOTP MFA mandatory for psychologists and super admins", () => {
    assert.ok(MFA_REQUIRED_ROLES.includes("PSYCHOLOGIST"));
    assert.ok(MFA_REQUIRED_ROLES.includes("SUPER_ADMIN"));
  });

  it("contains no MFA exemption mechanism in application source", () => {
    const pattern = /mfa_?exempt|mfaExempt|mfa_exemption|skipMfa|bypassMfa/i;
    const offenders = sourceFiles.filter((f) =>
      pattern.test(readFileSync(f, "utf8")),
    );
    assert.deepEqual(offenders, []);
  });

  it("has no migration that adds an MFA exemption column", () => {
    const sql = readdirSync(join(ROOT, "drizzle")).filter((f) =>
      f.endsWith(".sql"),
    );
    const offenders = sql.filter((f) =>
      /mfa_?exempt/i.test(readFileSync(join(ROOT, "drizzle", f), "utf8")),
    );
    assert.deepEqual(offenders, []);
  });
});

describe("clinical safety guards (static)", () => {
  it("has no risk-label or suicide-score constructs in application source", () => {
    const pattern =
      /riskLevel|risk_level|riskScore|risk_score|suicideRisk|suicide_risk|lowRisk|highRisk|autoPriority|auto_priority/i;
    const offenders = sourceFiles.filter((f) =>
      pattern.test(readFileSync(f, "utf8")),
    );
    assert.deepEqual(offenders, []);
  });

  it("lets only the clinical-access module use the raw policy (no bypass of the guard)", () => {
    const clinicalDir = join(ROOT, "src", "lib", "clinical-access");
    const offenders = sourceFiles.filter((f) => {
      if (f.startsWith(clinicalDir)) return false;
      const text = readFileSync(f, "utf8");
      return (
        /from\s+["']@\/lib\/clinical-access\/(policy|guard)["']/.test(text) ||
        /evaluateClinicalAccess/.test(text)
      );
    });
    assert.deepEqual(offenders, []);
  });

  it("does not re-export the raw policy from the public index", () => {
    const text = readFileSync(
      join(ROOT, "src", "lib", "clinical-access", "index.ts"),
      "utf8",
    );
    assert.equal(/export\s*\*\s*from\s*["']@\/lib\/clinical-access\/policy["']/.test(text), false);
  });

  it("does not import analytics or external AI SDKs into clinical-access code", () => {
    const dir = join(ROOT, "src", "lib", "clinical-access");
    const files = walk(dir).filter((f) => f.endsWith(".ts"));
    const pattern = /(openai|anthropic|google-analytics|gtag|posthog|segment|mixpanel|sentry)/i;
    const offenders = files.filter((f) => {
      const text = readFileSync(f, "utf8");
      return text
        .split("\n")
        .some((line) => /^\s*import\b/.test(line) && pattern.test(line));
    });
    assert.deepEqual(offenders, []);
  });
});
