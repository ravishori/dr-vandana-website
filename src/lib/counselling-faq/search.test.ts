import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPublishedFaqs } from "@/data/counselling-faq/faqs";
import {
  filterFaqs,
  faqMatchesQuery,
  getRelatedFaqs,
} from "@/lib/counselling-faq/search";

describe("counselling FAQ", () => {
  const faqs = getPublishedFaqs();

  it("publishes the expected FAQ set including emergency guidance", () => {
    assert.ok(faqs.length >= 24);
    assert.ok(faqs.some((faq) => faq.id === "emergency-suicide"));
    assert.ok(faqs.every((faq) => faq.published));
  });

  it("searches by question text", () => {
    const matches = filterFaqs(faqs, { query: "first session" });
    assert.ok(matches.some((faq) => faq.id === "first-session-what-happens"));
  });

  it("expands nervous to anxiety-related FAQs", () => {
    const matches = filterFaqs(faqs, { query: "nervous" });
    assert.ok(matches.some((faq) => faq.id === "help-with-anxiety"));
  });

  it("filters by category", () => {
    const matches = filterFaqs(faqs, { category: "privacy-confidentiality" });
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.id, "confidentiality");
  });

  it("returns related questions", () => {
    const first = faqs.find((faq) => faq.id === "first-session-what-happens");
    assert.ok(first);
    const related = getRelatedFaqs(faqs, first!);
    assert.ok(related.length >= 2);
    assert.ok(related.every((faq) => faq.id !== first!.id));
  });

  it("does not claim absolute confidentiality or guaranteed cures", () => {
    const text = faqs.map((faq) => `${faq.question}\n${faq.answer}`).join("\n");
    assert.equal(/100%\s*confidential/i.test(text), false);
    assert.equal(/guaranteed recovery|will cure|best psychologist/i.test(text), false);
  });

  it("keeps emergency FAQ free of hard-coded alternate helpline lists", () => {
    const emergency = faqs.find((faq) => faq.id === "emergency-suicide");
    assert.ok(emergency);
    assert.match(emergency!.answer, /Mental Health Support/);
    assert.equal(/7827170170/.test(emergency!.answer), false);
  });

  it("matches confidentiality synonyms", () => {
    assert.equal(
      faqMatchesQuery(
        faqs.find((faq) => faq.id === "confidentiality")!,
        "private",
      ),
      true,
    );
  });
});
