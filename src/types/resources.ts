export const RESOURCE_TYPES = [
  "BOOK",
  "RESEARCH_PAPER",
  "JOURNAL",
  "ARTICLE",
  "WEBSITE",
  "GUIDE",
  "VIDEO",
  "OTHER",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

export const EVIDENCE_LEVELS = [
  "PEER_REVIEWED",
  "EVIDENCE_INFORMED",
  "EDUCATIONAL",
  "SELF_HELP",
] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const RESOURCE_FORMATS = [
  "PHYSICAL_BOOK",
  "EBOOK",
  "AUDIOBOOK",
  "ONLINE",
  "PDF",
  "JOURNAL_ARTICLE",
] as const;
export type ResourceFormat = (typeof RESOURCE_FORMATS)[number];

export const DIFFICULTY_LEVELS = [
  "BEGINNER",
  "GENERAL",
  "ACADEMIC",
  "PROFESSIONAL",
] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const URL_CHECK_STATUSES = ["VALID", "BROKEN", "UNVERIFIED"] as const;
export type UrlCheckStatus = (typeof URL_CHECK_STATUSES)[number];

export const RESOURCE_TOPICS = [
  "stress-management",
  "anxiety",
  "depression-awareness",
  "emotional-well-being",
  "mindfulness",
  "meditation",
  "self-esteem",
  "confidence",
  "emotional-intelligence",
  "positive-psychology",
  "personal-growth",
  "healthy-habits",
  "relationships",
  "parenting",
  "family-well-being",
  "communication",
  "child-psychology",
  "adolescent-mental-health",
  "workplace-mental-health",
  "burnout",
  "grief",
  "resilience",
  "coping-skills",
  "psychology-fundamentals",
  "counselling-psychology",
  "research-methods",
] as const;

export type ResourceTopic = (typeof RESOURCE_TOPICS)[number];

export const RESOURCE_AUDIENCES = [
  "general-public",
  "parents",
  "children",
  "teenagers",
  "adults",
  "couples",
  "families",
  "working-professionals",
  "students",
  "psychology-students",
  "educators",
  "mental-health-professionals",
] as const;

export type ResourceAudience = (typeof RESOURCE_AUDIENCES)[number];

export type PurchaseLink = {
  retailerName: string;
  url: string;
  format: ResourceFormat | null;
  lastChecked: string | null;
};

export type ResearchSummary = {
  researchQuestion: string;
  whatResearchersDid: string;
  mainFindings: string;
  limitations: string;
  everydayLanguage: string;
  practicalTakeaway: string;
  originalSource: string;
};

export type WellnessResource = {
  id: string;
  title: string;
  slug: string;
  resourceType: ResourceType;
  category: string;
  subcategory: string | null;
  description: string;
  shortDescription: string;
  author: string | null;
  authors: string[];
  publisher: string | null;
  publicationDate: string | null;
  edition: string | null;
  isbn: string | null;
  language: string;
  formats: ResourceFormat[];
  audiences: ResourceAudience[];
  difficultyLevel: DifficultyLevel;
  evidenceLevel: EvidenceLevel;
  topics: ResourceTopic[];
  coverImage: string | null;
  externalUrl: string | null;
  purchaseUrls: PurchaseLink[];
  readOnlineUrl: string | null;
  doi: string | null;
  journalName: string | null;
  citation: string | null;
  isPeerReviewed: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  verificationDate: string | null;
  verifiedBy: string | null;
  urlCheckStatus: UrlCheckStatus;
  researchSummary: ResearchSummary | null;
  whyUseful: string | null;
  status: ResourceStatus;
  relatedArticleHrefs: string[];
  createdAt: string;
  updatedAt: string;
};

export type ResourceListFilters = {
  q?: string;
  resourceType?: ResourceType;
  topic?: ResourceTopic;
  audience?: ResourceAudience;
  format?: ResourceFormat;
  difficultyLevel?: DifficultyLevel;
  evidenceLevel?: EvidenceLevel;
  status?: ResourceStatus;
  featuredOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type ResourceListResult = {
  items: WellnessResource[];
  total: number;
  page: number;
  pageSize: number;
};

export type ResourceDashboardStats = {
  published: number;
  drafts: number;
  featured: number;
  books: number;
  research: number;
  articles: number;
  needsVerification: number;
};
