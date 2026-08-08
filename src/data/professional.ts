import type { ProfessionalProfile } from "@/types/professional";

/**
 * Verified professional content only.
 * Do not add credentials, certifications, registration numbers,
 * testimonials, outcomes, or contact details without verified source information.
 */
export const professionalProfile: ProfessionalProfile = {
  name: "Dr. Vandana Rajiv Chaudhary",
  profession: "Psychologist",
  qualifications: ["M.A. Psychology", "Master's Degree in Naturology"],
  experience:
    "Over 6 years of professional experience in psychological counselling and emotional wellness.",
  tagline: "Your Mental Well-being Matters.",
  positioning:
    "Compassionate, confidential and evidence-informed psychological support.",
  verificationNote:
    "Only verified project information is stored here. Unverified contact and location details must remain placeholders in site configuration.",
};
