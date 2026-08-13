import type {
  CrisisResource,
  CrisisResourceVerification,
} from "@/types/crisis";

/** Verification date for the initial curated seed (YYYY-MM-DD). */
export const CRISIS_SEED_VERIFIED_AT = "2026-08-14";
export const CRISIS_SEED_NEXT_DUE_AT = "2026-09-13";

export const CRISIS_PAGE_DISCLAIMER =
  "Emergency and helpline information is provided for public safety and awareness. Dr. Vandana Rajiv Chaudhary and this website do not operate these external services and cannot guarantee their availability or response. For immediate danger, contact emergency services directly.";

export const crisisCategoryLabels = {
  IMMEDIATE_EMERGENCY: "Immediate emergency",
  MENTAL_HEALTH_CRISIS: "Mental health crisis support",
  SUICIDE_CRISIS: "Suicide / crisis support",
  CHILD_SUPPORT: "Child support",
  WOMEN_SUPPORT: "Women support",
  DOMESTIC_VIOLENCE: "Domestic violence support",
  SENIOR_SUPPORT: "Senior support",
  GOVERNMENT_MENTAL_HEALTH: "Government mental health",
  HOSPITAL: "Hospital",
  PSYCHIATRIC_SUPPORT: "Psychiatric support",
  COUNSELLING_SUPPORT: "Counselling support",
  OTHER_VERIFIED_SUPPORT: "Other verified support",
} as const;

/**
 * Curated seed only. Every public VERIFIED record must cite a Government of
 * India (or equivalent authorized) source. Do not paste blog helpline lists.
 *
 * NCW is intentionally NEEDS_REVIEW / inactive for public display until a
 * human re-confirms the current official helpline page on ncw.gov.in.
 */
