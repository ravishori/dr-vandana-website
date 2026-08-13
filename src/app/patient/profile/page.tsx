import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT" || !session.patientId) {
    redirect("/patient/login");
  }
  const repo = await getPracticeRepository();
  const patient = await repo.getPatientById(session.patientId);
  const user = await repo.getUserById(session.userId);

  return (
    <Section className="pt-10">
      <Container className="max-w-xl">
        <h1>My profile</h1>
        <dl className="mt-6 space-y-3 text-sm">
          <div>
            <dt className="text-text-muted">Patient ID</dt>
            <dd className="font-medium">{patient?.publicId}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Name</dt>
            <dd>{user?.fullName}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd>
              {user?.email}{" "}
              {user?.emailVerifiedAt ? "(verified)" : "(unverified)"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Mobile</dt>
            <dd>
              {user?.mobile}{" "}
              {user?.mobileVerifiedAt ? "(verified)" : "(unverified)"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Notification preferences</dt>
            <dd>
              Email: {patient?.notificationEmail ? "on" : "off"} · WhatsApp:{" "}
              {patient?.notificationWhatsApp ? "on" : "off"}
            </dd>
          </div>
        </dl>
        <div className="mt-6">
          <ButtonLink href="/patient/dashboard" variant="ghost">
            Back
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
