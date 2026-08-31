import { practiceContact } from "@/data/contact";
import {
  isPlaceholder,
  resolveDisplayValue,
  type VerifiedOrPlaceholder,
} from "@/types/site";

export const WHATSAPP_ENQUIRY_MESSAGE =
  "Hello Dr. Vandana, I would like to enquire about a psychological counselling appointment.";

/** Verified practice telephone link from centralized contact config. */
export function getVerifiedPhoneHref(): string {
  return practiceContact.phoneTelHref;
}

/** Verified practice WhatsApp link (direct wa.me, no prefilled message). */
export function getVerifiedWhatsAppHref(): string {
  return practiceContact.whatsappUrl;
}

/** Primary Bitly booking CTA — do not silently replace. */
export function getBookingHref(): string {
  return practiceContact.bookingUrl;
}

/** Google Maps location link for the verified practice address. */
export function getMapsHref(): string {
  return practiceContact.googleMapsUrl;
}

/** Verified practice email mailto link. */
export function getVerifiedEmailHref(): string {
  return practiceContact.emailMailtoHref;
}

/**
 * Legacy helper for VerifiedOrPlaceholder values.
 * Prefer getVerifiedPhoneHref() for the practice number.
 */
export function getPhoneHref(phone: VerifiedOrPlaceholder): string | null {
  if (isPlaceholder(phone)) {
    return null;
  }

  const display = resolveDisplayValue(phone);
  if (display === practiceContact.whatsappDisplay) {
    return practiceContact.phoneTelHref;
  }

  const normalized = display.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `tel:${normalized.startsWith("+") ? normalized : `+${normalized}`}`;
}

/**
 * Legacy helper for VerifiedOrPlaceholder values.
 * Prefer getVerifiedWhatsAppHref() for the practice WhatsApp channel.
 */
export function getWhatsAppHref(
  whatsapp: VerifiedOrPlaceholder,
): string | null {
  if (isPlaceholder(whatsapp)) {
    return null;
  }

  const display = resolveDisplayValue(whatsapp);
  if (display === practiceContact.whatsappDisplay) {
    return practiceContact.whatsappUrl;
  }

  const digits = display.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  return `https://wa.me/${digits}`;
}
