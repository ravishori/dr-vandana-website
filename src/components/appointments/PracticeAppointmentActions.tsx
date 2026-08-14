"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  cancelAppointmentAction,
  completeAppointmentAction,
  confirmAppointmentAction,
  loadRescheduleSlotsAction,
  markNoShowAction,
  rejectAppointmentAction,
  rescheduleAppointmentAction,
} from "@/app/psychologist/practice/appointments/actions";
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

export function PracticeAppointmentActions({
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
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const can = (action: AppointmentAction) => actions.includes(action);

  function run(task: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await task();
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-8 space-y-4">
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {can("CONFIRM") ? (
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={() =>
              run(() => confirmAppointmentAction({ publicId, expectedVersion: version }))
            }
          >
            Confirm
          </button>
        ) : null}
        {can("REJECT") ? (
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={() =>
              run(() => rejectAppointmentAction({ publicId, expectedVersion: version }))
            }
          >
            Decline request
          </button>
        ) : null}
        {can("CANCEL") ? (
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={() =>
              run(() => cancelAppointmentAction({ publicId, expectedVersion: version }))
            }
          >
            Cancel
          </button>
        ) : null}
        {can("COMPLETE") ? (
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={() =>
              run(() => completeAppointmentAction({ publicId, expectedVersion: version }))
            }
          >
            Mark completed
          </button>
        ) : null}
        {can("NO_SHOW") ? (
          <button
            type="button"
            disabled={pending}
            className={identityButtonClassName}
            onClick={() =>
              run(() => markNoShowAction({ publicId, expectedVersion: version }))
            }
          >
            Mark no-show
          </button>
        ) : null}
      </div>
      {can("RESCHEDULE") ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(() =>
              rescheduleAppointmentAction({
                publicId,
                expectedVersion: version,
                requestedStart: String(form.get("requestedStart") ?? ""),
              }),
            );
          }}
        >
          <AppointmentField id="reschedule-date" label="Reschedule date">
            <input
              id="reschedule-date"
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
                const result = await loadRescheduleSlotsAction({ publicId, dateLocal });
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
                setMessage(result.slots.length === 0 ? "No times are available on that date." : null);
              });
            }}
          >
            Show times
          </button>
          {slots.length > 0 ? (
            <AppointmentField id="reschedule-slot" label="New time" required>
              <select
                id="reschedule-slot"
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
            Reschedule
          </button>
        </form>
      ) : null}
    </div>
  );
}
