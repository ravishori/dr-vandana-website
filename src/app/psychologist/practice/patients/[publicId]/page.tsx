import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPracticePatientPage } from "@/app/psychologist/practice/actions";
import { PracticeNav } from "@/components/practice/PracticeNav";
import { PracticePatientEditForm } from "@/components/practice/PracticePatientEditForm";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointments/constants";
import type { AppointmentStatus } from "@/lib/appointments/constants";

function formatWhen(startIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(startIso));
}

export default async function PracticePatientDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const result = await loadPracticePatientPage(publicId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Patient</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }
  const patient = result.patient;

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <PracticeNav current="/psychologist/practice/patients" />
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Patient
        </p>
        <h1 className="mt-4">{patient.displayName}</h1>
        <p className="text-text-muted mt-2 text-sm">{patient.publicId}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Account status</dt>
            <dd>{patient.status}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Registered</dt>
            <dd>
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
              }).format(new Date(patient.registeredAt))}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Email</dt>
            <dd>{patient.email}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Mobile</dt>
            <dd>{patient.mobileNumber ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Email verified</dt>
            <dd>{patient.emailVerified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Mobile verified</dt>
            <dd>{patient.mobileVerified ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-text-muted">WhatsApp notifications</dt>
            <dd>
              {patient.whatsappNotificationsEnabled ? "Opted in" : "Off"}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Appointments with practice</dt>
            <dd>{patient.appointmentCount}</dd>
          </div>
        </dl>
        <h2 className="mt-10 text-lg">Appointment history</h2>
        {patient.recentAppointments.length === 0 ? (
          <p className="mt-3 text-sm">No appointments on file.</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {patient.recentAppointments.map((item) => (
              <li key={item.publicId} className="border-brand-muted/20 border-b pb-3">
                <Link
                  className="underline"
                  href={`/psychologist/practice/appointments/${item.publicId}`}
                >
                  {item.publicId}
                </Link>
                <span className="text-text-muted">
                  {" "}
                  ·{" "}
                  {APPOINTMENT_STATUS_LABELS[item.status as AppointmentStatus] ??
                    item.status}{" "}
                  · {formatWhen(item.startsAt, item.timezone)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <PracticePatientEditForm
          publicId={patient.publicId}
          displayName={patient.displayName}
          status={patient.status}
        />
        <p className="mt-8 text-sm">
          <Link className="underline" href="/psychologist/practice/patients">
            Back to directory
          </Link>
        </p>
      </Container>
    </Section>
  );
}
