import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { authorizationService } from "@/lib/identity/authorization";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { users } from "@/lib/identity/schema";
import { readSession } from "@/lib/identity/sessions";

export type PracticeSessionLoadResult =
  | {
      ok: true;
      ctx: IdentityContext;
      principal: AuthorizationPrincipal;
    }
  | { ok: false; message: string };

/**
 * Authoritative practice psychologist session gate for Server Actions / RSC.
 * Cookie presence alone is never enough — validates DB session, MFA completion,
 * forced password change, role, and appointment-management permission.
 */
export async function loadAuthorizedPracticeSession(): Promise<PracticeSessionLoadResult> {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    return { ok: false, message: "Please sign in to continue." };
  }
  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    return { ok: false, message: "Please sign in to continue." };
  }
  if (!session.mfaCompleted) {
    redirect("/psychologist/practice/mfa");
  }
  const [row] = await identity.ctx.db
    .select({ mustChangePassword: users.mustChangePassword })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (row?.mustChangePassword) {
    redirect("/psychologist/practice/change-password");
  }
  const principal = await loadPrincipal(identity.ctx, session);
  const access = authorizationService.canAccess(principal, {
    roles: ["PSYCHOLOGIST"],
    permission: "MANAGE_APPOINTMENT_SETTINGS",
  });
  if (!access.allowed) {
    return { ok: false, message: "You do not have access to that." };
  }
  return { ok: true, ctx: identity.ctx, principal };
}

export async function requireAuthorizedPracticeSession() {
  const loaded = await loadAuthorizedPracticeSession();
  if (!loaded.ok) {
    redirect("/psychologist/practice/login");
  }
  return loaded;
}
