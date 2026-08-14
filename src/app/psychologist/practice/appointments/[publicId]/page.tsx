import Link from "next/link";
import { notFound } from "next/navigation";

import { loadPracticeAppointmentPage } from "@/app/psychologist/practice/appointments/actions";
import { PracticeAppointmentActions } from "@/components/appointments/PracticeAppointmentActions";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointments/constants";

function formatWhen(startIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(startIso));
}

export default async function PracticeAppointmentDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const result = await loadPracticeAppointmentPage(publicId);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      notFound();
    }
    return (
      <Section className="pt-12 md:pt-16">
        <Container>
          <h1>Appointment</h1>
          <p>{result.message}</p>
        </Container>
      </Section>
    );
  }
  const appointment = result.appointment;
  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-3xl">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Appointment
        </p>
        <h1 className="mt-4">{appointment.publicId}</h1>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Patient</dt>
            <dd>{appointment.patient.displayName}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Patient reference</dt>
            <dd>{appointment.patient.publicId}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Contact</dt>
            <dd>{appointment.patientEmail}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Type</dt>
            <dd>{appointment.appointmentType.name}</dd>
          </div>
          <div>
            <dt className="text-text-muted">When</dt>
            <dd>{formatWhen(appointment.start, appointment.timezone)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Ends</dt>
            <dd>{formatWhen(appointment.end, appointment.timezone)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Status</dt>
            <dd>{APPOINTMENT_STATUS_LABELS[appointment.status]}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Created</dt>
            <dd>{formatWhen(appointment.createdAt, appointment.timezone)}</dd>
          </div>
        </dl>
        <PracticeAppointmentActions
          publicId={appointment.publicId}
          version={appointment.version}
          actions={appointment.actions}
          timezone={appointment.timezone}
        />
        <h2 className="mt-10 text-lg">History</h2>
        <ol className="mt-4 space-y-3 text-sm">
          {appointment.history.map((event) => (
            <li key={`${event.eventType}-${event.createdAt}`}>
              <p>
                {event.eventType.replaceAll("_", " ")}
                {event.actorRole ? ` · ${event.actorRole}` : ""}
              </p>
              <p className="text-text-muted">
                {formatWhen(event.createdAt, appointment.timezone)}
              </p>
              {event.metadata && Object.keys(event.metadata).length > 0 ? (
                <p className="text-text-muted">
                  {Object.entries(event.metadata)
                    .filter(([key]) =>
                      [
                        "fromStatus",
                        "toStatus",
                        "cancelledBy",
                        "reasonCode",
                        "reason",
                        "oldStart",
                        "newStart",
                      ].includes(key),
                    )
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm">
          <Link className="underline" href="/psychologist/practice/appointments">
            Back to appointments
          </Link>
        </p>
      </Container>
    </Section>
  );
}
