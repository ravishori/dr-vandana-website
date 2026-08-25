const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PhoneDefaultCountry = "IN" | "AU";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

/**
 * Canonical E.164 mobile normalisation.
 * Default country is IN (practice location) unless the caller supplies another.
 * Rejects malformed / impossible numbers. Does not invent country codes.
 */
export function normalizeMobile(
  input: string,
  defaultCountry: PhoneDefaultCountry = "IN",
): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 32) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) {
      return null;
    }
    if (digits.startsWith("91") && digits.length === 12) {
      return isValidIndianNational(digits.slice(2)) ? `+${digits}` : null;
    }
    if (digits.startsWith("61") && digits.length === 11) {
      return isValidAustralianNational(digits.slice(2)) ? `+${digits}` : null;
    }
    // Other explicit E.164: accept digit length only (8–15) without inventing rules.
    if (/^[1-9]\d{7,14}$/.test(digits)) {
      return `+${digits}`;
    }
    return null;
  }

  if (defaultCountry === "IN") {
    return normalizeIndianMobile(digits);
  }
  if (defaultCountry === "AU") {
    return normalizeAustralianMobile(digits);
  }
  return null;
}

function isValidIndianNational(national: string): boolean {
  return national.length === 10 && /^[6-9]\d{9}$/.test(national);
}

function isValidAustralianNational(national: string): boolean {
  // Mobile: 4xxxxxxxx (9 digits after dropping leading 0).
  return national.length === 9 && /^4\d{8}$/.test(national);
}

function normalizeIndianMobile(digits: string): string | null {
  let national = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  }
  if (!isValidIndianNational(national)) {
    return null;
  }
  return `+91${national}`;
}

function normalizeAustralianMobile(digits: string): string | null {
  let national = digits;
  if (digits.length === 11 && digits.startsWith("61")) {
    national = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    national = digits.slice(1);
  }
  if (!isValidAustralianNational(national)) {
    return null;
  }
  return `+61${national}`;
}

export function formatMobileForStorage(normalized: string): string {
  return normalized;
}
