"use client";

import { useActionState } from "react";

import { updatePracticePatientAction } from "@/app/psychologist/practice/actions";
import { identityButtonClassName } from "@/components/identity/IdentityShell";
import { PRACTICE_MANAGED_STATUSES } from "@/lib/practice/patients";
import type { UserStatus } from "@/lib/identity/constants";

const initialState = { ok: false, message: "" };

export function PracticePatientEditForm({
  publicId,
  displayName,
  status,
}: {
  publicId: string;
  displayName: string;
  status: UserStatus;
}) {
  const [state, action, pending] = useActionState(
    updatePracticePatientAction,
    initialState,
  );
  const statusDefault = (
    PRACTICE_MANAGED_STATUSES as readonly string[]
  ).includes(status)
    ? status
    : "ACTIVE";

  return (
    <form action={action} className="mt-8 space-y-4 border-brand-muted/30 border-t pt-8 text-sm">
      <h2 className="text-lg font-medium">Update profile</h2>
      <p className="text-text-muted">
        Non-clinical fields only. Email and mobile are not changed here.
      </p>
      {state.message ? (
        <p className="text-sm" role="status">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="patientPublicId" value={publicId} />
      <label className="flex flex-col gap-1">
        Display name
        <input
          name="displayName"
          required
          minLength={2}
          maxLength={80}
          defaultValue={displayName}
          className="border-brand-muted/40 max-w-md rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        Account status
        <select
          name="status"
          defaultValue={statusDefault}
          className="border-brand-muted/40 max-w-xs rounded border px-3 py-2"
        >
          {PRACTICE_MANAGED_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <p className="text-text-muted text-xs">
        Schema statuses: ACTIVE (active), SUSPENDED / DISABLED (inactive). There
        is no separate ARCHIVED status in the current database.
      </p>
      <button
        type="submit"
        className={identityButtonClassName}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save patient profile"}
      </button>
    </form>
  );
}
