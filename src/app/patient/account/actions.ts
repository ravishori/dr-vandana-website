"use server";

import { redirect } from "next/navigation";

import { readPracticeSessionCookie } from "@/lib/identity/cookies";
import { loadPrincipal } from "@/lib/identity/principal";
import { createAppIdentityContext } from "@/lib/identity/runtime";
import { readSession } from "@/lib/identity/sessions";
import { setPatientWhatsAppConsent } from "@/lib/notifications/consent";

export async function updateWhatsAppConsentAction(
  formData: FormData,
): Promise<void> {
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
  const optIn = formData.get("optIn") === "true";
  await setPatientWhatsAppConsent(identity.ctx, {
    userId: session.userId,
    optIn,
    source: "patient_account",
  });
  redirect("/patient/account?whatsapp=saved");
}
