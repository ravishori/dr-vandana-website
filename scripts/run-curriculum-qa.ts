#!/usr/bin/env npx tsx
/**
 * Phase 1.5 — Curriculum content QA report generator.
 * SOURCE PDF → extracted text → parsed JSON → generated TS (derived, not authoritative).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  auditAllCurriculumDocuments,
  buildBibliographicQAReport,
  buildCourseInventory,
  buildExtractionArtifactReport,
  buildGovernanceStatusSummary,
  buildReviewManifest,
  buildSourcePageVerificationReport,
  buildUnitInventory,
} from "@/data/ai/knowledge/curriculum/qa";

const OUT = join(process.cwd(), "docs/curriculum/qa");

function writeJson(name: string, data: unknown): void {
  writeFileSync(join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main(): void {
  mkdirSync(OUT, { recursive: true });

  const qaReport = auditAllCurriculumDocuments();
  const courseInventory = buildCourseInventory();
  const unitInventory = buildUnitInventory();
  const bibliographic = buildBibliographicQAReport(qaReport.issues);
  const artifacts = buildExtractionArtifactReport(qaReport.issues);
  const sourcePages = buildSourcePageVerificationReport();
  const manifest = buildReviewManifest(qaReport.issues);
  const governance = buildGovernanceStatusSummary();

  writeJson("curriculum-qa-report.json", qaReport);
  writeJson("course-inventory.json", courseInventory);
  writeJson("unit-inventory.json", unitInventory);
  writeJson("bibliographic-qa-report.json", bibliographic);
  writeJson("extraction-artifact-report.json", artifacts);
  writeJson("source-page-verification-report.json", sourcePages);
  writeJson("review-manifest.json", manifest);
  writeJson("governance-status-summary.json", governance);

  const summary = `# Curriculum QA Summary (Phase 1.5)

Generated: ${qaReport.generated_at}
Version: ${qaReport.curriculum_version_id}

## Governance
- Curriculum documents: ${governance.curriculum_documents_total}
- Indexable in ASK AI: ${governance.indexable_curriculum_documents}
- Legacy published docs: ${governance.legacy_published_documents}
- ${governance.governance_note}

## QA Issues
- Total: ${qaReport.issue_count}
- HIGH: ${qaReport.issues_by_severity.HIGH}
- MEDIUM: ${qaReport.issues_by_severity.MEDIUM}
- LOW: ${qaReport.issues_by_severity.LOW}

## Inventories
- Courses: ${courseInventory.length} (${courseInventory.filter((c) => c.inventory_status === "IMPORTED").length} imported)
- Review manifest entries: ${manifest.length}
- Extraction artifacts flagged: ${artifacts.length}
- Source pages UNVERIFIED: ${sourcePages.filter((s) => s.source_page_status === "UNVERIFIED").length}

## Pipeline (derived data)
SOURCE PDF (docs/curriculum/source-pdfs/)
→ extracted text (docs/curriculum/extracted/)
→ parsed JSON (docs/curriculum/parsed-curriculum.json)
→ generated TS (src/data/ai/knowledge/curriculum/semester-*.ts)

The generated TS files are **derived artifacts**. Source PDFs are authoritative.

## Status
Curriculum is **NOT fully verified**. All documents require human review before approval.
`;

  writeFileSync(join(OUT, "README.md"), summary, "utf8");

  console.log(JSON.stringify({
    out: OUT,
    issues: qaReport.issue_count,
    manifest: manifest.length,
    indexable: governance.indexable_curriculum_documents,
  }, null, 2));
}

main();
