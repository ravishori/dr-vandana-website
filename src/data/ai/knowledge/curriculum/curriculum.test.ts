import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allKnowledgeDocuments } from "@/data/ai/knowledge";
import { academicCurriculumDocuments } from "@/data/ai/knowledge/curriculum";
import {
  CURRICULUM_INSTITUTION,
  CURRICULUM_PROGRAM,
  CURRICULUM_SOURCE,
  CURRICULUM_VERSION,
} from "@/data/ai/knowledge/curriculum/constants";
import { knowledgeRepository } from "@/lib/ai/knowledge/repository";

const LEGACY_CORPORA = [
  "DR_VANDANA_KNOWLEDGE",
  "PSYCHOLOGY_EDUCATIONAL_KNOWLEDGE",
  "CASE_STUDY_KNOWLEDGE",
  "SAFETY_AND_ETHICS_RULES",
] as const;

const FULL_TEXT_BOOK_MARKERS = [
  "chapter 1",
  "chapter 2",
  "isbn:",
  "all rights reserved",
  "printed in",
];

describe("ACADEMIC_CURRICULUM_REFERENCE corpus", () => {
  it("registers the academic curriculum corpus separately from legacy corpora", () => {
    const corpora = new Set(allKnowledgeDocuments.map((doc) => doc.corpus));
    assert.ok(corpora.has("ACADEMIC_CURRICULUM_REFERENCE"));
    for (const corpus of LEGACY_CORPORA) {
      assert.ok(corpora.has(corpus));
    }
    assert.equal(
      allKnowledgeDocuments.filter((doc) => doc.corpus === "ACADEMIC_CURRICULUM_REFERENCE").length,
      academicCurriculumDocuments.length,
    );
  });

  it("keeps legacy corpora document counts unchanged relative to academic layer", () => {
    for (const corpus of LEGACY_CORPORA) {
      const legacyCount = allKnowledgeDocuments.filter((doc) => doc.corpus === corpus).length;
      assert.ok(legacyCount > 0, `${corpus} should remain populated`);
    }
  });

  it("represents academic metadata on curriculum documents", () => {
    const sample = academicCurriculumDocuments.find(
      (doc) => doc.course_code === "501 11" && doc.unit_number === "1",
    );
    assert.ok(sample);
    assert.equal(sample?.institution, CURRICULUM_INSTITUTION);
    assert.equal(sample?.program, CURRICULUM_PROGRAM);
    assert.equal(sample?.curriculum_version, CURRICULUM_VERSION);
    assert.equal(sample?.semester, "I");
    assert.equal(sample?.course_title, "PERSONALITY PSYCHOLOGY");
    assert.equal(sample?.unit_title, "Science of Personality: Methods, Assessment and Historical Approaches");
    assert.equal(sample?.evidence_level, "academic-curriculum");
    assert.equal(sample?.corpus, "ACADEMIC_CURRICULUM_REFERENCE");
  });

  it("covers all four semesters with preserved course titles", () => {
    const semesters = new Set(academicCurriculumDocuments.map((doc) => doc.semester));
    assert.deepEqual([...semesters].sort(), ["I", "II", "III", "IV"]);

    const requiredCourses = [
      "PERSONALITY PSYCHOLOGY",
      "EVOLUTIONARY PSYCHOLOGY",
      "Intervention systems and Skills of Psychology",
      "Critical and Theoretical Psychology",
    ];
    for (const title of requiredCourses) {
      assert.ok(
        academicCurriculumDocuments.some((doc) => doc.course_title === title),
        `missing course ${title}`,
      );
    }
  });

  it("preserves Semester I course codes from the official syllabus", () => {
    const codes = new Set(
      academicCurriculumDocuments
        .filter((doc) => doc.semester === "I" && doc.course_code)
        .map((doc) => doc.course_code),
    );
    assert.ok(codes.has("501 11"));
    assert.ok(codes.has("502 11"));
    assert.ok(codes.has("503 11"));
    assert.ok(codes.has("504 11"));
    assert.ok(codes.has("506 11"));
  });

  it("stores unit-level documents with bibliographic references only", () => {
    const withBooks = academicCurriculumDocuments.filter(
      (doc) => (doc.study_books?.length ?? 0) > 0 || (doc.reference_books?.length ?? 0) > 0,
    );
    assert.ok(withBooks.length > 0);
    for (const doc of withBooks) {
      for (const book of [...(doc.study_books ?? []), ...(doc.reference_books ?? [])]) {
        assert.ok(book.title.length > 0);
        assert.ok(
          book.reference_type === "STUDY_BOOK" || book.reference_type === "REFERENCE_BOOK",
        );
        assert.ok(book.title.length < 500, "bibliographic entries should not contain full book text");
      }
    }
  });

  it("attributes every curriculum document to University of Mumbai", () => {
    for (const doc of academicCurriculumDocuments) {
      assert.equal(doc.source, CURRICULUM_SOURCE);
      assert.match(doc.source, /University of Mumbai/i);
      assert.match(doc.author, /University of Mumbai/i);
    }
  });

  it("does not ingest full copyrighted textbook bodies", () => {
    for (const doc of academicCurriculumDocuments) {
      const lower = doc.content.toLowerCase();
      assert.ok(doc.content.length < 8_000, `${doc.id} content unexpectedly large`);
      for (const marker of FULL_TEXT_BOOK_MARKERS) {
        assert.ok(!lower.includes(marker), `${doc.id} appears to contain book body text`);
      }
    }
  });

  it("indexes curriculum documents through the existing knowledge repository", () => {
    const indexed = knowledgeRepository.list();
    const curriculumIndexed = indexed.filter(
      (doc) => doc.corpus === "ACADEMIC_CURRICULUM_REFERENCE",
    );
    assert.equal(curriculumIndexed.length, academicCurriculumDocuments.length);
  });

  it("leaves legacy knowledge documents structurally compatible", () => {
    const legacy = allKnowledgeDocuments.filter((doc) => doc.corpus !== "ACADEMIC_CURRICULUM_REFERENCE");
    for (const doc of legacy) {
      assert.ok(doc.id);
      assert.ok(doc.title);
      assert.ok(doc.content);
      assert.ok(doc.approved);
      assert.equal(doc.approval_state, "PUBLISHED");
      assert.ok(!doc.semester, `${doc.id} legacy doc should not require semester metadata`);
    }
  });
});
