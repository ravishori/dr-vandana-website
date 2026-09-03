import { readFileSync } from "node:fs";
import { join } from "node:path";

import { academicCurriculumDocuments } from "@/data/ai/knowledge/curriculum";
import {
  CURRICULUM_SOURCE,
  CURRICULUM_VERSION_ID,
} from "@/data/ai/knowledge/curriculum/constants";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import type { KnowledgeDocument } from "@/types/ai";

import type {
  BibliographicIssue,
  CourseInventoryEntry,
  CurriculumQAReport,
  GovernanceStatusSummary,
  ParsedExpectedCourse,
  QAIssue,
  QASeverity,
  ReviewManifestEntry,
  SourcePageEntry,
  UnitInventoryEntry,
} from "./types";

const SEMESTER_FILES: Record<string, string> = {
  I: "semester-i.ts",
  II: "semester-ii.ts",
  III: "semester-iii.ts",
  IV: "semester-iv.ts",
};

const EXPECTED_COURSE_CODES = new Set([
  "501 11", "502 11", "503 11", "504 11", "505 11", "505 12", "505 13", "505 14", "506 11",
  "511 11", "512 11", "513 11", "514 11", "515 11", "515 12", "515 13", "515 14", "516 11",
]);

const SPECIAL_COURSE_PATTERNS = [
  /Industrial Psychology|PRACTICUM IN INDUSTRIAL/i,
  /Data Analytics and Machine Learning/i,
  /CBT and REBT/i,
  /Research Project in Psychology I/i,
  /Research Project in Psychology II/i,
  /On the Job training/i,
];

const ARTIFACT_PATTERNS: Array<{
  pattern: RegExp;
  problem: string;
  severity: QASeverity;
  correction: string;
}> = [
  { pattern: /\bb\s+\./, problem: "Broken bullet marker (PDF artifact: 'b .')", severity: "MEDIUM", correction: "Review against source PDF and fix bullet formatting manually" },
  { pattern: /[a-z]and[A-Z]/, problem: "Split word from PDF line join (missing space)", severity: "MEDIUM", correction: "Join words per source PDF; do not guess missing letters" },
  { pattern: /[\uFFFD\uFFFE\uFFFF]/, problem: "Replacement or invalid Unicode character", severity: "HIGH", correction: "Restore text from source PDF for garbled segment" },
  { pattern: /\?\?\?+/, problem: "Placeholder or unreadable PDF segment", severity: "HIGH", correction: "Restore from source PDF" },
  { pattern: /\b([A-Za-z]+)\s+\1\b/i, problem: "Duplicated consecutive word", severity: "LOW", correction: "Remove duplicate if confirmed against source PDF" },
  { pattern: /[A-Za-z] [A-Za-z] [A-Za-z] [A-Za-z]/, problem: "Spaced-out letters (PDF artifact)", severity: "MEDIUM", correction: "Collapse spaced letters per source PDF" },
];

const FULL_TEXT_MARKERS = ["chapter 1", "chapter 2", "all rights reserved", "printed in"];
const COURSE_CODE_PATTERN = /^\d{3}\s\d{2}$/;
const SOURCE_PAGE_PATTERN = /^(\d+)(?:–(\d+))?$/;

function semesterFile(doc: KnowledgeDocument): string {
  const sem = doc.semester ?? "?";
  return `src/data/ai/knowledge/curriculum/${SEMESTER_FILES[sem] ?? "unknown.ts"}`;
}

function unitKey(doc: KnowledgeDocument): string {
  return `${doc.semester}::${doc.course_code ?? "UNKNOWN"}::${doc.course_title ?? doc.title}::${doc.unit_number ?? "?"}`;
}

function loadExpectedFromParsedJson(): ParsedExpectedCourse[] {
  const path = join(process.cwd(), "docs/curriculum/parsed-curriculum.json");
  const raw = JSON.parse(readFileSync(path, "utf8")) as Array<{
    semester: string;
    course_code: string | null;
    course_title: string;
    course_type: string;
    credits: number | null;
    units: Array<{ unit_number: string; unit_title: string }>;
  }>;
  return raw.map((course) => ({
    semester: course.semester,
    course_code: course.course_code ?? null,
    course_title: course.course_title,
    course_type: course.course_type,
    credits: course.credits ?? null,
    units: course.units.map((unit) => ({ unit_number: unit.unit_number, unit_title: unit.unit_title })),
  }));
}

