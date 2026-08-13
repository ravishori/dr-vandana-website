import { faqCategoryLabels, faqSearchSynonyms } from "@/data/counselling-faq/copy";
import type { CounsellingFaq, FaqCategory } from "@/types/counselling-faq";

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+]+/)
    .filter((token) => token.length > 1);
}

function tokenMatches(haystack: string, token: string): boolean {
  if (haystack.includes(token)) {
    return true;
  }
  const synonyms = faqSearchSynonyms[token] ?? [];
  return synonyms.some((synonym) => haystack.includes(synonym.toLowerCase()));
}

export function faqMatchesQuery(faq: CounsellingFaq, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return true;
  }
  const haystack = [
    faq.question,
    faq.answer,
    faqCategoryLabels[faq.category],
    faq.category,
    ...faq.keywords,
    ...faq.audience,
  ]
    .join(" ")
    .toLowerCase();

  if (haystack.includes(trimmed.toLowerCase())) {
    return true;
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return true;
  }
  return tokens.every((token) => tokenMatches(haystack, token));
}

export function filterFaqs(
  faqs: readonly CounsellingFaq[],
  options: { query?: string; category?: FaqCategory | "all" } = {},
): CounsellingFaq[] {
  const category = options.category ?? "all";
  const query = options.query ?? "";
  return faqs.filter((faq) => {
    if (category !== "all" && faq.category !== category) {
      return false;
    }
    return faqMatchesQuery(faq, query);
  });
}

export function getRelatedFaqs(
  faqs: readonly CounsellingFaq[],
  faq: CounsellingFaq,
  limit = 3,
): CounsellingFaq[] {
  const byId = new Map(faqs.map((item) => [item.id, item]));
  const related: CounsellingFaq[] = [];
  for (const id of faq.relatedFaqIds) {
    const match = byId.get(id);
    if (match && match.id !== faq.id) {
      related.push(match);
    }
    if (related.length >= limit) {
      break;
    }
  }
  return related;
}

export function categoriesPresent(
  faqs: readonly CounsellingFaq[],
): FaqCategory[] {
  const present = new Set(faqs.map((faq) => faq.category));
  return [...present];
}

export const relatedPageLabels: Record<string, string> = {
  "/areas-of-support": "Areas of Support",
  "/about": "About Dr. Vandana",
  "/book-appointment": "Book an Appointment",
  "/contact": "Contact",
  "/stress-anxiety-wellness": "Stress, Anxiety & Wellness",
  "/psychology/stress-management": "Stress Management",
  "/psychology/anxiety": "Anxiety",
  "/child-adolescent-psychology": "Child & Adolescent Psychology",
  "/privacy-policy": "Privacy Policy",
  "/disclaimer": "Disclaimer",
  "/mental-health-support": "Mental Health Support & Emergency Help",
};
