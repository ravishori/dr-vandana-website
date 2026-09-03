import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import { academicCurriculumDocuments } from "@/data/ai/knowledge/curriculum";
import {
  ALL_EVIDENCE_REVIEW_NOTES,
  allEvidenceDocuments,
  evidencePilotDocuments,
  phase4EvidenceDocuments,
} from "@/data/ai/knowledge/evidence-pilot";
import { buildKnowledgeCoverageMap } from "@/lib/ai/knowledge/library/coverage-map";
import {
  impliesDrVandanaPractice,
  isProductionIndexable,
} from "@/lib/ai/knowledge/library/semantics";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import type { KnowledgeDocument } from "@/types/ai";

const PILOT_URLS = [
  "https://www.who.int/news-room/questions-and-answers/item/stress",
  "https://www.who.int/news-room/fact-sheets/detail/depression",
  "https://www.who.int/news-room/fact-sheets/detail/mental-health-strengthening-our-response",
  "https://www.nimh.nih.gov/health/topics/psychotherapies",
] as const;

function requiredPilotFields(doc: KnowledgeDocument) {
  assert.ok(doc.source_tier, `${doc.id} missing source_tier`);
  assert.ok(doc.knowledge_scope, `${doc.id} missing knowledge_scope`);
  assert.ok(doc.evidence_level, `${doc.id} missing evidence_level`);
  assert.ok(doc.source_metadata?.verification_status, `${doc.id} missing verification_status`);
  assert.ok(doc.approval_state, `${doc.id} missing approval_state`);
  assert.ok(doc.source_metadata?.copyright_status, `${doc.id} missing copyright_status`);
}

describe("Phase 3–4 controlled evidence sources", () => {
  it("registers twelve controlled external evidence sources", () => {
    assert.equal(evidencePilotDocuments.length, 4);
    assert.equal(phase4EvidenceDocuments.length, 8);
    assert.equal(allEvidenceDocuments.length, 12);
    assert.equal(
      allKnowledgeDocuments.filter((doc) => doc.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES").length,
      12,
    );
  });

  it("requires complete provenance on every evidence source", () => {
    for (const doc of allEvidenceDocuments) {
      requiredPilotFields(doc);
      assert.equal(doc.corpus, "PSYCHOLOGY_EVIDENCE_SOURCES");
      assert.notEqual(doc.knowledge_scope, "DR_VANDANA_PRACTICE");
      assert.ok(doc.source_metadata?.source_id);
      assert.ok(doc.source_metadata?.organization);
      assert.ok(doc.source_metadata?.url);
      assert.equal(doc.source_metadata?.verification_status, "VERIFIED");
      assert.equal(doc.approval_state, "PUBLISHED");
      assert.equal(doc.approved, true);
    }
  });

  it("does not fabricate bibliographic metadata", () => {
    for (const doc of allEvidenceDocuments) {
      assert.equal(doc.source_metadata?.doi, undefined);
      assert.equal(doc.source_metadata?.pages, undefined);
      assert.equal(doc.source_metadata?.volume, undefined);
      assert.equal(doc.source_metadata?.issue, undefined);
      assert.equal(doc.source_metadata?.journal, undefined);
    }
  });

  it("stores paraphrased content without full copyrighted reproduction", () => {
    for (const doc of allEvidenceDocuments) {
      assert.ok(doc.content.length > 100);
      assert.ok(doc.content.length < 3_000, `${doc.id} content unexpectedly large`);
      assert.doesNotMatch(doc.content, /all rights reserved/i);
    }
  });

  it("keeps external CBT education from implying Dr. Vandana practice", () => {
    const cbt = evidencePilotDocuments.find((doc) => doc.id === "evidence-nimh-cbt-education");
    assert.ok(cbt);
    assert.equal(cbt?.knowledge_scope, "CLINICAL_EDUCATION");
    assert.equal(impliesDrVandanaPractice(cbt!), false);
    assert.match(cbt!.content, /does not state that Dr\. Vandana/i);
  });

  it("indexes only published evidence sources in production retrieval", () => {
    const indexed = knowledgeRepository.list();
    const pilotIndexed = indexed.filter((doc) => doc.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES");
    assert.equal(pilotIndexed.length, 12);
    for (const doc of allEvidenceDocuments) {
      assert.equal(isProductionIndexable(doc), true);
    }
  });

  it("keeps curriculum excluded while pilot sources are indexable", () => {
    const indexed = knowledgeRepository.list();
    assert.equal(
      indexed.filter((doc) => doc.corpus === "ACADEMIC_CURRICULUM_REFERENCE").length,
      0,
    );
    assert.equal(academicCurriculumDocuments.length, 159);
  });

  it("has internal review notes for every evidence source", () => {
    assert.equal(ALL_EVIDENCE_REVIEW_NOTES.length, 12);
    for (const doc of allEvidenceDocuments) {
      assert.ok(
        ALL_EVIDENCE_REVIEW_NOTES.some((note) => note.source_id === doc.id),
        `missing review note for ${doc.id}`,
      );
    }
  });

  it("increases published coverage for stress and depression-awareness topics", () => {
    const map = buildKnowledgeCoverageMap();
    const stress = map.find((entry) => entry.topic === "stress");
    const depression = map.find((entry) => entry.topic === "depression-awareness");
    const cbt = map.find((entry) => entry.topic === "cbt-concepts");
    assert.ok(stress);
    assert.ok(depression);
    assert.ok(cbt);
    assert.ok(stress!.published_source_count >= 2);
    assert.ok(depression!.published_source_count >= 2);
    assert.equal(cbt!.published_source_count, 1);
  });

  it("validates pilot source URLs resolve to official pages", async () => {
    for (const url of PILOT_URLS) {
      const response = await fetch(url, { method: "GET", redirect: "follow" });
      assert.ok(response.ok, `${url} returned ${response.status}`);
      const finalUrl = response.url;
      assert.match(finalUrl, /who\.int|nih\.gov/);
    }
  });
});
