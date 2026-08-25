/**
 * Discover and run unit tests without relying on shell globstar.
 * GitHub Actions bash does not expand recursive globs, so a quoted
 * recursive test pattern becomes a literal path and tsx exits 1.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path, acc);
    } else if (name.endsWith(".test.ts")) {
      acc.push(path);
    }
  }
  return acc;
}

const files = walk(join(process.cwd(), "src/lib")).sort();
if (files.length === 0) {
  console.error("No unit test files found under src/lib");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  {
    stdio: "inherit",
    env: process.env,
  },
);

process.exit(result.status === null ? 1 : result.status);
