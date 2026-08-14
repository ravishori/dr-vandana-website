import Link from "next/link";

import { PATIENT_STATUS_LABELS } from "@/lib/appointments/constants";
import type { PatientAppointmentListItem } from "@/lib/appointments/patient-portal";

function formatDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function PatientAppointmentCard({
  appointment,
}: {
  appointment: PatientAppointmentListItem;
}) {
  const statusLabel =
    appointment.statusLabel || PATIENT_STATUS_LABELS[appointment.status];
  return (
    <article className="border-brand-muted/30 rounded-[var(--radius-md)] border p-4">
      <p className="text-text-muted text-xs font-medium tracking-[0.12em] uppercase">
        {appointment.publicId}
      </p>
      <h3 className="mt-2 text-base font-medium">{appointment.appointmentType.name}</h3>
      <p className="mt-2 text-sm">
        {formatDate(appointment.start, appointment.timezone)}
      </p>
      <p className="text-sm">
        {formatTime(appointment.start, appointment.timezone)}–
        {formatTime(appointment.end, appointment.timezone)}{" "}
        <span className="text-text-muted">IST (Asia/Kolkata)</span>
      </p>
      <p className="mt-3 text-sm" aria-label={`Status: ${statusLabel}`}>
        {statusLabel}
      </p>
      {appointment.status === "PENDING" ? (
        <p className="text-text-muted mt-2 text-sm">
          This is a request. It is not a confirmed appointment.
        </p>
      ) : null}
      <p className="mt-4">
        <Link
          className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          href={`/patient/appointments/${appointment.publicId}`}
        >
          View details
          {appointment.actions.length > 0 ? " and actions" : ""}
        </Link>
      </p>
    </article>
  );
}
