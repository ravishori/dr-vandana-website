/**
 * Professional facts must come from verified source information only.
 * Do not add credentials, claims, or contact details here without verification.
 */
export type ProfessionalProfile = {
  name: string;
  profession: string;
  qualifications: readonly string[];
  experience: string;
  tagline: string;
  positioning: string;
  /**
   * Marks this object as the verified content source for UI copy.
   * Unverified fields belong in site placeholders, not here.
   */
  verificationNote: string;
};
