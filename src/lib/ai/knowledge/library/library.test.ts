import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import { academicCurriculumDocuments } from "@/data/ai/knowledge/curriculum";
import { createKnowledgeDocument } from "@/data/ai/knowledge/helpers";
import {
  buildKnowledgeCoverageMap,
  countDocumentsByKnowledgeScope,
  countDocumentsBySourceTier,
  evaluatePracticeBoundary,
  evidenceLevelDistinctFromSourceTier,
  formatPublicSourceAttribution,
  impliesDrVandanaPractice,
  isCorpusProductionBlocked,
  isProductionIndexable,
  NON_INDEXABLE_CORPORA,
  PSYCHOLOGY_DOMAIN_TAXONOMY,
  resolveKnowledgeScope,
  resolveSourceTier,
  sourceTierRank,
  therapyEducationDoesNotImplyPractice,
} from "@/lib/ai/knowledge/library";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import { isRagIndexable } from "@/lib/ai/knowledge/workflow";
import type { KnowledgeDocument } from "@/types/ai";

describe("Psychology Knowledge Library — Phase 2 architecture", () => {
  it("excludes University curriculum documents from production retrieval", () => {
    const indexed = knowledgeRepository.list();
    const curriculumIndexed = indexed.filter(
      (doc) => doc.corpus === "ACADEMIC_CURRICULUM_REFERENCE",
    );
    assert.equal(curriculumIndexed.length, 0);

    for (const doc of academicCurriculumDocuments) {
      assert.equal(isProductionIndexable(doc), false);
      assert.equal(isRagIndexable(doc), false);
    }
  });

  it("blocks curriculum corpus even if accidentally marked published", () => {
    const sample = academicCurriculumDocuments[0]!;
    const compromised: KnowledgeDocument = {
      ...sample,
      approved: true,
      approval_state: "PUBLISHED",
    };
    assert.equal(isProductionIndexable(compromised), false);
    assert.equal(isCorpusProductionBlocked("ACADEMIC_CURRICULUM_REFERENCE"), true);
    assert.ok(NON_INDEXABLE_CORPORA.includes("ACADEMIC_CURRICULUM_REFERENCE"));
  });

  it("classifies general psychology knowledge separately from Dr. Vandana practice", () => {
    const educational = allKnowledgeDocuments.find(
      (doc) => doc.corpus === "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
    );
    const vandana = allKnowledgeDocuments.find(
      (doc) => doc.corpus === "DR_VANDANA_KNOWLEDGE",
    );
    assert.ok(educational);
    assert.ok(vandana);

    assert.notEqual(resolveKnowledgeScope(educational!), "DR_VANDANA_PRACTICE");
    assert.equal(resolveKnowledgeScope(vandana!), "DR_VANDANA_PRACTICE");
    assert.equal(resolveSourceTier(vandana!), "TIER_5_DR_VANDANA");
  });

  it("does not let CBT educational knowledge imply Dr. Vandana uses CBT", () => {
    const cbtEducation = createKnowledgeDocument({
      id: "test-cbt-education",
      title: "What is Cognitive Behaviour Therapy (CBT)?",
      category: "Psychology Fundamentals",
      topic: "cbt-concepts",
      corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
      evidence_level: "educational",
      source: "Educational psychology reference (metadata only)",
      author: "Unknown",
      publication: "Educational overview",
      date: "2026-09-02",
      approved: false,
      approval_state: "REVIEW",
      content:
        "CBT is a structured psychotherapy approach focusing on the relationship between thoughts, feelings and behaviour.",
    });

    assert.equal(impliesDrVandanaPractice(cbtEducation), false);
    assert.equal(
      therapyEducationDoesNotImplyPractice([cbtEducation]),
      true,
    );

    const boundary = evaluatePracticeBoundary([cbtEducation], true);
    assert.equal(boundary.mayAnswerAsDrVandanaPractice, false);
    assert.equal(boundary.mayAnswerAsGeneralEducation, false);
  });

  it("keeps source tier separate from relevance ranking concerns", () => {
    const tier1 = sourceTierRank("TIER_1_AUTHORITATIVE");
    const tier2 = sourceTierRank("TIER_2_RESEARCH");
    assert.ok(tier1 < tier2, "lower rank number means higher authority tier label order");
    assert.notEqual(tier1, tier2);
  });

  it("keeps evidence level separate from source tier", () => {
    const textbook = createKnowledgeDocument({
      id: "test-textbook-metadata",
      title: "Introductory Psychology Handbook (bibliographic metadata only)",
      category: "Psychology Fundamentals",
      topic: "psychology-fundamentals",
      corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
      evidence_level: "academic-reference",
      source_tier: "TIER_3_ACADEMIC",
      source: "Bibliographic reference only — no full text ingested",
      author: "Unknown",
      publication: "Unknown publisher",
      date: "2026-09-02",
      approved: false,
      approval_state: "REVIEW",
      source_metadata: {
        copyright_status: "METADATA_ONLY",
        verification_status: "UNVERIFIED",
      },
      content: "Topic coverage note only. Full copyrighted text is not stored.",
    });

    assert.equal(resolveSourceTier(textbook), "TIER_3_ACADEMIC");
    assert.equal(textbook.evidence_level, "academic-reference");
    assert.equal(
      evidenceLevelDistinctFromSourceTier("educational", "TIER_4_EDUCATIONAL"),
      true,
    );
  });

  it("excludes unapproved sources from indexable retrieval", () => {
    const draft = createKnowledgeDocument({
      id: "test-unapproved-source",
      title: "Unapproved draft source",
      category: "Psychology Fundamentals",
      topic: "memory",
      corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
      evidence_level: "educational",
      source: "Pending review",
      author: "Unknown",
      publication: "Draft",
      date: "2026-09-02",
      approved: false,
      approval_state: "REVIEW",
      content: "Draft content awaiting approval.",
    });

    assert.equal(isProductionIndexable(draft), false);
    const indexed = knowledgeRepository.list();
    assert.ok(!indexed.some((doc) => doc.id === draft.id));
  });

  it("stores copyright metadata without requiring full copyrighted text", () => {
    const metadataOnly = createKnowledgeDocument({
      id: "test-copyright-metadata",
      title: "Journal Article (metadata only)",
      category: "Psychology Fundamentals",
      topic: "self-esteem",
      corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
      evidence_level: "peer-reviewed",
      source: "Bibliographic record",
      author: "Unknown",
      publication: "Unknown journal",
      date: "2026-09-02",
      approved: false,
      approval_state: "REVIEW",
      source_metadata: {
        copyright_status: "METADATA_ONLY",
        doi: undefined,
        pages: undefined,
        verification_status: "UNVERIFIED",
        notes: "Full article text not ingested.",
      },
      content: "Summary placeholder for approved excerpt only.",
    });

    assert.equal(metadataOnly.source_metadata?.copyright_status, "METADATA_ONLY");
    assert.equal(metadataOnly.source_metadata?.doi, undefined);
    assert.equal(metadataOnly.source_metadata?.pages, undefined);
    assert.ok(metadataOnly.content.length < 500);
  });

  it("leaves missing bibliographic metadata null rather than fabricated", () => {
    const sparse = createKnowledgeDocument({
      id: "test-sparse-metadata",
      title: "Sparse bibliographic record",
      category: "Stress",
      topic: "stress-management",
      corpus: "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
      evidence_level: "public-health-education",
      source: "Public mental-health education",
      author: "Unknown",
      publication: "Educational synthesis",
      date: "2026-09-02",
      content: "Educational content without fabricated DOI or ISBN.",
    });

    assert.equal(sparse.source_metadata, undefined);
  });

  it("generates coverage map counts from actual repository data", () => {
    const map = buildKnowledgeCoverageMap();
    assert.ok(map.length >= PSYCHOLOGY_DOMAIN_TAXONOMY.length);

    const stressEntry = map.find((entry) => entry.topic === "stress");
    assert.ok(stressEntry);
    assert.ok(stressEntry!.source_count >= 1);
    assert.ok(stressEntry!.published_source_count >= 1);

    const tierCounts = countDocumentsBySourceTier();
    const scopeCounts = countDocumentsByKnowledgeScope();
    const totalFromTiers = Object.values(tierCounts).reduce((sum, n) => sum + n, 0);
    const totalFromScopes = Object.values(scopeCounts).reduce((sum, n) => sum + n, 0);
    assert.equal(totalFromTiers, allKnowledgeDocuments.length);
    assert.equal(totalFromScopes, allKnowledgeDocuments.length);
  });

  it("does not expose internal curriculum metadata in default public attribution", () => {
    const curriculum = academicCurriculumDocuments[0]!;
    const attribution = formatPublicSourceAttribution(curriculum);
    assert.match(attribution.title, /Internal coverage reference/);
    assert.doesNotMatch(attribution.attribution, /University of Mumbai syllabus answer/i);
  });

  it("preserves REVIEW curriculum records as non-indexable", () => {
    for (const doc of academicCurriculumDocuments) {
      assert.equal(doc.approval_state, "REVIEW");
      assert.equal(doc.approved, false);
      assert.equal(doc.source_metadata?.copyright_status, "METADATA_ONLY");
    }
  });
});
