import { caseStudyKnowledgeDocuments } from "@/data/ai/knowledge/case-studies";
import { educationalKnowledgeDocuments } from "@/data/ai/knowledge/educational";
import { safetyKnowledgeDocuments } from "@/data/ai/knowledge/safety";
import { vandanaKnowledgeDocuments } from "@/data/ai/knowledge/vandana";
import type { KnowledgeDocument } from "@/types/ai";

export const allKnowledgeDocuments: readonly KnowledgeDocument[] = [
  ...vandanaKnowledgeDocuments,
  ...educationalKnowledgeDocuments,
  ...caseStudyKnowledgeDocuments,
  ...safetyKnowledgeDocuments,
];
