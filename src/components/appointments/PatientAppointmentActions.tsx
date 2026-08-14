"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  cancelPatientAppointmentAction,
  loadPatientRescheduleSlotsAction,
  requestPatientRescheduleAction,
} from "@/app/patient/appointments/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { identityButtonClassName } from "@/components/identity/IdentityShell";
import type { AppointmentAction } from "@/lib/appointments/state-machine";

function formatSlot(startIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(startIso));
}

export function PatientAppointmentActions({
  publicId,
  version,
  actions,
  timezone,
}: {
  publicId: string;
  version: number;
  actions: AppointmentAction[];
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const canCancel = actions.includes("CANCEL");
  const canRequestReschedule = actions.includes("REQUEST_RESCHEDULE");

  return (
    <div className="mt-8 space-y-6">
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      {canCancel ? (
        <div className="space-y-3">
          {confirmingCancel ? (
            <div role="group" aria-label="Confirm cancellation">
              <p>Are you sure you want to cancel this appointment?</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={pending}
                  className={identityButtonClassName}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await cancelPatientAppointmentAction({
                        publicId,
                        expectedVersion: version,
                      });
                      setMessage(result.message);
                      setConfirmingCancel(false);
                      if (result.ok) {
                        router.refresh();
                      }
                    })
                  }
                >
                  Yes, cancel appointment
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="border-brand-muted/40 inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] border px-5 text-sm"
                  onClick={() => setConfirmingCancel(false)}
                >
                  Keep appointment
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              className={identityButtonClassName}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancel appointment
            </button>
          )}
        </div>
      ) : null}
      {canRequestReschedule ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await requestPatientRescheduleAction({
                publicId,
                expectedVersion: version,
                requestedStart: String(form.get("requestedStart") ?? ""),
              });
              setMessage(result.message);
              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          <p className="text-sm">
            Request a different time. Your current appointment stays until the
            psychologist confirms a new time.
          </p>
          <AppointmentField id="patient-reschedule-date" label="New date">
            <input
              id="patient-reschedule-date"
              name="dateLocal"
              type="date"
              className={appointmentControlClassName}
            />
          </AppointmentField>
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (!form) {
                return;
              }
              const dateLocal = String(new FormData(form).get("dateLocal") ?? "");
              startTransition(async () => {
                const result = await loadPatientRescheduleSlotsAction({
                  publicId,
                  dateLocal,
                });
                if (!result.ok) {
                  setSlots([]);
                  setMessage(result.message);
                  return;
                }
                if (!("slots" in result)) {
                  setSlots([]);
                  return;
                }
                setSlots(result.slots);
                setMessage(
                  result.slots.length === 0
                    ? "No times are available on that date."
                    : null,
                );
              });
            }}
          >
            Show times
          </button>
          {slots.length > 0 ? (
            <AppointmentField id="patient-reschedule-slot" label="New time" required>
              <select
                id="patient-reschedule-slot"
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
            Request new time
          </button>
        </form>
      ) : null}
    </div>
  );
}
