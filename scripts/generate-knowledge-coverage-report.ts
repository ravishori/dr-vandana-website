#!/usr/bin/env tsx
/**
 * Generate machine-readable knowledge coverage gap report from repository data.
 * Run: npm run knowledge:coverage-report
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildKnowledgeGapReport } from "@/lib/ai/knowledge/library/gap-report";

const report = buildKnowledgeGapReport();
const outputPath = resolve(process.cwd(), "docs/ai/knowledge-coverage-report.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);
