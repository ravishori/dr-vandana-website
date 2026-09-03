import type { KnowledgeApprovalState, KnowledgeDocument } from "@/types/ai";
import { isProductionIndexable } from "@/lib/ai/knowledge/library/semantics";

const TRANSITIONS: Record<KnowledgeApprovalState, readonly KnowledgeApprovalState[]> =
  {
    DRAFT: ["REVIEW", "ARCHIVED"],
    REVIEW: ["APPROVED", "DRAFT", "ARCHIVED"],
    APPROVED: ["PUBLISHED", "REVIEW", "ARCHIVED"],
    PUBLISHED: ["ARCHIVED", "REVIEW"],
    ARCHIVED: ["DRAFT"],
  };

export function canTransitionApproval(
  from: KnowledgeApprovalState,
  to: KnowledgeApprovalState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isRagIndexable(document: KnowledgeDocument): boolean {
  return isProductionIndexable(document);
}

/**
 * Content workflow for a future authenticated admin UI.
 * This module does not expose HTTP endpoints. Do not add public write APIs
 * until authentication and authorization exist.
 */
export function transitionApproval(
  document: KnowledgeDocument,
  next: KnowledgeApprovalState,
  now = new Date().toISOString(),
): KnowledgeDocument {
  if (!canTransitionApproval(document.approval_state, next)) {
    throw new Error("INVALID_APPROVAL_TRANSITION");
  }
  return {
    ...document,
    approval_state: next,
    approved: next === "APPROVED" || next === "PUBLISHED",
    updated_at: now,
    version: document.version + 1,
  };
}
