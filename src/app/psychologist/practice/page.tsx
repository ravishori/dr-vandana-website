import { practiceLogoutAction } from "@/app/practice-auth/actions";
import { IdentityShell, identityButtonClassName } from "@/components/identity/IdentityShell";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readSession } from "@/lib/identity/sessions";
import { authorizationService } from "@/lib/identity/authorization";
import { redirect } from "next/navigation";

export default async function PsychologistPracticeHomePage() {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    redirect("/psychologist/practice/login");
  }
  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    redirect("/psychologist/practice/login");
  }
  const principal = await loadPrincipal(identity.ctx, session);
  const access = authorizationService.canAccess(principal, {
    roles: ["PSYCHOLOGIST"],
  });
  if (!access.allowed) {
    redirect("/psychologist/practice/mfa");
  }
  return (
    <IdentityShell kicker="Practice identity" title="Practice identity is active">
      <p>
        Appointment tools are not enabled in this phase. The existing question
        portal remains at /psychologist.
      </p>
      <form action={async () => {
        "use server";
        await practiceLogoutAction("/psychologist/practice/login");
      }}>
        <button type="submit" className={identityButtonClassName}>
          Sign out
        </button>
      </form>
    </IdentityShell>
  );
}
