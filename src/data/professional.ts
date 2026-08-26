import type { ProfessionalProfile } from "@/types/professional";

/**
 * Verified professional content only.
 * Do not add credentials, certifications, registration numbers,
 * testimonials, outcomes, or contact details without verified source information.
 */
export const professionalProfile: ProfessionalProfile = {
  name: "Dr. Vandana Rajiv Chaudhary",
  profession: "Psychologist",
  qualifications: ["Ph.D. in Naturopathy", "M.A. Psychology"],
  experience:
    "Over 6 years of professional experience in psychological counselling and emotional wellness.",
  tagline: "Your Mental Well-being Matters.",
  positioning:
    "Compassionate, confidential and evidence-informed psychological support.",
  verificationNote:
    "Only verified project information is stored here. Remaining unverified contact details (for example consultation hours) must stay placeholders until confirmed.",
};
