import {
  impliesDrVandanaPractice,
  isDrVandanaPracticeKnowledge,
  isGeneralPsychologyKnowledge,
} from "@/lib/ai/knowledge/library/semantics";
import type { KnowledgeDocument } from "@/types/ai";

export type PracticeBoundaryDecision = {
  mayAnswerAsDrVandanaPractice: boolean;
  mayAnswerAsGeneralEducation: boolean;
  reason: string;
};

/**
 * Determines whether retrieved documents may support a Dr. Vandana-specific
 * practice answer versus general psychology education only.
 */
export function evaluatePracticeBoundary(
  documents: readonly KnowledgeDocument[],
  asksAboutDrVandanaPractice: boolean,
): PracticeBoundaryDecision {
  const practiceDocs = documents.filter(isDrVandanaPracticeKnowledge);
  const generalDocs = documents.filter(isGeneralPsychologyKnowledge);

  if (asksAboutDrVandanaPractice) {
    if (practiceDocs.length > 0) {
      return {
        mayAnswerAsDrVandanaPractice: true,
        mayAnswerAsGeneralEducation: false,
        reason: "Approved Dr. Vandana practice knowledge is available.",
      };
    }
    return {
      mayAnswerAsDrVandanaPractice: false,
      mayAnswerAsGeneralEducation: false,
      reason:
        "No approved Dr. Vandana practice knowledge supports this question. General psychology sources must not be inferred as her methods.",
    };
  }

  if (generalDocs.length > 0) {
    return {
      mayAnswerAsDrVandanaPractice: false,
      mayAnswerAsGeneralEducation: true,
      reason: "General psychology education may be answered from non-practice sources.",
    };
  }

  return {
    mayAnswerAsDrVandanaPractice: false,
    mayAnswerAsGeneralEducation: false,
    reason: "No suitable knowledge documents were retrieved.",
  };
}

export function therapyEducationDoesNotImplyPractice(
  therapyTopicDocuments: readonly KnowledgeDocument[],
): boolean {
  return therapyTopicDocuments.every((document) => !impliesDrVandanaPractice(document));
}
