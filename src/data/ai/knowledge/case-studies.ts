import { createKnowledgeDocument } from "@/data/ai/knowledge/helpers";
import type { CaseStudyRecord } from "@/types/ai";

const CASE_DISCLAIMER =
  "Educational case study — not a diagnosis or treatment recommendation. This scenario is fictional and anonymised for teaching. It does not describe a real patient of Dr. Vandana, and it is not a record of anyone she has treated.";

function caseKnowledge(params: {
  id: string;
  title: string;
  topic: string;
  content: string;
  related_questions: readonly string[];
  related_routes: readonly string[];
}) {
  return createKnowledgeDocument({
    ...params,
    category: "Case Studies",
    corpus: "CASE_STUDY_KNOWLEDGE",
    evidence_level: "educational",
    source: "Approved fictional educational case study",
    author: "Practice education team",
    publication: "Ask Dr. Vandana AI case-study corpus",
    date: "2026-08-13",
  });
}

export const caseStudyRecords: readonly CaseStudyRecord[] = [
  {
    slug: "workplace-burnout",
    title: "Workplace Burnout — Educational Scenario",
    ageRange: "Adult, 30s–40s",
    generalContext:
      "A working professional describes several months of high workload, long hours and reduced recovery time.",
    presentingConcerns: [
      "Prolonged workplace stress",
      "Emotional exhaustion",
      "Difficulty concentrating",
      "Irritability",
      "Reduced motivation",
    ],
    backgroundFactors: [
      "Limited rest days",
      "High responsibility at work",
      "Less time with supportive people",
      "Sleep becoming shorter and more restless",
    ],
    assessmentConsiderations: [
      "How long the exhaustion has been present",
      "Whether sleep, appetite or hopelessness have changed",
      "Workplace demands and available support",
      "Whether medical review is relevant for fatigue or sleep",
    ],
    formulation: [
      "A psychologist may consider how ongoing demand, limited recovery and reduced support could maintain exhaustion.",
      "Irritability and poorer concentration may be understood as part of strain, not as a character flaw.",
      "Other explanations (low mood, health, caregiving load) would be held open rather than assumed.",
    ],
    possibleApproaches: [
      "Exploring rest, boundaries and values around work",
      "Building small recovery practices that fit real constraints",
      "Considering workplace or medical supports where relevant",
      "Monitoring whether functioning and mood shift over time",
    ],
    monitoring: [
      "Sleep quality and duration",
      "Energy across the working week",
      "Ability to concentrate on ordinary tasks",
      "Whether irritability or hopelessness is increasing",
    ],
    referralConsiderations: [
      "Medical review if fatigue is severe or unexplained",
      "Workplace support channels if they exist and feel safe to use",
      "Urgent care if safety or hopelessness becomes acute",
    ],
    educationalLessons: [
      "Burnout-type strain is often maintained by the gap between demand and recovery.",
      "Chat cannot diagnose burnout or tell someone to leave a job.",
    ],
    disclaimer: CASE_DISCLAIMER,
    relatedTopics: ["burnout", "stress", "workplace"],
    knowledgeDocumentId: "case-workplace-burnout",
  },
  {
    slug: "adolescent-academic-pressure",
    title: "Adolescent Academic Pressure — Educational Scenario",
    ageRange: "Adolescent, mid-teens",
    generalContext:
      "A parent describes a teenager who is studying long hours, sleeping less before exams, and becoming more withdrawn at home.",
    presentingConcerns: [
      "Exam-related worry",
      "Irritability at home",
      "Reduced interest in usual activities",
      "Difficulty switching off from study",
    ],
    backgroundFactors: [
      "High academic expectations",
      "Comparison with peers",
      "Less unstructured rest",
      "Family concern that can feel like pressure",
    ],
    assessmentConsiderations: [
      "What has changed, and over what period",
      "Sleep, eating and school attendance",
      "Whether the adolescent feels able to talk",
      "Safety, self-criticism and any sense of hopelessness",
    ],
    formulation: [
      "A psychologist may consider academic demand, family hopes, and the teenager's own standards as interacting pressures.",
      "Withdrawal might be fatigue, worry, low mood, or a need for privacy — it should not be labelled from a description alone.",
    ],
    possibleApproaches: [
      "A calm conversation with the adolescent at a manageable pace",
      "Helping caregivers support without adding harsh pressure",
      "Restoring sleep and small pockets of recovery",
      "School-based support if appropriate",
    ],
    monitoring: [
      "Sleep and daily routine",
      "Whether the adolescent can still enjoy anything",
      "Communication at home",
      "Any signs of safety concern",
    ],
    referralConsiderations: [
      "Professional assessment if functioning drops sharply",
      "School counsellor or educator support where available",
      "Urgent help if the adolescent expresses hopelessness or self-harm",
    ],
    educationalLessons: [
      "Academic stress is common and is not automatically a disorder.",
      "Adolescents often need both support and a degree of privacy.",
    ],
    disclaimer: CASE_DISCLAIMER,
    relatedTopics: ["adolescents", "parenting", "anxiety"],
    knowledgeDocumentId: "case-adolescent-academic-pressure",
  },
  {
    slug: "relationship-communication",
    title: "Relationship Communication Strain — Educational Scenario",
    ageRange: "Adults, 20s–40s",
    generalContext:
      "Two partners describe repeated arguments about time, household responsibility and feeling unheard.",
    presentingConcerns: [
      "Frequent misunderstandings",
      "Quick escalation during disagreement",
      "Feeling criticised or dismissed",
      "Less warmth in day-to-day interaction",
    ],
    backgroundFactors: [
      "Work fatigue",
      "Different family models of conflict",
      "Little protected time together",
      "Unspoken expectations",
    ],
    assessmentConsiderations: [
      "Whether both people feel safe in the relationship",
      "How conflict typically starts and ends",
      "Individual stressors outside the relationship",
      "Any coercion, intimidation or violence — which would change the response",
    ],
    formulation: [
      "A psychologist may consider a cycle in which feeling unheard leads to protest, which the other person experiences as criticism, leading to withdrawal.",
      "This is a teaching idea, not a verdict on a real couple.",
    ],
    possibleApproaches: [
      "Slowing conversations so each person can be heard",
      "Naming needs more directly and with less blame",
      "Protecting small moments of ordinary connection",
      "Individual work if one person is not ready for joint sessions",
    ],
    monitoring: [
      "Whether disagreements stay safer and shorter",
      "Whether either person feels afraid",
      "Whether warmth returns in small ways",
    ],
    referralConsiderations: [
      "Specialist support if there is violence or fear",
      "Individual counselling if joint work is not safe or wanted",
    ],
    educationalLessons: [
      "Communication strain is common and is not proof that a relationship has failed.",
      "Safety comes before communication techniques.",
    ],
    disclaimer: CASE_DISCLAIMER,
    relatedTopics: ["relationships", "anger"],
    knowledgeDocumentId: "case-relationship-communication",
  },
  {
    slug: "grief-after-loss",
    title: "Grief After a Family Loss — Educational Scenario",
    ageRange: "Adult, 40s–60s",
    generalContext:
      "A person describes missing a close family member several months after the death, with waves of sadness and difficulty concentrating at work.",
    presentingConcerns: [
      "Waves of sadness",
      "Difficulty concentrating",
      "Sleep disruption",
      "Guilt about 'moving on'",
    ],
    backgroundFactors: [
      "A close caregiving relationship before the loss",
      "Family roles that leave little room to talk",
      "Work that continued with little pause",
    ],
    assessmentConsiderations: [
      "The nature of the relationship and the loss",
      "Supports available in family, faith or community",
      "Whether daily functioning is possible some of the time",
      "Whether hopelessness or thoughts of not wanting to live are present",
    ],
    formulation: [
      "A psychologist may understand grief as a continuing bond and a process of adjusting to a changed life, rather than a problem to erase.",
      "Guilt and concentration difficulties can appear in grief without meaning that something is 'wrong' with the person.",
    ],
    possibleApproaches: [
      "A respectful space to speak about the person who died",
      "Allowing grief to have a place alongside ordinary responsibilities",
      "Gentle routines around sleep and support",
      "Not rushing 'closure'",
    ],
    monitoring: [
      "Whether the person can access any support",
      "Sleep and ability to manage essential tasks",
      "Intensity of guilt or hopelessness",
    ],
    referralConsiderations: [
      "Professional assessment if functioning remains very limited",
      "Urgent support if the person feels unsafe",
    ],
    educationalLessons: [
      "Grief does not follow a single timeline.",
      "Counselling does not remove love or memory; it may help a person live with both.",
    ],
    disclaimer: CASE_DISCLAIMER,
    relatedTopics: ["grief", "self-esteem"],
    knowledgeDocumentId: "case-grief-after-loss",
  },
] as const;

export const caseStudyKnowledgeDocuments = caseStudyRecords.map((study) =>
  caseKnowledge({
    id: study.knowledgeDocumentId,
    title: study.title,
    topic: study.slug,
    related_questions: [
      `How might a psychologist approach ${study.title.toLowerCase()}?`,
      `Tell me about the ${study.title} educational case study.`,
    ],
    related_routes: [
      `/psychology/case-studies/${study.slug}`,
      "/psychology/case-studies",
    ],
    content: [
      study.disclaimer,
      `Age range: ${study.ageRange}`,
      `Context: ${study.generalContext}`,
      `Presenting concerns: ${study.presentingConcerns.join("; ")}.`,
      `Background factors a psychologist may explore: ${study.backgroundFactors.join("; ")}.`,
      `Formulation concepts: ${study.formulation.join(" ")}`,
      `Possible approaches: ${study.possibleApproaches.join("; ")}.`,
      `Monitoring: ${study.monitoring.join("; ")}.`,
      `Referral considerations: ${study.referralConsiderations.join("; ")}.`,
      `Educational lessons: ${study.educationalLessons.join(" ")}`,
      "Do not say that Dr. Vandana treated this person. This is a teaching scenario only.",
    ].join("\n\n"),
  }),
);
