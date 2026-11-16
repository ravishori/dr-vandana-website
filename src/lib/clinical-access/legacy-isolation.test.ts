/**
 * Isolation of the legacy visitor question portal from clinical workflows.
 *
 * The legacy portal collects visitor free text (name, email, question) under a
 * separate env-credential login without MFA. Its content must never flow into
 * clinical records, the patient portal, intake, notifications or appointments,
 * and clinical code must not depend on it. Static import-graph checks.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) acc.push(path);
  }
  return acc;
}

const rel = (p: string) => relative(ROOT, p).split(sep).join("/");

function importsOf(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const out: string[] = [];
  for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) out.push(m[1]);
  return out;
}

const PORTAL_FILES = [
  ...walk(join(SRC, "lib", "question-portal")),
  ...walk(join(SRC, "components", "question-portal")),
  ...walk(join(SRC, "app", "ask-a-question")),
];

const CLINICAL_OR_NEW_FILES = [
  "lib/clinical-access",
  "lib/intake",
  "lib/practice-schedule",
  "lib/appointments",
  "lib/notifications",
  "lib/practice",
  "app/patient",
  "app/psychologist/practice",
].flatMap((d) => walk(join(SRC, ...d.split("/"))));

describe("legacy question portal isolation", () => {
  it("finds the portal and the clinical code it must stay apart from", () => {
    assert.ok(PORTAL_FILES.length > 5);
    assert.ok(CLINICAL_OR_NEW_FILES.length > 5);
  });

  it("clinical, intake, appointment, notification, practice and patient-portal code never import the portal", () => {
    const offenders = CLINICAL_OR_NEW_FILES.filter((f) =>
      importsOf(f).some((i) => /question-portal/.test(i)),
    ).map(rel);
    assert.deepEqual(offenders, []);
  });

  it("the portal never imports identity, clinical, intake, appointment, notification or practice code", () => {
    const forbidden = /^@\/lib\/(identity|clinical-access|intake|practice|practice-schedule|appointments|notifications)(\/|$)/;
    const offenders = PORTAL_FILES.filter((f) => importsOf(f).some((i) => forbidden.test(i))).map(rel);
    assert.deepEqual(offenders, []);
  });

  it("the only identity dependency on the portal is its shared password hashing helper", () => {
    const identity = walk(join(SRC, "lib", "identity"));
    const bad: string[] = [];
    for (const f of identity) {
      for (const i of importsOf(f)) {
        if (/question-portal/.test(i) && i !== "@/lib/question-portal/password") bad.push(`${rel(f)} -> ${i}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  it("only the portal's own service and actions use the AI draft helper", () => {
    const users = walk(SRC)
      .filter((f) => importsOf(f).some((i) => /question-portal\/ai-draft$/.test(i)))
      .map(rel)
      .sort();
    for (const u of users) {
      assert.ok(
        u.startsWith("src/lib/question-portal/") || u.startsWith("src/app/psychologist/"),
        u,
      );
    }
  });
});
