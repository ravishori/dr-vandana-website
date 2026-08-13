import { redirect } from "next/navigation";

import { practiceLogoutAction } from "@/app/patient/actions";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPracticeSession } from "@/lib/practice/auth-service";
import { getPracticeRepository } from "@/lib/practice/store";

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const session = await getPracticeSession();
  if (!session || session.role !== "PATIENT" || !session.patientId) {
    redirect("/patient/login");
  }
  const repo = await getPracticeRepository();
  const appointments = await repo.listAppointmentsForPatient(session.patientId);
  // Upcoming = active statuses only (force-dynamic server page).
  const upcoming = appointments.filter(
    (item) =>
      !["CANCELLED", "REJECTED", "COMPLETED", "NO_SHOW"].includes(item.status),
  );
  const notifications = await repo.listNotificationsForUser(session.userId);

  return (
    <Section className="pt-10">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1>Welcome, {session.fullName}</h1>
            <p className="text-text-muted mt-2 text-sm">
              Secure patient dashboard · not an emergency service
            </p>
          </div>
          <form action={practiceLogoutAction}>
            <button type="submit" className="text-brand text-sm underline">
              Sign out
            </button>
          </form>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/patient/appointments/new">Request appointment</ButtonLink>
          <ButtonLink href="/patient/appointments" variant="secondary">
            My appointments
          </ButtonLink>
          <ButtonLink href="/patient/consultations" variant="secondary">
            My consultations
          </ButtonLink>
          <ButtonLink href="/patient/documents" variant="secondary">
            My documents
          </ButtonLink>
          <ButtonLink href="/patient/profile" variant="ghost">
            Profile
          </ButtonLink>
        </div>
        <section className="mt-10">
          <h2 className="text-xl">Upcoming</h2>
          <ul className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <li className="text-text-muted text-sm">No upcoming appointments.</li>
            ) : (
              upcoming.map((item) => (
                <li key={item.id} className="border-brand-muted/30 rounded-[var(--radius-lg)] border p-4 text-sm">
                  <p className="font-medium">{item.publicReference}</p>
                  <p>{new Date(item.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
                  <p>Status: {item.status}</p>
                </li>
              ))
            )}
          </ul>
        </section>
        <section className="mt-10">
          <h2 className="text-xl">Notifications</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {notifications.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.subject} · {item.deliveryStatus}
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </Section>
  );
}
