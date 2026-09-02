import { semesterICurriculumDocuments } from "@/data/ai/knowledge/curriculum/semester-i";
import { semesterIICurriculumDocuments } from "@/data/ai/knowledge/curriculum/semester-ii";
import { semesterIIICurriculumDocuments } from "@/data/ai/knowledge/curriculum/semester-iii";
import { semesterIVCurriculumDocuments } from "@/data/ai/knowledge/curriculum/semester-iv";
import type { KnowledgeDocument } from "@/types/ai";

/** University of Mumbai M.A. Psychology (NEP 2020) academic curriculum corpus. */
export const academicCurriculumDocuments: readonly KnowledgeDocument[] = [
  ...semesterICurriculumDocuments,
  ...semesterIICurriculumDocuments,
  ...semesterIIICurriculumDocuments,
  ...semesterIVCurriculumDocuments,
];

export {
  semesterICurriculumDocuments,
  semesterIICurriculumDocuments,
  semesterIIICurriculumDocuments,
  semesterIVCurriculumDocuments,
};
