export type PlaceholderValue = {
  /** True when the value is not yet verified and must not be treated as live contact data. */
  isPlaceholder: true;
  value: string;
};

export type VerifiedOrPlaceholder = string | PlaceholderValue;

export type SiteContact = {
  email: VerifiedOrPlaceholder;
  phone: VerifiedOrPlaceholder;
  whatsapp: VerifiedOrPlaceholder;
};

export type SiteLocation = {
  city: VerifiedOrPlaceholder;
  address: VerifiedOrPlaceholder;
  consultationHours: VerifiedOrPlaceholder;
};

export type SiteSocialLinks = {
  instagram: VerifiedOrPlaceholder;
  linkedin: VerifiedOrPlaceholder;
  facebook: VerifiedOrPlaceholder;
};

export type SiteConfig = {
  name: string;
  professionalName: string;
  profession: string;
  tagline: string;
  domain: string;
  url: string;
  description: string;
  locale: string;
  contact: SiteContact;
  location: SiteLocation;
  social: SiteSocialLinks;
};

export function resolveDisplayValue(entry: VerifiedOrPlaceholder): string {
  return typeof entry === "string" ? entry : entry.value;
}

export function isPlaceholder(entry: VerifiedOrPlaceholder): boolean {
  return typeof entry !== "string" && entry.isPlaceholder;
}
