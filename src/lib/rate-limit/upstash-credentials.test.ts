import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasUpstashCredentials,
  readUpstashRestCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "@/config/appointment-submission";

describe("upstash credential reading", () => {
  it("accepts trimmed HTTPS REST credentials", () => {
    const credentials = readUpstashRestCredentials(
      "  https://example.upstash.io  ",
      "  token-value  ",
    );
    assert.deepEqual(credentials, {
      url: "https://example.upstash.io",
      token: "token-value",
      source: "explicit",
    });
    assert.equal(
      hasUpstashCredentials(
        "  https://example.upstash.io  ",
        "  token-value  ",
      ),
      true,
    );
  });

  it("rejects missing, blank, or non-HTTPS credentials", () => {
    assert.equal(readUpstashRestCredentials(undefined, "token"), null);
    assert.equal(
      readUpstashRestCredentials("https://example.upstash.io", ""),
      null,
    );
    assert.equal(
      readUpstashRestCredentials("redis://example.upstash.io", "token"),
      null,
    );
    assert.equal(hasUpstashCredentials("https://x", "   "), false);
  });

  it("falls back to Vercel-prefixed KV REST names from the environment", () => {
    const previous = {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      kvUrl: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
      kvToken: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
    };
    try {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL =
        "https://kv-example.upstash.io";
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN = "kv-token";
      const credentials = readUpstashRestCredentials();
      assert.deepEqual(credentials, {
        url: "https://kv-example.upstash.io",
        token: "kv-token",
        source: "UPSTASH_REDIS_REST_KV_REST_API_*",
      });
    } finally {
      restoreEnv("UPSTASH_REDIS_REST_URL", previous.url);
      restoreEnv("UPSTASH_REDIS_REST_TOKEN", previous.token);
      restoreEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", previous.kvUrl);
      restoreEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", previous.kvToken);
    }
  });

  it("selects upstash store mode only for the literal value", () => {
    assert.equal(
      resolveAppointmentRateLimitStoreMode("production", "upstash"),
      "upstash",
    );
    assert.equal(
      resolveAppointmentRateLimitStoreMode("production", "memory"),
      "misconfigured",
    );
    assert.equal(
      resolveAppointmentRateLimitStoreMode("production", undefined),
      "misconfigured",
    );
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
