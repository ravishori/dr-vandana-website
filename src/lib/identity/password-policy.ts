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

export type PasswordPolicyResult =
  | { ok: true }
  | { ok: false; message: string };

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