function pushIssue(issues: QAIssue[], doc: KnowledgeDocument, problem: string, severity: QASeverity, recommended_correction: string): void {
  issues.push({
    document_id: doc.id,
    semester: doc.semester,
    course: doc.course_title,
    unit: doc.unit_number,
    file: semesterFile(doc),
    problem,
    severity,
    recommended_correction,
    status: "REVIEW_REQUIRED",
  });
}

export function auditCurriculumDocument(doc: KnowledgeDocument): QAIssue[] {
  const issues: QAIssue[] = [];
  if (doc.corpus !== "ACADEMIC_CURRICULUM_REFERENCE") return issues;

  if (!doc.institution) pushIssue(issues, doc, "Missing institution", "HIGH", "Set institution from constants");
  if (!doc.program) pushIssue(issues, doc, "Missing program", "HIGH", "Set program from constants");
  if (!doc.semester) pushIssue(issues, doc, "Missing semester", "HIGH", "Set semester from source PDF");
  if (!doc.course_title) pushIssue(issues, doc, "Missing course title", "HIGH", "Set course_title from source PDF");
  if (!doc.unit_number) pushIssue(issues, doc, "Missing unit number", "HIGH", "Set unit_number from source PDF");
  if (!doc.unit_title) pushIssue(issues, doc, "Missing unit title", "HIGH", "Set unit_title from source PDF");
  if (!doc.source_document) pushIssue(issues, doc, "Missing source_document", "HIGH", "Set source_document constant");

  if (!doc.source_page) {
    pushIssue(issues, doc, "Missing source_page", "MEDIUM", "Map approximate page range from source PDF or mark UNKNOWN");
  } else if (!SOURCE_PAGE_PATTERN.test(doc.source_page)) {
    pushIssue(issues, doc, `Malformed source_page: ${doc.source_page}`, "MEDIUM", "Use format like '16' or '16–17' from source PDF");
  }

  if (doc.source_page_status !== "UNVERIFIED" && doc.source_page_status !== "VERIFIED") {
    pushIssue(issues, doc, "Missing or invalid source_page_status", "MEDIUM", "Set source_page_status to UNVERIFIED until manually verified");
  } else if (doc.source_page_status === "UNVERIFIED" && doc.source_page) {
    pushIssue(issues, doc, "Source page mapping is UNVERIFIED (approximate)", "LOW", "Verify page numbers against source PDF before marking VERIFIED");
  }

  if (doc.course_code && !COURSE_CODE_PATTERN.test(doc.course_code) && EXPECTED_COURSE_CODES.has(doc.course_code)) {
    pushIssue(issues, doc, `Malformed course code: ${doc.course_code}`, "MEDIUM", "Use official format like '501 11'");
  }

  if (!doc.content?.trim()) {
    pushIssue(issues, doc, "Empty content", "HIGH", "Import unit content from source PDF");
  } else if (doc.content.trim().length < 40) {
    pushIssue(issues, doc, "Suspiciously short content", "MEDIUM", "Verify unit subtopics against source PDF");
  }

  if (doc.source !== CURRICULUM_SOURCE) {
    pushIssue(issues, doc, `Incorrect source attribution: ${doc.source}`, "HIGH", `Must be: ${CURRICULUM_SOURCE}`);
  }

  if (/dr\.?\s*vandana/i.test(doc.author) || /dr\.?\s*vandana/i.test(doc.content)) {
    pushIssue(issues, doc, "Curriculum attributed to Dr. Vandana", "HIGH", "Author must reference University of Mumbai only");
  }

  for (const marker of FULL_TEXT_MARKERS) {
    if (doc.content.toLowerCase().includes(marker)) {
      pushIssue(issues, doc, `Possible full textbook text marker: ${marker}`, "HIGH", "Keep bibliographic metadata only");
    }
  }

  for (const { pattern, problem, severity, correction } of ARTIFACT_PATTERNS) {
    if (pattern.test(doc.content) || pattern.test(doc.unit_title ?? "")) {
      pushIssue(issues, doc, problem, severity, correction);
    }
  }

  for (const book of [...(doc.study_books ?? []), ...(doc.reference_books ?? [])]) {
    if (book.title.length < 15) {
      pushIssue(issues, doc, `Incomplete bibliographic title (${book.reference_type}): ${book.title}`, "MEDIUM", "Join lines from source PDF");
    }
    if (book.title.endsWith(" of") || book.title.endsWith(" and") || book.title.endsWith(",")) {
      pushIssue(issues, doc, `Truncated bibliographic title (${book.reference_type})`, "MEDIUM", "Complete title from source PDF");
    }
  }

  if (doc.approved || doc.approval_state === "PUBLISHED" || doc.approval_state === "APPROVED") {
    pushIssue(issues, doc, `Curriculum marked ${doc.approval_state} before QA completion`, "HIGH", "Set approval_state to REVIEW and approved to false");
  }

  return issues;
}

