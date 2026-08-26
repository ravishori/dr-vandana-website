import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Multi-process Upstash shared-state verification.
 * Spawns two worker processes against the same Redis-backed limiter.
 * Never prints credentials.
 */

function loadEnvLocal(): Record<string, string> {
  const env: Record<string, string> = {};
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
    env[key] = value;
  }
  return env;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log("PASS", message);
}

function runWorker(
  label: string,
  ip: string,
  count: number,
  envFile: Record<string, string>,
): Promise<boolean[]> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        "./node_modules/tsx/dist/cli.mjs",
        "scripts/smoke-rate-limit-worker.ts",
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...envFile,
          TEST_IP: ip,
          TEST_COUNT: String(count),
          APPOINTMENT_RATE_LIMIT_STORE: "upstash",
        },
        shell: false,
      },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      reject(new Error(`${label} spawn failed: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `${label} worker failed (exit ${code}). stderr_len=${stderr.length}`,
          ),
        );
        return;
      }
      const parts = stdout.trim().split(",").filter(Boolean);
      resolvePromise(parts.map((part) => part === "1"));
    });
  });
}

async function main() {
  const envFile = loadEnvLocal();
  assert(
    envFile.APPOINTMENT_RATE_LIMIT_STORE === "upstash",
    "store mode is upstash",
  );
  assert(Boolean(envFile.UPSTASH_REDIS_REST_URL), "Upstash URL configured");
  assert(Boolean(envFile.UPSTASH_REDIS_REST_TOKEN), "Upstash token configured");

  const sharedIp = `multi-proc-${Date.now()}.example`;
  const [a, b] = await Promise.all([
    runWorker("A", sharedIp, 3, envFile),
    runWorker("B", sharedIp, 3, envFile),
  ]);

  const allowedA = a.filter(Boolean).length;
  const allowedB = b.filter(Boolean).length;
  const totalAllowed = allowedA + allowedB;

  console.log(
    `multi-instance allowed: A=${allowedA} B=${allowedB} total=${totalAllowed}`,
  );

  assert(totalAllowed <= 4, "shared Upstash burst total allowed <= 4");
  assert(totalAllowed >= 3, "shared Upstash allowed some requests (>=3)");
  assert(
    !(allowedA === 3 && allowedB === 3),
    "does not allow 3+3 independent per-process counters",
  );

  console.log("Multi-instance Upstash verification passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
