const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "password1234",
  "12345678",
  "1234567890",
  "qwerty123",
  "letmein1234",
  "welcome1234",
  "admin123456",
  "iloveyou123",
  "monkey12345",
  "dragon12345",
  "sunshine123",
  "princess123",
  "qwertyuiop",
  "passw0rd1234",
]);

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
/** Provisional passwords are temporary and require must_change_password=true. */
export const PROVISIONAL_PASSWORD_MIN_LENGTH = 1;

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Full password policy for lasting credentials.
 * Provisional temporary passwords must use evaluateProvisionalPasswordPolicy
 * and set users.must_change_password = true.
 */
export function evaluatePasswordPolicy(
  password: string,
  email?: string,
): PasswordPolicyResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Use a password of at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: "That password is too long.",
    };
  }
  if (/\s/.test(password)) {
    return {
      ok: false,
      message: "Passwords cannot contain spaces.",
    };
  }
  const normalized = password.toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) {
    return {
      ok: false,
      message: "Please choose a less common password.",
    };
  }
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && normalized.includes(local)) {
    return {
      ok: false,
      message: "Passwords should not include your email address.",
    };
  }
  return { ok: true };
}

/**
 * Allows a short temporary provisioning password only when the account
 * will be forced to change it before portal use.
 */
export function evaluateProvisionalPasswordPolicy(
  password: string,
): PasswordPolicyResult {
  if (password.length < PROVISIONAL_PASSWORD_MIN_LENGTH) {
    return { ok: false, message: "A temporary password is required." };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false, message: "That password is too long." };
  }
  if (/\s/.test(password)) {
    return { ok: false, message: "Passwords cannot contain spaces." };
  }
  return { ok: true };
}
