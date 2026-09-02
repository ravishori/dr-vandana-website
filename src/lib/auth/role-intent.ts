/**
 * Login role selection is a UX preference only.
 *
 * CRITICAL SECURITY:
 * - The selected role / intent MUST NEVER be treated as authorization.
 * - A client must never access psychologist functionality by choosing
 *   "Psychologist" in the UI or by manipulating query params / request bodies.
 * - When authentication is implemented, the server MUST load the authenticated
 *   user's role from the session or database and enforce access independently
 *   of any client-selected intent.
 * - Password hashing and session verification belong exclusively on the server.
 */

export type LoginIntent = "psychologist" | "client";

export const LOGIN_INTENTS = ["psychologist", "client"] as const;

export function isLoginIntent(value: unknown): value is LoginIntent {
  return value === "psychologist" || value === "client";
}

export function parseLoginIntent(value: string | null | undefined): LoginIntent | null {
  if (!value) {
    return null;
  }
  return isLoginIntent(value) ? value : null;
}

/**
 * Intentionally does not grant access. Client-selected intent is ignored for
 * authorization decisions. Call this from any future auth gate to keep the
 * boundary explicit during early UI wiring.
 */
export function resolveAuthorizedRoleFromSession(sessionRole: string | null | undefined): string | null {
  // Only a verified session/database role may authorize. Client intent is never read here.
  if (!sessionRole) {
    return null;
  }
  return sessionRole;
}

export const LOGIN_SECURITY_NOTICE =
  "Selecting Psychologist or Client here only helps you continue to the right sign-in screen. Access is granted only after secure authentication verifies your account role.";
