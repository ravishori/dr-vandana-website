/**
 * Run `next build` with NODE_ENV=production even when the parent shell
 * has development/test overrides (e.g. after operator DB scripts).
 * Next.js warns that a non-standard NODE_ENV breaks prerender/export.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const env = { ...process.env, NODE_ENV: "production" };

const result = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
  cwd: dirname(fileURLToPath(import.meta.url)) + "/..",
});

process.exit(result.status ?? 1);
