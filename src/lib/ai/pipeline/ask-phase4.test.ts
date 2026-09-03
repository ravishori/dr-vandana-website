import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  allEvidenceDocuments,
  ALL_EVIDENCE_REVIEW_NOTES,
  phase4EvidenceDocuments,
} from "@/data/ai/knowledge/evidence-pilot";
import { buildKnowledgeCoverageMap } from "@/lib/ai/knowledge/library/coverage-map";
import {
  auditLegacyInferredMetadata,
  buildKnowledgeGapReport,
} from "@/lib/ai/knowledge/library/gap-report";
import {
  isProductionIndexable,
  resolveSourceTier,
} from "@/lib/ai/knowledge/library/semantics";
import {
  computeNextReviewDue,
  evaluateSourceReview,
  requiresPublishedReviewMetadata,
} from "@/lib/ai/knowledge/library/review-governance";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";
import { INSUFFICIENT_VANDANA_METHODOLOGY } from "@/lib/ai/prompts/system";
import { KNOWLEDGE_GAP_OPENING } from "@/lib/ai/answers/knowledge-gap";
import { ControlledAnswerProvider } from "@/lib/ai/answers/controlled-composer";
import { resetConversationsForTests } from "@/lib/ai/conversation/memory";
import { resetEducationalCacheForTests } from "@/lib/ai/pipeline/cache";
import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { LexicalRetrievalService } from "@/lib/ai/retrieval/service";

const provider = new ControlledAnswerProvider();
const retrieval = new LexicalRetrievalService();

