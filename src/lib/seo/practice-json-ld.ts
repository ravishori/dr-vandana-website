import { practiceContact } from "@/data/contact";
import { siteConfig } from "@/config/site";

/**
 * ProfessionalService JSON-LD for the verified practice location.
 * Does not invent hours, ratings, reviews, or unverified contact details.
 */
export function getPracticeJsonLd() {
  const { address } = practiceContact;

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: practiceContact.practiceName,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: `+${practiceContact.phoneDigits}`,
    email: practiceContact.email,
    image: `${siteConfig.url}/og-image.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: [
        address.line1,
        address.line2,
        address.landmark,
        address.area,
      ].join(", "),
      addressLocality: address.city,
      addressRegion: address.state,
      postalCode: address.pincode,
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: practiceContact.latitude,
      longitude: practiceContact.longitude,
    },
    hasMap: practiceContact.googleMapsUrl,
    areaServed: {
      "@type": "Place",
      name: `${address.area}, ${address.city}`,
    },
  } as const;
}
