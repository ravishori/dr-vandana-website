import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = process.cwd();

function walk(dir: string): string[] {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full).flatMap((name) => {
    const p = join(dir, name);
    return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
  });
}

const articleFiles = [
  ...walk("src/lib/articles"),
  ...walk("src/data/articles"),
  ...walk("src/app/articles"),
  "src/config/articles.ts",
  "src/types/articles.ts",
].filter((f) => !f.endsWith(".test.ts"));

const FORBIDDEN: [string, RegExp][] = [
  ["communications", /communications?/i],
  ["doctor portal or login", /doctor/i],
  ["doctor env variables", /DOCTOR_(LOGIN|PASSWORD|SESSION)/],
  ["communications store", /COMMUNICATIONS_STORE/],
  ["Upstash / Redis", /upstash|redis/i],
  ["article store variable", /ARTICLES_STORE|ARTICLES_DATABASE_PATH/],
  ["environment access", /process\.env/],
  ["cookies or sessions", /cookies\(|next\/headers|session/i],
  ["server actions", /["']use server["']/],
  ["network or browser storage", /\bfetch\(|localStorage|sessionStorage|XMLHttpRequest/],
  ["email sending", /nodemailer|sendMail|smtp/i],
  ["database clients", /drizzle|postgres|prisma|mongoose/i],
];

describe("articles module boundaries", () => {
  it("has article source files to check", () => {
    assert.ok(articleFiles.length >= 8, articleFiles.join(", "));
  });
  for (const [label, pattern] of FORBIDDEN) {
    it(`articles files contain no ${label}`, () => {
      const hits = articleFiles.filter((f) => pattern.test(readFileSync(join(ROOT, f), "utf8")));
      assert.deepEqual(hits, []);
    });
  }
  it("introduces no competing public paths, middleware or auth routes", () => {
    for (const p of ["src/middleware.ts", "src/app/doctor", "src/app/blog", "src/app/admin", "src/lib/communications", "src/lib/doctor", "src/config/doctor-portal.ts"]) {
      assert.equal(existsSync(join(ROOT, p)), false, p);
    }
  });
  it("has no article write endpoint (no route handlers under /articles)", () => {
    assert.deepEqual(articleFiles.filter((f) => /route\.ts$/.test(f)), []);
  });
});