export const curatedCrisisSeed: readonly CrisisResource[] = [
  {
    id: "crisis-erss-112",
    slug: "emergency-response-support-system-112",
    name: "Emergency Response Support System",
    shortName: "112",
    category: "IMMEDIATE_EMERGENCY",
    description:
      "112 is India's unified emergency response number for police, fire, medical and other emergency assistance. It is an emergency-response service, not a psychological counselling helpline.",
    purposeNote:
      "Use when there is an immediate risk to life or serious danger.",
    phoneNumbers: [
      {
        display: "112",
        tel: "112",
        label: "Emergency",
        isPrimary: true,
      },
    ],
    emergencyLevel: "IMMEDIATE_DANGER",
    availability: "24×7",
    languages: ["Multiple Indian languages (as available via ERSS)"],
    coverage: "India",
    country: "India",
    state: null,
    district: null,
    organization: "Government of India / Emergency Response Support System",
    organizationType: "GOVERNMENT_OF_INDIA",
    officialWebsite: "https://112.gov.in/",
    officialSourceUrl: "https://112.gov.in/",
    sourceTitle: "Emergency Response Support System (112)",
    sourceAuthority: "Government of India",
    sourceVerifiedAt: CRISIS_SEED_VERIFIED_AT,
    nextVerificationDueAt: CRISIS_SEED_NEXT_DUE_AT,
    verificationStatus: "VERIFIED",
    verificationNotes:
      "Seeded from official 112.gov.in. Confirmed as unified emergency number, not a counselling line.",
    displayOrder: 10,
    isFeatured: true,
    isActive: true,
    createdAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    updatedAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    createdBy: "seed",
    updatedBy: "seed",
  },
  {
    id: "crisis-tele-manas",
    slug: "tele-manas",
    name: "Tele-MANAS",
    shortName: "Tele-MANAS",
    category: "MENTAL_HEALTH_CRISIS",
    description:
      "Government of India's Tele-MANAS service provides 24×7 tele-mental-health support across India, including counselling, specialist linkages, follow-up services and suicide-prevention support. Service experience may vary; this directory does not promise a specific clinical outcome.",
    purposeNote: "24×7 mental-health support and suicide-prevention support.",
    phoneNumbers: [
      {
        display: "14416",
        tel: "14416",
        label: "Primary",
        isPrimary: true,
      },
      {
        display: "1800-89-14416",
        tel: "18008914416",
        label: "Toll-free",
        isPrimary: false,
      },
    ],
    emergencyLevel: "MENTAL_HEALTH_CRISIS",
    availability: "24×7",
    languages: ["Multiple Indian languages (as available via Tele-MANAS)"],
    coverage: "India",
    country: "India",
    state: null,
    district: null,
    organization:
      "Government of India / Ministry of Health & Family Welfare (National Mental Health Programme / Tele-MANAS)",
    organizationType: "GOVERNMENT_OF_INDIA",
    officialWebsite: "https://telemanas.mohfw.gov.in/",
    officialSourceUrl:
      "https://www.dghs.mohfw.gov.in/national-mental-health-programme.php",
    sourceTitle: "National Mental Health Programme / Tele-MANAS (DGHS MoHFW)",
    sourceAuthority: "Ministry of Health & Family Welfare, Government of India",
    sourceVerifiedAt: CRISIS_SEED_VERIFIED_AT,
    nextVerificationDueAt: CRISIS_SEED_NEXT_DUE_AT,
    verificationStatus: "VERIFIED",
    verificationNotes:
      "Seeded from DGHS MoHFW NMHP page and Tele-MANAS portal. Secondary source: telemanas.mohfw.gov.in.",
    displayOrder: 20,
    isFeatured: true,
    isActive: true,
    createdAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    updatedAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    createdBy: "seed",
    updatedBy: "seed",
  },
  {
    id: "crisis-child-helpline-1098",
    slug: "child-helpline-1098",
    name: "Child Helpline",
    shortName: "1098",
    category: "CHILD_SUPPORT",
    description:
      "Child Helpline 1098 is a Government of India service under Mission Vatsalya and is integrated with the Emergency Response Support System 112. It is for children in need of care and protection — not a general adult suicide helpline.",
    purposeNote: "Support for children in distress or needing protection.",
    phoneNumbers: [
      {
        display: "1098",
        tel: "1098",
        label: "Child Helpline",
        isPrimary: true,
      },
    ],
    emergencyLevel: "SPECIALISED_SUPPORT",
    availability: "24×7",
    languages: ["Multiple Indian languages (as available)"],
    coverage: "India",
    country: "India",
    state: null,
    district: null,
    organization:
      "Ministry of Women & Child Development / Government of India (Mission Vatsalya)",
    organizationType: "GOVERNMENT_OF_INDIA",
    officialWebsite: "https://www.spniwcd.wcd.gov.in/child-helpline",
    officialSourceUrl: "https://www.spniwcd.wcd.gov.in/child-helpline",
    sourceTitle: "Child Helpline (SPNI WCD)",
    sourceAuthority: "Ministry of Women & Child Development, Government of India",
    sourceVerifiedAt: CRISIS_SEED_VERIFIED_AT,
    nextVerificationDueAt: CRISIS_SEED_NEXT_DUE_AT,
    verificationStatus: "VERIFIED",
    verificationNotes:
      "Seeded from official SPNI WCD child-helpline page. Not labelled as adult suicide line.",
    displayOrder: 30,
    isFeatured: true,
    isActive: true,
    createdAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    updatedAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    createdBy: "seed",
    updatedBy: "seed",
  },
  {
    id: "crisis-ncw-helpline",
    slug: "national-commission-for-women-helpline",
    name: "National Commission for Women 24×7 Helpline",
    shortName: "NCW Helpline",
    category: "WOMEN_SUPPORT",
    description:
      "National Commission for Women helpline for women-related support and grievances. This is not a general suicide-prevention helpline. Public display is withheld until the current official NCW listing is re-confirmed.",
    purposeNote: "Women support / grievance resource (not a suicide helpline).",
    phoneNumbers: [
      {
        display: "7827170170",
        tel: "7827170170",
        label: "NCW 24×7 Helpline",
        isPrimary: true,
      },
    ],
    emergencyLevel: "SPECIALISED_SUPPORT",
    availability: "24×7 (as stated by NCW; reconfirm before publishing)",
    languages: ["As available via NCW"],
    coverage: "India",
    country: "India",
    state: null,
    district: null,
    organization: "National Commission for Women",
    organizationType: "STATUTORY_BODY",
    officialWebsite: "https://www.ncw.gov.in/",
    officialSourceUrl: "https://www.ncw.gov.in/",
    sourceTitle: "National Commission for Women",
    sourceAuthority: "National Commission for Women",
    sourceVerifiedAt: CRISIS_SEED_VERIFIED_AT,
    nextVerificationDueAt: CRISIS_SEED_NEXT_DUE_AT,
    verificationStatus: "NEEDS_REVIEW",
    verificationNotes:
      "Candidate number recorded from prior NCW communications. Must be re-verified on the live NCW site/document before public VERIFIED status. Do not publish as suicide-prevention.",
    displayOrder: 40,
    isFeatured: false,
    isActive: false,
    createdAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    updatedAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    createdBy: "seed",
    updatedBy: "seed",
  },
];

/** Safe public fallback if the store cannot load — VERIFIED national services only. */
export const criticalCrisisFallback: readonly CrisisResource[] =
  curatedCrisisSeed.filter(
    (resource) =>
      resource.verificationStatus === "VERIFIED" &&
      resource.isActive &&
      (resource.slug === "emergency-response-support-system-112" ||
        resource.slug === "tele-manas" ||
        resource.slug === "child-helpline-1098"),
  );

export const initialCrisisVerifications: readonly CrisisResourceVerification[] =
  curatedCrisisSeed
    .filter((resource) => resource.verificationStatus === "VERIFIED")
    .map((resource) => ({
      id: `verif-${resource.id}`,
      resourceId: resource.id,
      previousStatus: null,
      newStatus: "VERIFIED" as const,
      verifiedAt: CRISIS_SEED_VERIFIED_AT,
      verifiedBy: "seed",
      sourceUrl: resource.officialSourceUrl,
      notes: resource.verificationNotes,
      createdAt: `${CRISIS_SEED_VERIFIED_AT}T00:00:00.000Z`,
    }));
