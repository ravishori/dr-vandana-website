import { aboutApproach, aboutHolisticWellness, aboutIntroduction } from "@/data/about";
import { createKnowledgeDocument } from "@/data/ai/knowledge/helpers";
import { professionalProfile } from "@/data/professional";

/**
 * DR_VANDANA_KNOWLEDGE
 * Only verified public practice information. Do not add techniques,
 * schools of therapy, outcomes, or case history that are not sourced here.
 */
export const vandanaKnowledgeDocuments = [
  createKnowledgeDocument({
    id: "vandana-verified-profile",
    title: "Verified professional profile",
    category: "Dr Vandana Methodology",
    topic: "professional-identity",
    corpus: "DR_VANDANA_KNOWLEDGE",
    evidence_level: "verified-practice",
    source: "Approved Dr. Vandana educational website material",
    author: professionalProfile.name,
    publication: "drvandana.trinetralab.net — About",
    date: "2026-08-09",
    related_questions: [
      "Who is Dr. Vandana?",
      "What are Dr. Vandana's qualifications?",
      "How much experience does Dr. Vandana have?",
    ],
    related_routes: ["/about"],
    content: [
      `${professionalProfile.name} is a ${professionalProfile.profession}.`,
      `Verified qualifications: ${professionalProfile.qualifications.join("; ")}.`,
      professionalProfile.experience,
      `Tagline: ${professionalProfile.tagline}`,
      professionalProfile.positioning,
      "Institution names, registration numbers, testimonials, patient volumes, success rates and treatment outcomes are not published unless independently verified.",
    ].join("\n\n"),
  }),
  createKnowledgeDocument({
    id: "vandana-verified-approach",
    title: "Verified counselling approach",
    category: "Dr Vandana Methodology",
    topic: "counselling-approach",
    corpus: "DR_VANDANA_KNOWLEDGE",
    evidence_level: "verified-practice",
    source: "Approved Dr. Vandana educational website material",
    author: professionalProfile.name,
    publication: "drvandana.trinetralab.net — About",
    date: "2026-08-09",
    related_questions: [
      "What methodology does Dr. Vandana use?",
      "How does Dr. Vandana approach counselling?",
      "What is Dr. Vandana's professional approach?",
    ],
    related_routes: ["/about", "/areas-of-support"],
    content: [
      aboutIntroduction.paragraphs.join("\n\n"),
      aboutApproach.lead,
      "Verified themes of the professional approach:",
      ...aboutApproach.themes.map((theme) => `${theme.title}: ${theme.description}`),
      "Named therapy models (for example CBT, DBT, EMDR, psychoanalysis or hypnotherapy) are not listed as Dr. Vandana's methods unless they appear in approved practice material. If a visitor asks about a specific technique that is not in this knowledge, the assistant must not infer that she uses it.",
    ].join("\n\n"),
  }),
  createKnowledgeDocument({
    id: "vandana-holistic-wellness-boundary",
    title: "Holistic wellness perspective and boundaries",
    category: "Dr Vandana Methodology",
    topic: "holistic-wellness",
    corpus: "DR_VANDANA_KNOWLEDGE",
    evidence_level: "verified-practice",
    source: "Approved Dr. Vandana educational website material",
    author: professionalProfile.name,
    publication: "drvandana.trinetralab.net — About",
    date: "2026-08-09",
    related_questions: [
      "Does Dr. Vandana use naturopathy in counselling?",
      "Is counselling combined with wellness practices?",
    ],
    related_routes: ["/about"],
    content: aboutHolisticWellness.paragraphs.join("\n\n"),
  }),
  createKnowledgeDocument({
    id: "vandana-confidentiality-public",
    title: "Confidentiality of counselling",
    category: "Dr Vandana Methodology",
    topic: "confidentiality",
    corpus: "DR_VANDANA_KNOWLEDGE",
    evidence_level: "verified-practice",
    source: "Approved Dr. Vandana educational website material",
    author: professionalProfile.name,
    publication: "drvandana.trinetralab.net — About",
    date: "2026-08-09",
    related_questions: [
      "Is counselling confidential?",
      "Will Dr. Vandana share my information?",
    ],
    related_routes: ["/privacy-policy", "/about"],
    content: [
      "Privacy is handled with professional regard appropriate to counselling practice.",
      "This website and the Ask Dr. Vandana AI assistant do not contain patient records, session notes, diagnoses or identifiable case histories.",
      "The assistant cannot review, retrieve or describe real patient cases.",
    ].join("\n\n"),
  }),
] as const;
