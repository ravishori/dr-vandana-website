"use client";

import { useActionState } from "react";

import { savePracticeSettingsAction } from "@/app/psychologist/practice/actions";
import { practiceDayLabel } from "@/lib/practice/settings";
import type { PracticeSettingsView } from "@/lib/practice/settings";
import { identityButtonClassName } from "@/components/identity/IdentityShell";

const initialState = { ok: false, message: "" };

export function PracticeSettingsForm({
  settings,
}: {
  settings: PracticeSettingsView;
}) {
  const [state, action, pending] = useActionState(
    savePracticeSettingsAction,
    initialState,
  );
  const hoursByDay = new Map(
    settings.hours.map((hour) => [hour.dayOfWeek, hour]),
  );

  return (
    <form action={action} className="mt-8 space-y-10 text-sm">
      {state.message ? (
        <p className="text-sm" role="status">
          {state.message}
        </p>
      ) : null}
      <fieldset className="space-y-4">
        <legend className="text-base font-medium">Booking rules</legend>
        <p className="text-text-muted">Timezone: {settings.timezone}</p>
        <label className="flex flex-col gap-1">
          Slot granularity (minutes)
          <input
            name="slotGranularityMinutes"
            type="number"
            min={5}
            max={120}
            required
            defaultValue={settings.slotGranularityMinutes ?? 30}
            className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Minimum notice (minutes)
          <input
            name="minimumNoticeMinutes"
            type="number"
            min={0}
            max={10080}
            required
            defaultValue={settings.minimumNoticeMinutes ?? 120}
            className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Maximum advance (days)
          <input
            name="maximumAdvanceDays"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={settings.maximumAdvanceDays ?? 60}
            className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Cancellation minimum notice (minutes)
          <input
            name="cancellationMinimumNoticeMinutes"
            type="number"
            min={0}
            max={10080}
            required
            defaultValue={settings.cancellationMinimumNoticeMinutes ?? 1440}
            className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-medium">Weekly hours</legend>
        <div className="space-y-3">
          {Array.from({ length: 7 }, (_, index) => {
            const day = index + 1;
            const hour = hoursByDay.get(day);
            return (
              <div
                key={day}
                className="border-brand-muted/25 grid gap-2 rounded border p-3 sm:grid-cols-[8rem_auto_auto_auto] sm:items-center"
              >
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`hourActive_${day}`}
                    defaultChecked={hour?.active ?? false}
                  />
                  {practiceDayLabel(day)}
                </label>
                <label className="flex flex-col gap-1">
                  Opens
                  <input
                    type="time"
                    name={`opens_${day}`}
                    defaultValue={hour?.opensLocal ?? "09:00"}
                    className="border-brand-muted/40 rounded border px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  Closes
                  <input
                    type="time"
                    name={`closes_${day}`}
                    defaultValue={hour?.closesLocal ?? "17:00"}
                    className="border-brand-muted/40 rounded border px-2 py-1"
                  />
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-medium">Appointment types</legend>
        {settings.appointmentTypes.length === 0 ? (
          <p className="text-text-muted">No appointment types yet.</p>
        ) : (
          <ul className="space-y-2">
            {settings.appointmentTypes.map((type) => (
              <li key={type.publicId} className="border-brand-muted/20 border-b pb-2">
                <strong>{type.name}</strong> · {type.durationMinutes} min ·{" "}
                {type.active ? "Active" : "Inactive"} · {type.publicId}
              </li>
            ))}
          </ul>
        )}
        <p className="text-text-muted pt-2">Add a new type (optional)</p>
        <label className="flex flex-col gap-1">
          Name
          <input
            name="newTypeName"
            maxLength={80}
            className="border-brand-muted/40 max-w-md rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Description
          <input
            name="newTypeDescription"
            maxLength={300}
            className="border-brand-muted/40 max-w-md rounded border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Duration (minutes)
          <input
            name="newTypeDuration"
            type="number"
            min={15}
            max={240}
            className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            Buffer before
            <input
              name="newTypeBufferBefore"
              type="number"
              min={0}
              max={60}
              defaultValue={0}
              className="border-brand-muted/40 max-w-[8rem] rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            Buffer after
            <input
              name="newTypeBufferAfter"
              type="number"
              min={0}
              max={60}
              defaultValue={0}
              className="border-brand-muted/40 max-w-[8rem] rounded border px-3 py-2"
            />
          </label>
        </div>
      </fieldset>

      <button
        type="submit"
        className={identityButtonClassName}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
