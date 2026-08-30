import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  evaluatePasswordPolicy,
  evaluateProvisionalPasswordPolicy,
  PASSWORD_MIN_LENGTH,
} from "@/lib/identity/password-policy";

describe("password policy", () => {
  it("rejects short lasting passwords and accepts provisional short passwords", () => {
    assert.equal(evaluatePasswordPolicy("12345").ok, false);
    assert.equal(
      evaluatePasswordPolicy("x".repeat(PASSWORD_MIN_LENGTH - 1)).ok,
      false,
    );
    assert.equal(
      evaluatePasswordPolicy("correct-horse-battery").ok,
      true,
    );
    assert.equal(evaluateProvisionalPasswordPolicy("12345").ok, true);
    assert.equal(evaluateProvisionalPasswordPolicy("").ok, false);
  });
});
