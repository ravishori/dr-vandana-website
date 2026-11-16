/**
 * Static guards for the Continuity Loop module (Increment 1).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const DIR = join(process.cwd(), "src", "lib", "continuity");
const files = (readdirSync(DIR) as string[]).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
const read = (f: string) => readFileSync(join(DIR, f), "utf8");
const code = (f: string) =>
  read(f)
    .split("\n")
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .join("\n");

describe("continuity loop static safety", () => {
  it("has source files to check", () => {
    assert.ok(files.length >= 7);
  });

  it("contains no scoring, risk, priority, diagnosis, sentiment, streak or keyword constructs", () => {
    const pattern = /\b(score|scoring|risk|severity|triage|priorit(y|ise|ize)|diagnos(is|e|tic)|sentiment|keyword|streak|compliance|adherence)\b/i;
    const offenders = files.filter((f) => pattern.test(code(f)));
    assert.deepEqual(offenders, []);
  });

  it("does not import AI, analytics, browser storage, network clients or the legacy question portal", () => {
    const pattern = /(openai|anthropic|analytics|gtag|posthog|mixpanel|sentry|fetch\(|localStorage|sessionStorage|XMLHttpRequest|question-portal)/i;
    const offenders = files.filter((f) => pattern.test(code(f)));
    assert.deepEqual(offenders, []);
  });

  it("stays within the increment: no goals, assignments, reflections or review records", () => {
    const pattern = /(AgreedGoal|PracticeAssignment|PracticeEntry|PatientReflection|ReviewRecord|ActivityDefinition)/;
    const offenders = files.filter((f) => pattern.test(code(f)));
    assert.deepEqual(offenders, []);
  });

  it("every repository method that returns or changes content requires a grant as its first argument", () => {
    const iface = read("repository.ts").split("export interface ContinuityOps")[1].split("export interface ContinuityRepository")[0];
    const methods = [...iface.matchAll(/^\s{2}(\w+)\(([^)]*)\)/gm)].map((m) => ({ name: m[1], args: m[2] }));
    assert.ok(methods.length > 15);
    for (const m of methods) {
      if (/^peek/.test(m.name) || m.name === "journeyIdsForPatient" || m.name === "failpoint") continue;
      assert.ok(m.args.trim().startsWith("grant: AccessGrant"), `${m.name} must take a grant`);
    }
  });

  it("the module index does not export the repository operations or peek methods", () => {
    const index = read("index.ts");
    assert.ok(!/ContinuityOps/.test(index));
    assert.ok(!/peek/i.test(index));
  });

  it("uses the central guard and never the raw policy", () => {
    for (const f of files) {
      assert.ok(!/evaluateClinicalAccess/.test(code(f)), f);
      assert.ok(!/clinical-access\/(policy|guard)/.test(code(f)), f);
    }
    assert.ok(/guard\.run\(/.test(code("service.ts")));
  });

  it("is disabled unless explicitly enabled", () => {
    const types = code("types.ts");
    assert.ok(/DEFAULT_CONTINUITY_FLAGS[^=]*=\s*\{\s*enabled:\s*false\s*\}/.test(types));
  });
});
