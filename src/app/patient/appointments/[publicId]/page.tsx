import Link from "next/link";

import { loadPatientAppointmentPage } from "@/app/patient/appointments/actions";
import { PatientAppointmentActions } from "@/components/appointments/PatientAppointmentActions";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

function formatWhen(iso: string, timezone: string, withDate: boolean): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: withDate ? "full" : undefined,
    timeStyle: "short",
    hour12: false,
  }).format(new Date(iso));
}

function formatDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    dateStyle: "full",
  }).format(new Date(iso));
}

export default async function PatientAppointmentDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const result = await loadPatientAppointmentPage(publicId);
  if (!result.ok) {
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
        <p className="mt-3 text-sm" aria-label={`Status: ${appointment.statusLabel}`}>
          {appointment.statusLabel}
        </p>
        {appointment.pendingExplanation ? (
          <p className="mt-3 text-sm">{appointment.pendingExplanation}</p>
        ) : null}
        {appointment.status === "RESCHEDULE_REQUESTED" ? (
          <p className="mt-3 text-sm">
            Your reschedule request is awaiting confirmation. The current time
            below still applies until a new time is confirmed.
          </p>
        ) : null}
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Type</dt>
            <dd>{appointment.appointmentType.name}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Date</dt>
            <dd>{formatDate(appointment.start, appointment.timezone)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Starts</dt>
            <dd>
              {formatWhen(appointment.start, appointment.timezone, false)} IST
              (Asia/Kolkata)
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Ends</dt>
            <dd>
              {formatWhen(appointment.end, appointment.timezone, false)} IST
              (Asia/Kolkata)
            </dd>
          </div>
          <div>
            <dt className="text-text-muted">Requested</dt>
            <dd>{formatWhen(appointment.createdAt, appointment.timezone, true)}</dd>
          </div>
        </dl>
        {appointment.proposedStart && appointment.proposedEnd ? (
          <p className="mt-4 text-sm">
            Requested new time:{" "}
            {formatWhen(appointment.proposedStart, appointment.timezone, true)}–
            {formatWhen(appointment.proposedEnd, appointment.timezone, false)}
          </p>
        ) : null}
        <PatientAppointmentActions
          publicId={appointment.publicId}
          version={appointment.version}
          actions={appointment.actions}
          timezone={appointment.timezone}
        />
        <h2 className="mt-10 text-lg">Updates</h2>
        {appointment.history.length === 0 ? (
          <p className="mt-3 text-sm">No updates yet.</p>
        ) : (
          <ol className="mt-4 space-y-3 text-sm">
            {appointment.history.map((event) => (
              <li key={`${event.label}-${event.createdAt}`}>
                <p>
                  {event.label}
                  {event.actorLabel ? ` · ${event.actorLabel}` : ""}
                </p>
                <p className="text-text-muted">
                  {formatWhen(event.createdAt, appointment.timezone, true)}
                </p>
              </li>
            ))}
          </ol>
        )}
        <p className="text-text-muted mt-8 text-sm">
          Appointment updates may be emailed when your email is verified.
          WhatsApp appointment messages require explicit opt-in and remain
          disabled until the practice activates them.
        </p>
        <p className="mt-6 text-sm">
          <Link className="underline" href="/patient/appointments">
            Back to appointments
          </Link>
        </p>
      </Container>
    </Section>
  );
}
