import { patientLogoutAction } from "@/app/patient/actions";
import { IdentityShell, identityButtonClassName } from "@/components/identity/IdentityShell";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { readSession } from "@/lib/identity/sessions";
import { patientProfiles, users } from "@/lib/identity/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PatientAccountPage() {
  const identity = createAppIdentityContext();
  if (!identity.ok) {
    redirect("/patient/login");
  }
  const session = await readSession(
    identity.ctx,
    await readPracticeSessionCookie(),
  );
  if (!session) {
    redirect("/patient/login");
  }
  const principal = await loadPrincipal(identity.ctx, session);
  if (!principal.roles.includes("PATIENT") || !session.mfaCompleted) {
    redirect("/patient/login");
  }
  const [user] = await identity.ctx.db
    .select({ publicId: users.publicId })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const [profile] = principal.patientProfileId
    ? await identity.ctx.db
        .select({ displayName: patientProfiles.displayName })
        .from(patientProfiles)
        .where(eq(patientProfiles.id, principal.patientProfileId))
        .limit(1)
    : [];

  return (
    <IdentityShell kicker="Patient accounts" title="You are signed in">
      <p>Hello {profile?.displayName ?? "there"}.</p>
      <p>Your public reference is {user?.publicId}.</p>
      <p>
        You can request an appointment at{" "}
        <Link className="underline" href="/patient/appointments/new">
          /patient/appointments/new
        </Link>
        . The public enquiry form at /book-appointment remains available and is
        not converted into an appointment.
      </p>
      <form action={patientLogoutAction}>
        <button type="submit" className={identityButtonClassName}>
          Sign out
        </button>
      </form>
    </IdentityShell>
  );
}
