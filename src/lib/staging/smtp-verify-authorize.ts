/**
 * Authorization for staging SMTP verify — server-side only, no redirects.
 * PSYCHOLOGIST (with appointment-management permission) or SUPER_ADMIN.
 * Patients and unauthorized roles are denied.
 */

import { eq } from "drizzle-orm";

import { authorizationService } from "@/lib/identity/authorization";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { users } from "@/lib/identity/schema";
import { readSession } from "@/lib/identity/sessions";

export type SmtpVerifyAuthResult =
  | {
      ok: true;
      userId: string;
      role: "PSYCHOLOGIST" | "SUPER_ADMIN";
    }
  | {
      ok: false;
      reason:
        | "identity_unavailable"
        | "unauthenticated"
        | "mfa_required"
        | "must_change_password"
        | "forbidden";
    };

/**
 * Authoritative operator gate for SMTP verify.
 * Cookie presence alone is never enough.
 */
export async function authorizeSmtpVerifyOperator(): Promise<SmtpVerifyAuthResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, reason: "identity_unavailable" };
  }

  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    return { ok: false, reason: "unauthenticated" };
  }
  if (!session.mfaCompleted) {
    return { ok: false, reason: "mfa_required" };
  }

  const [row] = await identity.ctx.db
    .select({ mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (row?.mustChangePassword) {
    return { ok: false, reason: "must_change_password" };
  }

  const principal = await loadPrincipal(identity.ctx, session);

  const asPsychologist = authorizationService.canAccess(principal, {
    roles: ["PSYCHOLOGIST"],
    permission: "MANAGE_APPOINTMENT_SETTINGS",
  });
  if (asPsychologist.allowed) {
    return { ok: true, userId: principal.userId, role: "PSYCHOLOGIST" };
  }

  const asSuperAdmin = authorizationService.canAccess(principal, {
    roles: ["SUPER_ADMIN"],
  });
  if (asSuperAdmin.allowed) {
    return { ok: true, userId: principal.userId, role: "SUPER_ADMIN" };
  }

  return { ok: false, reason: "forbidden" };
}