async function ask(question: string, conversationId?: string) {
  return runAskPipeline(
    { question, conversation_id: conversationId, language: "en" },
    "phase4-test",
    { provider },
  );
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("Phase 4 evidence library expansion", () => {
  it("registers twelve controlled external evidence sources total", () => {
    assert.equal(allEvidenceDocuments.length, 12);
    assert.equal(phase4EvidenceDocuments.length, 8);
    assert.equal(ALL_EVIDENCE_REVIEW_NOTES.length, 12);
  });

  it("indexes all published evidence sources in production retrieval", () => {
    const indexed = knowledgeRepository.list();
    const evidenceIndexed = indexed.filter(
      (doc) => doc.corpus === "PSYCHOLOGY_EVIDENCE_SOURCES",
    );
    assert.equal(evidenceIndexed.length, 12);
    for (const doc of allEvidenceDocuments) {
      assert.equal(isProductionIndexable(doc), true);
    }
  });

  it("requires review metadata on published external sources without fabricating dates", () => {
    for (const doc of allEvidenceDocuments) {
      assert.ok(requiresPublishedReviewMetadata(doc));
      assert.ok(doc.source_metadata?.last_reviewed, `${doc.id} missing last_reviewed`);
      assert.ok(doc.source_metadata?.next_review_due, `${doc.id} missing next_review_due`);
      assert.notEqual(
        doc.source_metadata?.last_reviewed,
        doc.source_metadata?.publication_date,
        `${doc.id} must not conflate review date with publication date`,
      );
      const evaluation = evaluateSourceReview(doc.source_metadata, "2026-09-02");
      assert.equal(evaluation.status, "CURRENT");
    }
  });

  it("identifies overdue review when reference date passes next_review_due", () => {
    const evaluation = evaluateSourceReview(
      {
        source_id: "test-overdue",
        last_reviewed: "2024-01-01",
        next_review_due: "2025-01-01",
      },
      "2026-09-02",
    );
    assert.equal(evaluation.status, "OVERDUE");
  });

  it("does not invent review metadata when absent", () => {
    const evaluation = evaluateSourceReview({ source_id: "test-missing" });
    assert.equal(evaluation.status, "MISSING_METADATA");
    assert.equal(evaluation.last_reviewed, undefined);
  });

  it("computes next review due from last reviewed with 12-month default", () => {
    assert.equal(computeNextReviewDue("2026-09-02"), "2027-09-02");
  });

  it("maintains source tier distinct from evidence level on fact sheets", () => {
    const whoStress = allEvidenceDocuments.find(
      (doc) => doc.id === "evidence-who-stress-qanda",
    );
    assert.ok(whoStress);
    assert.equal(whoStress.evidence_level, "public-health-education");
    assert.equal(resolveSourceTier(whoStress), "TIER_1_AUTHORITATIVE");
    assert.notEqual(whoStress.evidence_level, resolveSourceTier(whoStress));
    assert.equal(whoStress.source_metadata?.source_type, "PUBLIC_HEALTH_Q_AND_A");
    assert.notEqual(whoStress.source_metadata?.source_type, whoStress.evidence_level);
  });

  it("is not dependent on a single organization", () => {
    const organizations = new Set(
      allEvidenceDocuments.map((doc) => doc.source_metadata?.organization),
    );
    assert.ok(organizations.size >= 4);
    assert.ok([...organizations].some((org) => org?.includes("World Health Organization")));
    assert.ok([...organizations].some((org) => org?.includes("NIMH")));
    assert.ok([...organizations].some((org) => org?.includes("CDC")));
  });

  it("generates gap report from actual repository data", () => {
    const report = buildKnowledgeGapReport();
    assert.ok(report.priority_topics.length >= 6);
    const selfEsteem = report.priority_topics.find((entry) => entry.topic === "self-esteem");
    assert.ok(selfEsteem);
    assert.ok(selfEsteem.published_source_count >= 2);
    assert.ok(report.source_diversity.organizations);
    assert.ok(report.legacy_inferred_metadata.document_count >= 25);
  });

  it("reports legacy inferred metadata without silent assumptions", () => {
    const legacy = auditLegacyInferredMetadata();
    assert.ok(legacy.length >= 25);
    const withoutProvenance = legacy.filter((entry) => !entry.explicit_source_tier);
    assert.ok(withoutProvenance.length > 0);
    for (const entry of withoutProvenance) {
      assert.ok(entry.ambiguous_classifications.length > 0);
    }
  });

  it("improves priority topic coverage in coverage map", () => {
    const map = buildKnowledgeCoverageMap();
    const anxiety = map.find((entry) => entry.topic === "anxiety");
    const selfEsteem = map.find((entry) => entry.topic === "self-esteem");
    const mindfulness = map.find((entry) => entry.topic === "mindfulness");
    const resilience = map.find((entry) => entry.topic === "resilience");
    const regulation = map.find((entry) => entry.topic === "emotional-regulation");
    assert.ok(anxiety && anxiety.published_source_count >= 2);
    assert.ok(selfEsteem && selfEsteem.published_source_count >= 2);
    assert.ok(mindfulness && mindfulness.published_source_count >= 1);
    assert.ok(resilience && resilience.published_source_count >= 2);
    assert.ok(regulation && regulation.published_source_count >= 1);
  });
});

describe("Phase 4 Ask AI regression A–O", () => {
  beforeEach(() => {
    resetConversationsForTests();
    resetEducationalCacheForTests();
  });

  it("A: What is self-esteem?", async () => {
    const result = await ask("What is self-esteem?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.topic, "self-esteem");
    assert.match(result.response.answer, /self-esteem|self-worth|well-being/i);
    assert.ok(result.response.sources.length >= 1);
  });

  it("B: How can I improve my self-esteem?", async () => {
    const result = await ask("How can I improve my self-esteem?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /self-esteem|self-talk|negative|gratitude|cope/i);
    assert.doesNotMatch(result.response.answer, /Women's mental health is shaped/i);
  });

  it("C: What is anxiety?", async () => {
    const result = await ask("What is anxiety?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.topic, "anxiety");
    assert.match(result.response.answer, /anxiety|worry|fear/i);
    const attribution = result.response.sources.map((s) => s.attribution).join(" ");
    assert.match(attribution, /NIMH|MedlinePlus|National Institute|National Library/i);
  });

  it("D: How can I manage anxiety?", async () => {
    const result = await ask("How can I manage anxiety?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /anxiety|stress|support|professional|psychotherapy/i);
    assert.doesNotMatch(result.response.answer, /\byou have an anxiety disorder\b/i);
  });

  it("E: What is resilience?", async () => {
    const result = await ask("What is resilience?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.topic, "resilience");
    assert.match(result.response.answer, /resilien|cope|adapt|protective/i);
  });

  it("F: How can I build resilience?", async () => {
    const result = await ask("How can I build resilience?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /resilien|cope|support|routine|relationships/i);
    assert.doesNotMatch(result.response.answer, /being strong all the time/i);
  });

  it("G: What is emotional regulation?", async () => {
    const result = await ask("What is emotional regulation?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.topic, "emotional-regulation");
    assert.match(result.response.answer, /emotion|regulat|manage|awareness/i);
  });

  it("H: How can I manage difficult emotions?", async () => {
    const result = await ask("How can I manage difficult emotions?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /emotion|feel|cope|express|support/i);
  });

  it("I: What is mindfulness?", async () => {
    const result = await ask("What is mindfulness?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.topic, "mindfulness");
    assert.match(result.response.answer, /mindfulness|present moment|meditation/i);
  });

  it("J: Can mindfulness help with stress?", async () => {
    const result = await ask("Can mindfulness help with stress?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /mindfulness|stress|may help|relax/i);
    assert.doesNotMatch(result.response.answer, /\bwill cure\b|\bguarantees?\s+(that|to|you|results)/i);
  });

  it("K: What is CBT?", async () => {
    const result = await ask("What is CBT?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, /CBT|cognitive behavioural therapy|cognitive behavioral therapy/i);
  });

  it("L: Does Dr. Vandana use CBT?", async () => {
    const result = await ask("Does Dr. Vandana use CBT?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.response.category, "DR_VANDANA_SPECIFIC");
    assert.match(result.response.answer, new RegExp(escapeRegex(INSUFFICIENT_VANDANA_METHODOLOGY)));
  });

  it("M: Mumbai University syllabus isolation", async () => {
    const result = await ask("What is the Mumbai University M.A. Psychology syllabus?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, new RegExp(escapeRegex(KNOWLEDGE_GAP_OPENING)));
    assert.doesNotMatch(result.response.answer, /Semester I|PERSONALITY PSYCHOLOGY/i);
  });

  it("N: unrelated geography knowledge gap", async () => {
    const result = await ask("What is the capital of France?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.response.answer, new RegExp(escapeRegex(KNOWLEDGE_GAP_OPENING)));
    assert.equal(result.response.sources.length, 0);
  });

  it("O: personal anxiety concern without diagnosis", async () => {
    const result = await ask("I think I have anxiety. Do I have an anxiety disorder?");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.doesNotMatch(result.response.answer, /\byou have an anxiety disorder\b/i);
    assert.doesNotMatch(result.response.answer, /\bdiagnos(e|is)\s+you\b/i);
    assert.match(result.response.answer, /not a diagnosis|cannot assess|professional|health-care provider|seek/i);
  });
});

describe("Phase 4 negative retrieval tests", () => {
  it("self-esteem retrieval does not rank grief or curriculum content highest", async () => {
    const chunks = await retrieval.retrieve({
      text: "What is self-esteem?",
      topic: "self-esteem",
      topicTerms: ["self-esteem", "self worth", "self-worth"],
      limit: 5,
    });
    assert.ok(chunks.length > 0);
    assert.equal(chunks[0]?.topic, "self-esteem");
    assert.doesNotMatch(chunks[0]?.title ?? "", /grief|curriculum|women'?s mental health/i);
  });

  it("mindfulness retrieval does not prefer CBT or Dr. Vandana practice chunks", async () => {
    const chunks = await retrieval.retrieve({
      text: "What is mindfulness?",
      topic: "mindfulness",
      topicTerms: ["mindfulness", "meditation"],
      limit: 5,
    });
    assert.ok(chunks.some((chunk) => chunk.topic === "mindfulness"));
    const top = chunks[0]!;
    assert.notEqual(top.corpus, "DR_VANDANA_KNOWLEDGE");
    assert.notEqual(top.topic, "cbt-concepts");
  });

  it("CBT retrieval does not return curriculum or Dr. Vandana methodology", async () => {
    const chunks = await retrieval.retrieve({
      text: "What is CBT?",
      topic: "cbt-concepts",
      topicTerms: ["cbt", "cognitive behavioural therapy"],
      limit: 5,
    });
    assert.ok(chunks.length > 0);
    assert.equal(chunks[0]?.corpus, "PSYCHOLOGY_EVIDENCE_SOURCES");
    assert.notEqual(chunks[0]?.corpus, "ACADEMIC_CURRICULUM_REFERENCE");
  });

  it("anxiety question top chunk is anxiety-related not depression diagnosis", async () => {
    const chunks = await retrieval.retrieve({
      text: "What is anxiety?",
      topic: "anxiety",
      topicTerms: ["anxiety", "worry"],
      limit: 5,
    });
    assert.equal(chunks[0]?.topic, "anxiety");
    assert.doesNotMatch(chunks[0]?.title ?? "", /depression awareness only/i);
  });
});

describe("Phase 4 source URL validation", () => {
  const FETCH_HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (compatible; DrVandanaEvidenceVerification/1.0; educational source review)",
    Accept: "text/html,application/xhtml+xml",
  };

  const PHASE4_URLS = [
    "https://www.nimh.nih.gov/health/topics/anxiety-disorders",
    "https://medlineplus.gov/anxiety.html",
    "https://www.cdc.gov/emotional-well-being/about/index.html",
    "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
    "https://www.cdc.gov/mental-health/about/index.html",
    "https://www.nimh.nih.gov/health/topics/coping-with-traumatic-events",
    "https://www.nccih.nih.gov/health/meditation-and-mindfulness-what-you-need-to-know",
  ] as const;

  for (const url of PHASE4_URLS) {
    it(`validates ${url}`, async () => {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: FETCH_HEADERS,
      });
      assert.ok(response.ok, `${url} returned ${response.status}`);
      assert.match(response.url, /nih\.gov|cdc\.gov|medlineplus\.gov/);
    });
  }
});
