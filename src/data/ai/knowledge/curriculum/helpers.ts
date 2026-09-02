import {
  CURRICULUM_ACADEMIC_YEAR,
  CURRICULUM_INSTITUTION,
  CURRICULUM_PROGRAM,
  CURRICULUM_PUBLICATION_DATE,
  CURRICULUM_SOURCE,
  CURRICULUM_SOURCE_DOCUMENT,
  CURRICULUM_SOURCE_URL,
  CURRICULUM_VERSION,
  CURRICULUM_VERSION_ID,
} from "@/data/ai/knowledge/curriculum/constants";
import { createKnowledgeDocument } from "@/data/ai/knowledge/helpers";
import type {
  AcademicBibliographicReference,
  AcademicContentType,
  SourcePageStatus,
  KnowledgeDocument,
} from "@/types/ai";

export type AcademicCurriculumDraft = {
  id: string;
  semester: string;
  course_code?: string;
  course_title: string;
  course_type: string;
  credits?: number;
  unit_number: string;
  unit_title: string;
  content_type: AcademicContentType;
  source_page?: string;
  source_page_status?: SourcePageStatus;
  course_objectives?: readonly string[];
  course_outcomes?: readonly string[];
  content: string;
  study_books?: readonly AcademicBibliographicReference[];
  reference_books?: readonly AcademicBibliographicReference[];
  keywords?: readonly string[];
  synonyms?: readonly string[];
};

export function createAcademicCurriculumDocument(
  draft: AcademicCurriculumDraft,
): KnowledgeDocument {
  const topic = [
    "mumbai-university-curriculum",
    `semester-${draft.semester.toLowerCase()}`,
    slugify(draft.course_title),
    `unit-${draft.unit_number}`,
  ].join("-");

  return createKnowledgeDocument({
    id: draft.id,
    title: `${draft.course_title} — Unit ${draft.unit_number}: ${draft.unit_title}`,
    category: "Academic Curriculum",
    topic,
    content: draft.content,
    source: CURRICULUM_SOURCE,
    author: CURRICULUM_INSTITUTION,
    publication: CURRICULUM_SOURCE_DOCUMENT,
    date: CURRICULUM_PUBLICATION_DATE,
    evidence_level: "academic-curriculum",
    corpus: "ACADEMIC_CURRICULUM_REFERENCE",
    source_tier: "TIER_3_ACADEMIC",
    knowledge_scope: "GENERAL_PSYCHOLOGY",
    source_metadata: {
      source_id: "internal-curriculum-reference",
      source_name: CURRICULUM_SOURCE,
      source_type: "internal-coverage-reference",
      organization: CURRICULUM_INSTITUTION,
      copyright_status: "METADATA_ONLY",
      verification_status: "UNVERIFIED",
      notes:
        "Internal psychology knowledge coverage reference only. Not for public retrieval or Dr. Vandana practice inference.",
    },
    approved: false,
    approval_state: "REVIEW",
    keywords: draft.keywords ?? buildCurriculumKeywords(draft),
    synonyms: draft.synonyms,
    institution: CURRICULUM_INSTITUTION,
    program: CURRICULUM_PROGRAM,
    curriculum_version: CURRICULUM_VERSION,
    curriculum_version_id: CURRICULUM_VERSION_ID,
    academic_year: CURRICULUM_ACADEMIC_YEAR,
    semester: draft.semester,
    course_code: draft.course_code,
    course_title: draft.course_title,
    course_type: draft.course_type,
    credits: draft.credits,
    unit_number: draft.unit_number,
    unit_title: draft.unit_title,
    course_objectives: draft.course_objectives,
    course_outcomes: draft.course_outcomes,
    content_type: draft.content_type,
    source_page: draft.source_page,
    source_page_status: draft.source_page_status ?? "UNVERIFIED",
    source_document: CURRICULUM_SOURCE_DOCUMENT,
    source_url: CURRICULUM_SOURCE_URL,
    study_books: draft.study_books,
    reference_books: draft.reference_books,
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildCurriculumKeywords(draft: AcademicCurriculumDraft): string[] {
  const keywords = new Set<string>([
    "University of Mumbai",
    "M.A. Psychology",
    "NEP 2020",
    `Semester ${draft.semester}`,
    draft.course_title,
    draft.unit_title,
  ]);
  if (draft.course_code) {
    keywords.add(draft.course_code);
  }
  return [...keywords];
}