export function auditAllCurriculumDocuments(): CurriculumQAReport {
  const issues = academicCurriculumDocuments.flatMap((doc) => auditCurriculumDocument(doc));
  const seen = new Map<string, string>();
  for (const doc of academicCurriculumDocuments) {
    const key = unitKey(doc);
    const prior = seen.get(key);
    if (prior) {
      issues.push({
        document_id: doc.id,
        semester: doc.semester,
        course: doc.course_title,
        unit: doc.unit_number,
        file: semesterFile(doc),
        problem: `Duplicate course/unit combination (also ${prior})`,
        severity: "HIGH",
        recommended_correction: "Remove or merge duplicate unit documents",
        status: "REVIEW_REQUIRED",
      });
    } else {
      seen.set(key, doc.id);
    }
  }

  return {
    generated_at: new Date().toISOString(),
    curriculum_version_id: CURRICULUM_VERSION_ID,
    document_count: academicCurriculumDocuments.length,
    issue_count: issues.length,
    issues_by_severity: {
      HIGH: issues.filter((i) => i.severity === "HIGH").length,
      MEDIUM: issues.filter((i) => i.severity === "MEDIUM").length,
      LOW: issues.filter((i) => i.severity === "LOW").length,
    },
    issues,
  };
}

type GroupedCourse = {
  semester: string;
  course_code: string | null;
  course_title: string;
  course_type: string;
  credits: number | null;
  units: KnowledgeDocument[];
};

function groupCourses(docs: readonly KnowledgeDocument[]): Map<string, GroupedCourse> {
  const map = new Map<string, GroupedCourse>();
  for (const doc of docs) {
    const key = `${doc.semester}::${doc.course_title}`;
    const existing = map.get(key);
    if (existing) existing.units.push(doc);
    else {
      map.set(key, {
        semester: doc.semester ?? "?",
        course_code: doc.course_code ?? null,
        course_title: doc.course_title ?? doc.title,
        course_type: doc.course_type ?? "UNKNOWN",
        credits: doc.credits ?? null,
        units: [doc],
      });
    }
  }
  return map;
}

export function buildCourseInventory(): CourseInventoryEntry[] {
  const expected = loadExpectedFromParsedJson();
  const importedByCourse = groupCourses(academicCurriculumDocuments);
  const entries: CourseInventoryEntry[] = [];

  for (const course of expected) {
    const key = `${course.semester}::${course.course_title}`;
    const imported = importedByCourse.get(key);
    let status: CourseInventoryEntry["inventory_status"] = imported ? "IMPORTED" : "MISSING";
    if (imported && SPECIAL_COURSE_PATTERNS.some((p) => p.test(course.course_title))) status = "UNCERTAIN";
    if (imported && (course.semester === "III" || course.semester === "IV") && !course.course_code) status = "UNCERTAIN";
    entries.push({
      semester: course.semester,
      course_code: course.course_code,
      course_title: course.course_title,
      course_type: course.course_type,
      credits: course.credits,
      unit_count: imported?.units.length ?? 0,
      inventory_status: status,
    });
    importedByCourse.delete(key);
  }

  for (const imported of importedByCourse.values()) {
    entries.push({
      semester: imported.semester,
      course_code: imported.course_code,
      course_title: imported.course_title,
      course_type: imported.course_type,
      credits: imported.credits,
      unit_count: imported.units.length,
      inventory_status: "EXTRA",
    });
  }

  return entries.sort((a, b) => `${a.semester}${a.course_title}`.localeCompare(`${b.semester}${b.course_title}`));
}

