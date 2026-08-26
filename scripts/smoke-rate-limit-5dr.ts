import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  hasUpstashCredentials,
  resolveAppointmentRateLimitStoreMode,
} from "../src/config/appointment-submission";
import {
  checkAppointmentRateLimit,
  checkErrorReportRateLimit,
  resetAppointmentRateLimitMemoryForTests,
} from "../src/lib/appointment-abuse";

function loadEnvLocal(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // optional
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log("PASS", message);
}

async function testMemoryBurst() {
  resetAppointmentRateLimitMemoryForTests();
  const ip = "198.51.100.20";
  const opts = { nodeEnv: "development", storeEnv: undefined as string | undefined };

  for (let i = 1; i <= 4; i += 1) {
    const result = await checkAppointmentRateLimit(ip, opts);
    assert(result.allowed, `memory burst request ${i} allowed`);
  }
  const blocked = await checkAppointmentRateLimit(ip, opts);
  assert(
    !blocked.allowed && blocked.reason === "rate_limited",
    "memory burst 5 blocked",
  );
}

async function testProductionFailClosed() {
  assert(
    resolveAppointmentRateLimitStoreMode("production", undefined) ===
      "misconfigured",
    "production unset store → misconfigured",
  );
  assert(
    resolveAppointmentRateLimitStoreMode("production", "memory") ===
      "misconfigured",
    "production memory store → misconfigured",
  );
  assert(
    resolveAppointmentRateLimitStoreMode("production", "upstash") === "upstash",
    "production upstash store → upstash",
  );

  const denied = await checkAppointmentRateLimit("203.0.113.8", {
    nodeEnv: "production",
    storeEnv: undefined,
    upstashUrl: "",
    upstashToken: "",
  });
  assert(
    !denied.allowed && denied.reason === "misconfigured",
    "production without shared store DENIES (no silent allow)",
  );

  const errorDenied = await checkErrorReportRateLimit("203.0.113.8", {
    nodeEnv: "production",
    storeEnv: undefined,
  });
  assert(
    !errorDenied.allowed && errorDenied.reason === "misconfigured",
    "error endpoint also fail-closed in production without store",
  );

  const memoryRejected = await checkAppointmentRateLimit("203.0.113.9", {
    nodeEnv: "production",
    storeEnv: "memory",
  });
  assert(
    !memoryRejected.allowed && memoryRejected.reason === "misconfigured",
    "production memory mode rejected (no unsafe fallback)",
  );
}

async function testUpstashIfConfigured() {
  loadEnvLocal();
  if (
    process.env.APPOINTMENT_RATE_LIMIT_STORE !== "upstash" ||
    !hasUpstashCredentials()
  ) {
    console.log(
      "SKIP upstash live/multi-instance tests — configure UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, APPOINTMENT_RATE_LIMIT_STORE=upstash",
    );
    return false;
  }

  const opts = {
    nodeEnv: "production",
    storeEnv: "upstash",
  };

  const ip = `test-${Date.now()}.example`;
  const results = await Promise.all(
    Array.from({ length: 5 }, () => checkAppointmentRateLimit(ip, opts)),
  );
  const allowed = results.filter((r) => r.allowed).length;
  const blocked = results.filter((r) => !r.allowed).length;
  assert(allowed <= 4, `upstash concurrent allowed <= 4 (got ${allowed})`);
  assert(blocked >= 1, `upstash concurrent blocked >= 1 (got ${blocked})`);

  const ip2 = `multi-${Date.now()}.example`;
  let multiAllowed = 0;
  for (let i = 0; i < 5; i += 1) {
    const r = await checkAppointmentRateLimit(ip2, opts);
    if (r.allowed) multiAllowed += 1;
  }
  assert(
    multiAllowed === 4,
    `shared multi-call burst allows exactly 4 (got ${multiAllowed})`,
  );
  return true;
}

async function main() {
  await testMemoryBurst();
  await testProductionFailClosed();
  const upstashLive = await testUpstashIfConfigured();
  console.log(
    upstashLive
      ? "All 5D-R rate-limit checks passed (including Upstash)"
      : "5D-R code checks passed; Upstash live verification pending credentials",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
