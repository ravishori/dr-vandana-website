"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { resetPasswordAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function ResetPasswordClient() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <h1>Reset password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          formData.set("token", token);
          startTransition(async () => {
            const result = await resetPasswordAction(formData);
            setMessage(
              result.ok ? "Password updated. Please sign in." : result.message,
            );
          });
        }}
      >
        <AppointmentField id="password" label="New password">
          <input
            id="password"
            name="password"
            type="password"
            minLength={10}
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        {message ? (
          <p className="text-sm" role="status">
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm"
        >
          Update password
        </button>
      </form>
      <div className="mt-4">
        <ButtonLink href="/patient/login" variant="ghost">
          Sign in
        </ButtonLink>
      </div>
    </>
  );
}
