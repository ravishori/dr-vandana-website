import { academicCurriculumDocuments } from "@/data/ai/knowledge/curriculum";
import { caseStudyKnowledgeDocuments } from "@/data/ai/knowledge/case-studies";
import { educationalKnowledgeDocuments } from "@/data/ai/knowledge/educational";
import { evidencePilotDocuments } from "@/data/ai/knowledge/evidence-pilot";
import { safetyKnowledgeDocuments } from "@/data/ai/knowledge/safety";
import { vandanaKnowledgeDocuments } from "@/data/ai/knowledge/vandana";
import type { KnowledgeDocument } from "@/types/ai";

export const allKnowledgeDocuments: readonly KnowledgeDocument[] = [
  ...vandanaKnowledgeDocuments,
  ...educationalKnowledgeDocuments,
  ...evidencePilotDocuments,
  ...caseStudyKnowledgeDocuments,
  ...safetyKnowledgeDocuments,
  ...academicCurriculumDocuments,
];
