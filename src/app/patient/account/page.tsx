import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateWhatsAppConsentAction } from "@/app/patient/account/actions";
import { IdentityShell, identityButtonClassName } from "@/components/identity/IdentityShell";
import { patientLogoutAction } from "@/app/patient/actions";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { readSession } from "@/lib/identity/sessions";
import { patientProfiles, users } from "@/lib/identity/schema";
import { isWhatsAppConsentActive } from "@/lib/notifications/consent";

export default async function PatientAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ whatsapp?: string }>;
}) {
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
  const params = await searchParams;
  const [user] = await identity.ctx.db
    .select({ publicId: users.publicId })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const [profile] = principal.patientProfileId
    ? await identity.ctx.db
        .select({
          displayName: patientProfiles.displayName,
          whatsappNotificationsEnabled: patientProfiles.whatsappNotificationsEnabled,
          whatsappOptedInAt: patientProfiles.whatsappOptedInAt,
          whatsappOptedOutAt: patientProfiles.whatsappOptedOutAt,
        })
        .from(patientProfiles)
        .where(eq(patientProfiles.id, principal.patientProfileId))
        .limit(1)
    : [];
  const whatsappEnabled = profile
    ? isWhatsAppConsentActive({
        enabled: profile.whatsappNotificationsEnabled,
        optedInAt: profile.whatsappOptedInAt,
        optedOutAt: profile.whatsappOptedOutAt,
      })
    : false;

  return (
    <IdentityShell kicker="Patient accounts" title="You are signed in">
      <p>Hello {profile?.displayName ?? "there"}.</p>
      <p>Your public reference is {user?.publicId}.</p>
      <p>
        You can view your appointments at{" "}
        <Link className="underline" href="/patient/appointments">
          /patient/appointments
        </Link>
        {" "}or request a new time at{" "}
        <Link className="underline" href="/patient/appointments/new">
          /patient/appointments/new
        </Link>
        . The public enquiry form at /book-appointment remains available and is
        not converted into an appointment.
      </p>
      <form action={updateWhatsAppConsentAction} className="space-y-3">
        <p className="font-medium">Appointment WhatsApp notifications</p>
        <p>
          This option covers appointment-related messages only. It is not
          marketing or promotional messaging. Production WhatsApp delivery
          stays disabled until the practice activates it.
        </p>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="optIn"
            value="true"
            defaultChecked={whatsappEnabled}
            className="mt-1"
          />
          <span>
            I agree to receive appointment-related notifications from Dr. Vandana
            through WhatsApp.
          </span>
        </label>
        {params.whatsapp === "saved" ? (
          <p>Your WhatsApp appointment-notification preference was saved.</p>
        ) : null}
        <button type="submit" className={identityButtonClassName}>
          Save WhatsApp preference
        </button>
      </form>
      <form action={patientLogoutAction}>
        <button type="submit" className={identityButtonClassName}>
          Sign out
        </button>
      </form>
    </IdentityShell>
  );
}
