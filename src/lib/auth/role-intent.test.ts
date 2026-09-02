import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isLoginIntent,
  parseLoginIntent,
  resolveAuthorizedRoleFromSession,
} from "@/lib/auth/role-intent";

describe("login role intent security boundary", () => {
  it("accepts only known login intents", () => {
    assert.equal(isLoginIntent("psychologist"), true);
    assert.equal(isLoginIntent("client"), true);
    assert.equal(isLoginIntent("admin"), false);
    assert.equal(isLoginIntent("psychologist'; DROP TABLE users;--"), false);
  });

  it("parses query intent safely", () => {
    assert.equal(parseLoginIntent("client"), "client");
    assert.equal(parseLoginIntent("unknown"), null);
    assert.equal(parseLoginIntent(undefined), null);
  });

  it("never authorizes from client-selected intent", () => {
    // Simulates a manipulated request: client claims psychologist in the UI.
    const manipulatedIntent = "psychologist";
    assert.equal(isLoginIntent(manipulatedIntent), true);

    // Authorization must come only from a verified session/database role.
    assert.equal(resolveAuthorizedRoleFromSession(null), null);
    assert.equal(resolveAuthorizedRoleFromSession(undefined), null);
    assert.equal(resolveAuthorizedRoleFromSession("client"), "client");
    assert.equal(resolveAuthorizedRoleFromSession("psychologist"), "psychologist");
  });
});
