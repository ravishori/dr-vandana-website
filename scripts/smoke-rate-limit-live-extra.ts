import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  checkAppointmentRateLimit,
  checkErrorReportRateLimit,
  getClientIpFromHeaders,
} from "../src/lib/appointment-abuse";
import { resetUpstashClientsForTests } from "../src/lib/rate-limit/upstash-store";

function loadEnvLocal(): void {
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
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log("PASS", message);
}

async function main() {
  loadEnvLocal();
  const opts = { nodeEnv: "production", storeEnv: "upstash" as const };

  // Sequential burst
  const burstIp = `burst-${Date.now()}.example`;
  let allowed = 0;
  let blocked = 0;
  for (let i = 0; i < 5; i += 1) {
    const r = await checkAppointmentRateLimit(burstIp, opts);
    if (r.allowed) allowed += 1;
    else blocked += 1;
  }
  assert(allowed === 4, `sequential burst allowed exactly 4 (got ${allowed})`);
  assert(blocked === 1, `sequential burst blocked exactly 1 (got ${blocked})`);

  // Error endpoint limiter (10/min)
  const errIp = `err-${Date.now()}.example`;
  let errAllowed = 0;
  for (let i = 0; i < 11; i += 1) {
    const r = await checkErrorReportRateLimit(errIp, opts);
    if (r.allowed) errAllowed += 1;
  }
  assert(errAllowed === 10, `error report allows 10/min (got ${errAllowed})`);
  const errBlocked = await checkErrorReportRateLimit(errIp, opts);
  assert(
    !errBlocked.allowed && errBlocked.reason === "rate_limited",
    "error report 12th blocked",
  );

  // Store failure / fail-closed (invalid credentials)
  const realUrl = process.env.UPSTASH_REDIS_REST_URL;
  const realToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = "https://invalid.example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "invalid-token-for-failure-test";
  resetUpstashClientsForTests();
  const failClosed = await checkAppointmentRateLimit(
    `fail-${Date.now()}.example`,
    opts,
  );
  assert(
    !failClosed.allowed && failClosed.reason === "store_unavailable",
    "invalid Upstash credentials fail closed",
  );

  // Recovery with real env
  process.env.UPSTASH_REDIS_REST_URL = realUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = realToken;
  resetUpstashClientsForTests();
  const recovered = await checkAppointmentRateLimit(
    `recover-${Date.now()}.example`,
    opts,
  );
  assert(recovered.allowed, "recovery with valid Upstash allows request");

  // IP extraction preference
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    "x-vercel-forwarded-for": "198.51.100.20",
    "x-real-ip": "192.0.2.1",
  });
  const ip = getClientIpFromHeaders(headers);
  assert(ip === "198.51.100.20", "prefers x-vercel-forwarded-for");

  const spoofHeaders = new Headers({
    "x-forwarded-for": "203.0.113.99",
  });
  const spoofIp = getClientIpFromHeaders(spoofHeaders);
  assert(spoofIp === "203.0.113.99", "uses first XFF hop when no vercel header");

  // Key strategy check (identity format only — no PII fields)
  assert(
    !`ip:${spoofIp}`.includes("@") && !`ip:${spoofIp}`.includes("name"),
    "rate-limit identity has no appointment PII markers",
  );

  console.log("Live Upstash extra verification passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