export function buildUnitInventory(): UnitInventoryEntry[] {
  const expected = loadExpectedFromParsedJson();
  const importedGroups = groupCourses(academicCurriculumDocuments);
  return expected.map((exp) => {
    const imported = importedGroups.get(`${exp.semester}::${exp.course_title}`);
    const expectedNums = new Set(exp.units.map((u) => u.unit_number));
    const importedNums = new Set((imported?.units ?? []).map((d) => d.unit_number).filter(Boolean) as string[]);
    const missing = [...expectedNums].filter((n) => !importedNums.has(n));
    const extra = [...importedNums].filter((n) => !expectedNums.has(n));
    const isSpecial = SPECIAL_COURSE_PATTERNS.some((p) => p.test(exp.course_title));
    return {
      semester: exp.semester,
      course_title: exp.course_title,
      course_code: exp.course_code,
      expected_units: exp.units.length,
      imported_units: imported?.units.length ?? 0,
      missing_units: missing,
      extra_units: extra,
      uncertain_units: isSpecial ? [...missing, ...extra] : [],
      status: missing.length || extra.length || isSpecial ? "REVIEW_REQUIRED" : "UNVERIFIED",
    };
  });
}

export function buildBibliographicQAReport(issues: QAIssue[]): BibliographicIssue[] {
  return issues
    .filter((i) => i.problem.toLowerCase().includes("bibliographic"))
    .map((i) => ({
      document_id: i.document_id,
      course: i.course ?? "",
      unit: i.unit ?? "",
      reference_type: "UNKNOWN",
      title: "",
      problem: i.problem,
      severity: i.severity,
      recommended_correction: i.recommended_correction,
    }));
}

export function buildExtractionArtifactReport(issues: QAIssue[]): QAIssue[] {
  return issues.filter((i) =>
    /PDF artifact|Split word|Unicode|Placeholder|Spaced-out|Broken bullet/i.test(i.problem),
  );
}

export function buildSourcePageVerificationReport(): SourcePageEntry[] {
  return academicCurriculumDocuments.map((doc) => ({
    document_id: doc.id,
    semester: doc.semester ?? "",
    course: doc.course_title ?? "",
    unit: doc.unit_number ?? "",
    source_page: doc.source_page,
    source_page_status: doc.source_page_status ?? "UNKNOWN",
    note: doc.source_page_status === "VERIFIED"
      ? "Manually verified against source PDF"
      : "Approximate mapping from PDF extraction; not verified page-by-page",
  }));
}

export function buildReviewManifest(issues: QAIssue[]): ReviewManifestEntry[] {
  const byDoc = new Map<string, ReviewManifestEntry>();
  for (const issue of issues) {
    const existing = byDoc.get(issue.document_id);
    if (!existing || (issue.severity === "HIGH" && existing.severity !== "HIGH")) {
      byDoc.set(issue.document_id, {
        document_id: issue.document_id,
        semester: issue.semester ?? "",
        course: issue.course ?? "",
        unit: issue.unit ?? "",
        issue: issue.problem,
        severity: issue.severity,
        status: "REVIEW_REQUIRED",
      });
    }
  }
  for (const doc of academicCurriculumDocuments) {
    if (!byDoc.has(doc.id)) {
      byDoc.set(doc.id, {
        document_id: doc.id,
        semester: doc.semester ?? "",
        course: doc.course_title ?? "",
        unit: doc.unit_number ?? "",
        issue: "Pending human verification of UNVERIFIED content",
        severity: "LOW",
        status: "REVIEW_REQUIRED",
      });
    }
  }
  return [...byDoc.values()];
}

export function buildGovernanceStatusSummary(): GovernanceStatusSummary {
  const curriculum = academicCurriculumDocuments;
  const approval_state_counts: Record<string, number> = {};
  for (const doc of curriculum) {
    approval_state_counts[doc.approval_state] = (approval_state_counts[doc.approval_state] ?? 0) + 1;
  }
  const indexed = knowledgeRepository.list().filter((d) => d.corpus === "ACADEMIC_CURRICULUM_REFERENCE");
  const legacy = knowledgeRepository.list({ includeUnpublished: true }).filter((d) => d.corpus !== "ACADEMIC_CURRICULUM_REFERENCE" && d.approved);
  return {
    curriculum_documents_total: curriculum.length,
    approval_state_counts,
    indexable_curriculum_documents: indexed.length,
    legacy_published_documents: legacy.length,
    governance_note: "Curriculum documents remain in REVIEW and are excluded from ASK AI retrieval until explicitly approved after human QA.",
  };
}

export function detectKnownArtifactCases(): QAIssue[] {
  return academicCurriculumDocuments
    .filter((doc) => doc.id.includes("501-11-unit-1") || doc.id.includes("cbt-and-rebt"))
    .flatMap((doc) => auditCurriculumDocument(doc))
    .filter((i) => /artifact|Split word|Unicode/i.test(i.problem));
}
