import { redirect } from "next/navigation";

import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PatientAppointmentsPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT" || !session.patientId) {
    redirect("/patient/login");
  }
  const appointments = await (
    await getPracticeRepository()
  ).listAppointmentsForPatient(session.patientId);

  return (
    <Section className="pt-10">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <h1>My appointments</h1>
          <ButtonLink href="/patient/appointments/new">New request</ButtonLink>
        </div>
        <ul className="mt-8 space-y-3">
          {appointments.map((item) => (
            <li key={item.id} className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm">
              <p className="font-medium">{item.publicReference}</p>
              <p>
                {new Date(item.startsAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </p>
              <p>Status: {item.status}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <ButtonLink href="/patient/dashboard" variant="ghost">
            Back to dashboard
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
