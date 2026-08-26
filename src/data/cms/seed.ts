import { cmsConfig } from "@/config/cms";
import type { CmsContentBundle } from "@/types/cms";

/**
 * Clearly marked SAMPLE content for development.
 * Does not invent real affiliations, credentials, testimonials, or YouTube ownership claims.
 * YouTube entries use the well-known public demo video id for embed testing only.
 */
const DEMO_YOUTUBE_ID = "aqz-KE-bpKQ";

export const cmsSeedBundle: CmsContentBundle = {
  articles: [
    {
      id: "11111111-1111-4111-8111-111111111101",
      title: "Understanding Everyday Stress (Sample)",
      slug: "understanding-everyday-stress-sample",
      excerpt:
        "A short educational overview of how everyday stress can show up in thoughts, feelings, and routines — and when to seek professional support.",
      contentMarkdown: `## What this article covers

This **sample** article explains common stress responses in plain language.

### Everyday stress

Stress can appear as tension, racing thoughts, irritability, or disrupted sleep. Patterns vary between people.

### When to seek support

If stress feels overwhelming, persistent, or interferes with daily life, consider speaking with a qualified mental-health professional.

- Educational information is not a diagnosis
- Support looks different for each person
- Professional evaluation can help clarify next steps

[Book a consultation](/book-appointment) if you would like to enquire about appointments.`,
      featuredImageUrl: null,
      featuredImageAlt: null,
      category: "Anxiety & Stress",
      tags: ["stress", "education", "sample"],
      author: cmsConfig.defaultAuthor,
      status: "PUBLISHED",
      featured: true,
      seoTitle: "Understanding Everyday Stress | Sample Article",
      seoDescription:
        "Educational sample article about everyday stress responses and seeking professional support.",
      canonicalPath: "/blog/understanding-everyday-stress-sample",
      publishedAt: "2026-08-01T10:00:00.000Z",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
      showEducationalDisclaimer: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111102",
      title: "Supporting Children's Emotions at Home (Sample)",
      slug: "supporting-childrens-emotions-sample",
      excerpt:
        "Sample guidance for caregivers on noticing emotions, listening calmly, and knowing when specialist support may help.",
      contentMarkdown: `## Sample parenting note

Children express emotions differently at different ages.

### Helpful starting points

1. Notice without rushing to fix
2. Name feelings gently when appropriate
3. Keep routines predictable where possible

This content is educational and not a substitute for child or adolescent psychological assessment.`,
      featuredImageUrl: null,
      featuredImageAlt: null,
      category: "Child Psychology",
      tags: ["parenting", "children", "sample"],
      author: cmsConfig.defaultAuthor,
      status: "PUBLISHED",
      featured: false,
      seoTitle: null,
      seoDescription: null,
      canonicalPath: "/blog/supporting-childrens-emotions-sample",
      publishedAt: "2026-08-05T10:00:00.000Z",
      createdAt: "2026-08-05T10:00:00.000Z",
      updatedAt: "2026-08-05T10:00:00.000Z",
      showEducationalDisclaimer: true,
    },
    {
      id: "11111111-1111-4111-8111-111111111103",
      title: "Draft: Workplace Boundaries (Sample)",
      slug: "workplace-boundaries-sample-draft",
      excerpt:
        "Draft sample notes on workplace emotional load. Not published to the public site.",
      contentMarkdown:
        "## Draft only\n\nThis draft must not appear in public listings until published.",
      featuredImageUrl: null,
      featuredImageAlt: null,
      category: "Workplace Mental Health",
      tags: ["workplace", "draft", "sample"],
      author: cmsConfig.defaultAuthor,
      status: "DRAFT",
      featured: false,
      seoTitle: null,
      seoDescription: null,
      canonicalPath: null,
      publishedAt: null,
      createdAt: "2026-08-10T10:00:00.000Z",
      updatedAt: "2026-08-10T10:00:00.000Z",
      showEducationalDisclaimer: true,
    },
  ],
  resources: [
    {
      id: "22222222-2222-4222-8222-222222222201",
      title: "WHO — Mental Health (Sample Link)",
      description:
        "World Health Organization public information on mental health. Listed as a sample educational resource; not an affiliation.",
      url: "https://www.who.int/health-topics/mental-health",
      category: "Mental Health Information",
      organizationName: "World Health Organization",
      resourceType: "Mental Health Information",
      featured: true,
      displayOrder: 10,
      status: "PUBLISHED",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "22222222-2222-4222-8222-222222222202",
      title: "NIMHANS public information (Sample)",
      description:
        "Sample listing pointing to the National Institute of Mental Health and Neuro Sciences public website. Verify locally before relying on any crisis pathway.",
      url: "https://nimhans.ac.in/",
      category: "Professional Organization",
      organizationName: "NIMHANS",
      resourceType: "Professional Organization",
      featured: false,
      displayOrder: 20,
      status: "PUBLISHED",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "22222222-2222-4222-8222-222222222203",
      title: "Draft resource (Sample)",
      description:
        "Unpublished sample resource used to verify draft visibility rules.",
      url: "https://www.who.int/",
      category: "Educational Resource",
      organizationName: null,
      resourceType: "Educational Resource",
      featured: false,
      displayOrder: 90,
      status: "DRAFT",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
  ],
  videos: [
    {
      id: "33333333-3333-4333-8333-333333333301",
      title: "Sample embed test video",
      description:
        "Uses the publicly known Big Buck Bunny demo id for embed/pipeline testing only. Not a Dr. Vandana channel video.",
      youtubeUrl: `https://www.youtube.com/watch?v=${DEMO_YOUTUBE_ID}`,
      youtubeVideoId: DEMO_YOUTUBE_ID,
      thumbnailUrl: `https://i.ytimg.com/vi/${DEMO_YOUTUBE_ID}/hqdefault.jpg`,
      category: "Practice Updates",
      featured: true,
      displayOrder: 10,
      status: "PUBLISHED",
      publishedAt: "2026-08-01T10:00:00.000Z",
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-01T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333302",
      title: "Sample youtu.be format",
      description: "Second sample entry confirming youtu.be URL parsing.",
      youtubeUrl: `https://youtu.be/${DEMO_YOUTUBE_ID}`,
      youtubeVideoId: DEMO_YOUTUBE_ID,
      thumbnailUrl: null,
      category: "Mental Wellness",
      featured: false,
      displayOrder: 20,
      status: "PUBLISHED",
      publishedAt: "2026-08-02T10:00:00.000Z",
      createdAt: "2026-08-02T10:00:00.000Z",
      updatedAt: "2026-08-02T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333303",
      title: "Draft video (Sample)",
      description: "Unpublished sample video for authorization tests.",
      youtubeUrl: `https://www.youtube.com/shorts/${DEMO_YOUTUBE_ID}`,
      youtubeVideoId: DEMO_YOUTUBE_ID,
      thumbnailUrl: null,
      category: "Other",
      featured: false,
      displayOrder: 90,
      status: "DRAFT",
      publishedAt: null,
      createdAt: "2026-08-03T10:00:00.000Z",
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
  ],
};
