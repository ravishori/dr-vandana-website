export const CRISIS_CATEGORIES = [
  "IMMEDIATE_EMERGENCY",
  "MENTAL_HEALTH_CRISIS",
  "SUICIDE_CRISIS",
  "CHILD_SUPPORT",
  "WOMEN_SUPPORT",
  "DOMESTIC_VIOLENCE",
  "SENIOR_SUPPORT",
  "GOVERNMENT_MENTAL_HEALTH",
  "HOSPITAL",
  "PSYCHIATRIC_SUPPORT",
  "COUNSELLING_SUPPORT",
  "OTHER_VERIFIED_SUPPORT",
] as const;

export type CrisisCategory = (typeof CRISIS_CATEGORIES)[number];

export const CRISIS_EMERGENCY_LEVELS = [
  "IMMEDIATE_DANGER",
  "MENTAL_HEALTH_CRISIS",
  "SPECIALISED_SUPPORT",
  "INFORMATIONAL",
] as const;

export type CrisisEmergencyLevel = (typeof CRISIS_EMERGENCY_LEVELS)[number];

export const CRISIS_VERIFICATION_STATUSES = [
  "VERIFIED",
  "NEEDS_REVIEW",
  "EXPIRED",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export type CrisisVerificationStatus =
  (typeof CRISIS_VERIFICATION_STATUSES)[number];

export const CRISIS_ORGANIZATION_TYPES = [
  "GOVERNMENT_OF_INDIA",
  "STATE_GOVERNMENT",
  "GOVERNMENT_DEPARTMENT",
  "STATUTORY_BODY",
  "AUTHORIZED_ORGANIZATION",
  "OTHER",
] as const;

export type CrisisOrganizationType = (typeof CRISIS_ORGANIZATION_TYPES)[number];

export type CrisisPhoneNumber = {
  display: string;
  tel: string;
  label: string | null;
  isPrimary: boolean;
};

export type CrisisResource = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: CrisisCategory;
  description: string;
  purposeNote: string;
  phoneNumbers: CrisisPhoneNumber[];
  emergencyLevel: CrisisEmergencyLevel;
  availability: string;
  languages: string[];
  coverage: string;
  country: string;
  state: string | null;
  district: string | null;
  organization: string;
  organizationType: CrisisOrganizationType;
  officialWebsite: string | null;
  officialSourceUrl: string;
  sourceTitle: string;
  sourceAuthority: string;
  sourceVerifiedAt: string;
  nextVerificationDueAt: string;
  verificationStatus: CrisisVerificationStatus;
  verificationNotes: string;
  displayOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type CrisisResourceVerification = {
  id: string;
  resourceId: string;
  previousStatus: CrisisVerificationStatus | null;
  newStatus: CrisisVerificationStatus;
  verifiedAt: string;
  verifiedBy: string;
  sourceUrl: string;
  notes: string;
  createdAt: string;
};

export type CrisisListFilters = {
  q?: string;
  category?: CrisisCategory;
  verificationStatus?: CrisisVerificationStatus;
  activeOnly?: boolean;
  publicOnly?: boolean;
  overdueOnly?: boolean;
};

export type CrisisDashboardStats = {
  verified: number;
  needsReview: number;
  overdue: number;
  inactive: number;
  archived: number;
};

export type CrisisUpsertInput = Omit<
  CrisisResource,
  "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};
