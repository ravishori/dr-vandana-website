/**
 * Static guards for the intake engine: no scoring, classification,
 * prioritisation, diagnosis, AI, analytics or browser storage.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const DIR = join(process.cwd(), "src", "lib", "intake");
const files = readdirSync(DIR, { recursive: true, withFileTypes: false })
  .map(String)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));

const read = (f: string) => readFileSync(join(DIR, f), "utf8");

describe("intake engine static safety", () => {
  it("has source files to check", () => {
    assert.ok(files.length >= 6);
  });

  it("contains no scoring, risk, priority, diagnosis or sentiment constructs", () => {
    const pattern = /\b(score|scoring|riskLevel|riskScore|risk_score|severity|triage|priorit(y|ise|ize)|diagnos(is|e|tic)|sentiment|keyword)\b/i;
    const offenders = files.filter((f) => {
      // The authoring guard legitimately names safety terms to REJECT them in definitions.
      if (f === "authoring-guard.ts") return false;
      return read(f)
        .split("\n")
        .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l)) // comments may describe the prohibition
        .some((l) => pattern.test(l));
    });
    assert.deepEqual(offenders, []);
  });

  it("does not import AI, analytics, browser storage or network clients", () => {
    const pattern = /(openai|anthropic|analytics|gtag|posthog|mixpanel|sentry|fetch\(|localStorage|sessionStorage|XMLHttpRequest)/i;
    const offenders = files.filter((f) => pattern.test(read(f)));
    assert.deepEqual(offenders, []);
  });

  it("never reads the text of a patient answer in conditions or the review task builder", () => {
    // Conditions only accept choice questions; this guards the evaluator itself.
    const def = read("definition.ts");
    assert.ok(/condition_on_non_choice/.test(def));
    const service = read("service.ts");
    assert.equal(/\.text\b.*(includes|match|test|indexOf)/.test(service), false);
  });
});
