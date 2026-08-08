import {
  isPlaceholder,
  resolveDisplayValue,
  type VerifiedOrPlaceholder,
} from "@/types/site";

export const WHATSAPP_ENQUIRY_MESSAGE =
  "Hello Dr. Vandana, I would like to enquire about a psychological counselling appointment.";

export function getPhoneHref(phone: VerifiedOrPlaceholder): string | null {
  if (isPlaceholder(phone)) {
    return null;
  }

  const normalized = resolveDisplayValue(phone).replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `tel:${normalized}`;
}

export function getWhatsAppHref(
  whatsapp: VerifiedOrPlaceholder,
): string | null {
  if (isPlaceholder(whatsapp)) {
    return null;
  }

  const digits = resolveDisplayValue(whatsapp).replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  const text = encodeURIComponent(WHATSAPP_ENQUIRY_MESSAGE);
  return `https://wa.me/${digits}?text=${text}`;
}
