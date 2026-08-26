import { professionalProfile } from "@/data/professional";

export type PsychologyTopicPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
  relatedQuestions: readonly string[];
  relatedHref: string;
};

export function getPsychologyTopicPage(slug: string): PsychologyTopicPage {
  const page = psychologyTopicPages.find((item) => item.slug === slug);
  if (!page) {
    throw new Error(`Missing psychology topic page: ${slug}`);
  }
  return page;
}

export const psychologyTopicPages: readonly PsychologyTopicPage[] = [
  {
    slug: "anxiety",
    title: `Anxiety Awareness | ${professionalProfile.name}`,
    description:
      "Educational information on anxiety awareness, how concerns may be explored in counselling, and when professional psychological support may help.",
    eyebrow: "Educational psychology",
    heading: "Anxiety awareness",
    intro:
      "Anxiety can describe worry, tension or unease. This page offers general education. It does not diagnose anxiety or replace a consultation with a qualified professional.",
    sections: [
      {
        heading: "How anxiety may be described",
        paragraphs: [
          "People may notice persistent worry, difficulty relaxing, feeling tense, difficulty concentrating, or physical sensations associated with stress.",
          "Experiencing one or more of these does not by itself establish a diagnosis. Similar feelings can occur with ordinary stress, health concerns, sleep disruption or life change.",
        ],
      },
      {
        heading: "How concerns may be explored",
        paragraphs: [
          "A psychologist may explore when the worry started, what situations intensify it, how the person copes, and whether daily functioning, sleep or relationships are affected.",
          "The aim of an educational conversation is understanding, not labelling.",
        ],
      },
    ],
    relatedQuestions: [
      "How are anxiety concerns explored in counselling?",
      "How does counselling help with anxiety?",
    ],
    relatedHref: "/stress-anxiety-wellness",
  },
  {
    slug: "stress-management",
    title: `Stress Management | ${professionalProfile.name}`,
    description:
      "Educational information on stress, healthy coping, workplace strain and when professional psychological support may be helpful.",
    eyebrow: "Educational psychology",
    heading: "Stress management",
    intro:
      "Stress is a natural response to demands, uncertainty or change. Understanding stress can support emotional well-being. This page does not provide a personal treatment plan.",
    sections: [
      {
        heading: "Understanding stress",
        paragraphs: [
          "Short-term stress can sometimes help people respond to a challenge. Ongoing or overwhelming stress can affect sleep, concentration, mood, relationships and daily functioning.",
          "Work, studies, caregiving, relationships and lack of rest are common influences.",
        ],
      },
      {
        heading: "Healthy coping ideas",
        paragraphs: [
          "Rest, supportive connection, realistic expectations, regular meals, and movement that feels tolerable can help some people. What helps one person may differ for another.",
          "If stress is persistent, associated with hopelessness, or interfering with safety or daily life, professional support may help.",
        ],
      },
    ],
    relatedQuestions: [
      "What are healthy ways to understand and manage stress?",
      "How might a psychologist approach workplace burnout?",
    ],
    relatedHref: "/stress-anxiety-wellness",
  },
  {
    slug: "counselling",
    title: `How Counselling Works | ${professionalProfile.name}`,
    description:
      "Learn how psychological counselling works, what a first session may include, and how to take a next step with Dr. Vandana Rajiv Chaudhary.",
    eyebrow: "Educational psychology",
    heading: "How counselling works",
    intro:
      "Psychological counselling is a confidential conversation with a qualified professional. It is not a lecture, a quick fix, or a promise of a particular outcome.",
    sections: [
      {
        heading: "What counselling can offer",
        paragraphs: [
          "A psychologist may listen carefully, help a person describe what feels difficult, and explore thoughts, feelings, relationships and daily circumstances.",
          "Counselling often supports clearer understanding and healthier coping. Progress varies from person to person.",
        ],
      },
      {
        heading: "The first session",
        paragraphs: [
          "A first session is usually an opportunity to understand the presenting concern, relevant background, current supports, and what the person hopes to gain from counselling.",
          "It is not a diagnosis. People can ask questions about the process, pace and practical arrangements.",
        ],
      },
    ],
    relatedQuestions: [
      "How does counselling work?",
      "What happens in the first counselling session?",
    ],
    relatedHref: "/areas-of-support",
  },
];
