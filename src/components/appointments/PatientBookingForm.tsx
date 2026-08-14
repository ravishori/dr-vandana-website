"use client";

import { useState, useTransition } from "react";

import {
  loadBookingSlotsAction,
  requestAppointmentAction,
} from "@/app/patient/appointments/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  IdentityShell,
  identityButtonClassName,
} from "@/components/identity/IdentityShell";

type AppointmentTypeOption = {
  publicId: string;
  name: string;
  durationMinutes: number;
};

type SlotOption = { start: string; end: string };

function formatSlot(startIso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startIso));
}

export function PatientBookingForm({
  appointmentTypes,
  todayLocal,
  idempotencyKey,
}: {
  appointmentTypes: AppointmentTypeOption[];
  todayLocal: string;
  idempotencyKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [confirmation, setConfirmation] = useState<{
    publicId: string;
    date: string;
    start: string;
    end: string;
    timezone: string;
    status: string;
  } | null>(null);

  if (confirmation) {
    return (
      <IdentityShell
        kicker="Appointments"
        title="Appointment request recorded"
        wide
      >
        <p>{message}</p>
        <p>Reference: {confirmation.publicId}</p>
        <p>
          {confirmation.date} {formatSlot(confirmation.start, confirmation.timezone)}
          –{formatSlot(confirmation.end, confirmation.timezone)} ({confirmation.timezone})
        </p>
        <p>Status: {confirmation.status}</p>
        <p>No email, WhatsApp, or SMS notification is sent in this phase.</p>
      </IdentityShell>
    );
  }

  return (
    <IdentityShell kicker="Appointments" title="Request an appointment" wide>
      <p>
        Choose a type and time. The server re-checks availability when you submit.
        The public enquiry form at /book-appointment remains available.
      </p>
      {appointmentTypes.length === 0 ? (
        <p>Appointment types are not available yet.</p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const appointmentTypePublicId = String(
              form.get("appointmentTypePublicId") ?? "",
            );
            const requestedStart = String(form.get("requestedStart") ?? "");
            startTransition(async () => {
              const result = await requestAppointmentAction({
                appointmentTypePublicId,
                requestedStart,
                idempotencyKey,
              });
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              setMessage(result.message);
              setConfirmation(result.appointment);
            });
          }}
        >
          {message ? (
            <p className="text-sm" role="status">
              {message}
            </p>
          ) : null}
          <AppointmentField id="appointment-type" label="Appointment type" required>
            <select
              id="appointment-type"
              name="appointmentTypePublicId"
              required
              className={appointmentControlClassName}
              defaultValue={appointmentTypes[0]?.publicId}
            >
              {appointmentTypes.map((type) => (
                <option key={type.publicId} value={type.publicId}>
                  {type.name} ({type.durationMinutes} minutes)
                </option>
              ))}
            </select>
          </AppointmentField>
          <AppointmentField id="appointment-date" label="Date" required>
            <input
              id="appointment-date"
              name="dateLocal"
              type="date"
              required
              min={todayLocal}
              defaultValue={todayLocal}
              className={appointmentControlClassName}
            />
          </AppointmentField>
          <button
            type="button"
            className={identityButtonClassName}
            disabled={pending}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) {
                return;
              }
              const data = new FormData(form);
              startTransition(async () => {
                const result = await loadBookingSlotsAction({
                  appointmentTypePublicId: String(
                    data.get("appointmentTypePublicId") ?? "",
                  ),
                  dateLocal: String(data.get("dateLocal") ?? ""),
                });
                if (!result.ok) {
                  setSlots([]);
                  setMessage(result.message);
                  return;
                }
                setTimezone(result.timezone);
                setSlots(result.slots);
                setMessage(
                  result.slots.length === 0
                    ? "No times are available on that date."
                    : null,
                );
              });
            }}
          >
            {pending ? "Loading…" : "Show available times"}
          </button>
          {slots.length > 0 ? (
            <AppointmentField id="appointment-slot" label="Time" required>
              <select
                id="appointment-slot"
                name="requestedStart"
                required
                className={appointmentControlClassName}
              >
                {slots.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {formatSlot(slot.start, timezone)} – {formatSlot(slot.end, timezone)}
                  </option>
                ))}
              </select>
            </AppointmentField>
          ) : null}
          <button
            type="submit"
            disabled={pending || slots.length === 0}
            className={identityButtonClassName}
          >
            {pending ? "Submitting…" : "Request appointment"}
          </button>
        </form>
      )}
    </IdentityShell>
  );
}
