import { practiceLogoutAction } from "@/app/practice-auth/actions";
import { IdentityShell, identityButtonClassName } from "@/components/identity/IdentityShell";
import { authorizationService } from "@/lib/identity/authorization";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readSession } from "@/lib/identity/sessions";
import { redirect } from "next/navigation";

export default async function SuperAdminSignedInPage() {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    redirect("/super-admin/login");
  }
  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    redirect("/super-admin/login");
  }
  const principal = await loadPrincipal(identity.ctx, session);
  const access = authorizationService.canAccess(principal, {
    roles: ["SUPER_ADMIN"],
  });
  if (!access.allowed) {
    redirect("/super-admin/mfa");
  }
  return (
    <IdentityShell kicker="Super Admin" title="Configuration is not enabled yet">
      <p>
        Super Admin identity and MFA are active. Practice configuration screens
        are not part of this phase.
      </p>
      <form
        action={async () => {
          "use server";
          await practiceLogoutAction("/super-admin/login");
        }}
      >
        <button type="submit" className={identityButtonClassName}>
          Sign out
        </button>
      </form>
    </IdentityShell>
  );
}
