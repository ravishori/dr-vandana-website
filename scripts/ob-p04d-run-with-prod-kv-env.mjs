/**
 * Loads Production ceremony secrets into a child process env without printing values.
 */
import { spawnSync } from "node:child_process";

const SECRET_NAMES = [
  ["DATABASE_URL", "production-app-database-url"],
  ["AUTH_SESSION_SECRET", "production-app-auth-session-secret"],
];

function loadSecret(kvName) {
  const result = spawnSync(
    "az",
    [
      "keyvault",
      "secret",
      "show",
      "--vault-name",
      "kv-dr-vandana-prod",
      "--name",
      kvName,
      "--query",
      "value",
      "-o",
      "tsv",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout?.trim()) {
    console.error(`Failed to load Key Vault secret name ${kvName}.`);
    process.exit(1);
  }
  return result.stdout.trim();
}

const childEnv = {
  ...process.env,
  NODE_ENV: "development",
  SYNTHETIC_PRODUCTION_E2E_ENABLED: "true",
  O_B_P04D_CEREMONY_PROFILE: "production-e2e-v1",
  PATIENT_REGISTRATION_ENABLED: "false",
  TWILIO_WHATSAPP_ENABLED: "false",
};

for (const [envName, kvName] of SECRET_NAMES) {
  childEnv[envName] = loadSecret(kvName);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/ob-p04d-run-with-prod-kv-env.mjs <command> [...args]");
  process.exit(1);
}

const result = spawnSync(command, args, {
  stdio: "inherit",
  env: childEnv,
  shell: process.platform === "win32",
});

process.exit(result.status === null ? 1 : result.status);
