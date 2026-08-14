const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

/**
 * India-oriented mobile normalisation for uniqueness.
 * Does not assume provider-specific email aliases.
 */
export function normalizeMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national = digits;
  if (digits.length === 12 && digits.startsWith("91")) {
    national = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    national = digits.slice(1);
  }
  if (national.length !== 10) {
    return null;
  }
  if (!/^[6-9]/.test(national)) {
    return null;
  }
  return `+91${national}`;
}

export function formatMobileForStorage(normalized: string): string {
  return normalized;
}
