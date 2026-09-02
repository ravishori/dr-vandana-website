import type { CurriculumReviewStatus } from "@/types/ai";

export type QASeverity = "HIGH" | "MEDIUM" | "LOW";

export type QAIssue = {
  document_id: string;
  semester?: string;
  course?: string;
  unit?: string;
  file: string;
  problem: string;
  severity: QASeverity;
  recommended_correction: string;
  status: CurriculumReviewStatus;
};

export type CourseInventoryEntry = {
  semester: string;
  course_code: string | null;
  course_title: string;
  course_type: string;
  credits: number | null;
  unit_count: number;
  inventory_status: "IMPORTED" | "EXPECTED" | "MISSING" | "EXTRA" | "UNCERTAIN";
};

export type UnitInventoryEntry = {
  semester: string;
  course_title: string;
  course_code: string | null;
  expected_units: number | null;
  imported_units: number;
  missing_units: string[];
  extra_units: string[];
  uncertain_units: string[];
  status: "VERIFIED" | "UNVERIFIED" | "REVIEW_REQUIRED" | "UNKNOWN";
};

export type BibliographicIssue = {
  document_id: string;
  course: string;
  unit: string;
  reference_type: string;
  title: string;
  problem: string;
  severity: QASeverity;
  recommended_correction: string;
};

export type SourcePageEntry = {
  document_id: string;
  semester: string;
  course: string;
  unit: string;
  source_page: string | undefined;
  source_page_status: string;
  note: string;
};

export type ReviewManifestEntry = {
  document_id: string;
  semester: string;
  course: string;
  unit: string;
  issue: string;
  severity: QASeverity;
  status: "REVIEW_REQUIRED";
};

export type CurriculumQAReport = {
  generated_at: string;
  curriculum_version_id: string;
  document_count: number;
  issue_count: number;
  issues_by_severity: Record<QASeverity, number>;
  issues: QAIssue[];
};

export type GovernanceStatusSummary = {
  curriculum_documents_total: number;
  approval_state_counts: Record<string, number>;
  indexable_curriculum_documents: number;
  legacy_published_documents: number;
  governance_note: string;
};

export type ParsedExpectedCourse = {
  semester: string;
  course_code: string | null;
  course_title: string;
  course_type: string;
  credits: number | null;
  units: Array<{ unit_number: string; unit_title: string }>;
};
