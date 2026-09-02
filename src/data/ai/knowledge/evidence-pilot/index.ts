export { evidencePilotDocuments } from "@/data/ai/knowledge/evidence-pilot/sources";
export { phase4EvidenceDocuments } from "@/data/ai/knowledge/evidence-pilot/phase4-sources";
export {
  EVIDENCE_PILOT_REVIEW_NOTES,
  EVIDENCE_PHASE4_REVIEW_NOTES,
  ALL_EVIDENCE_REVIEW_NOTES,
  type EvidencePilotReviewNote,
} from "@/data/ai/knowledge/evidence-pilot/review-notes";

import { evidencePilotDocuments } from "@/data/ai/knowledge/evidence-pilot/sources";
import { phase4EvidenceDocuments } from "@/data/ai/knowledge/evidence-pilot/phase4-sources";

/** All controlled external psychology evidence documents (Phase 3 + Phase 4). */
export const allEvidenceDocuments = [
  ...evidencePilotDocuments,
  ...phase4EvidenceDocuments,
] as const;
