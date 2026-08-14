"use client";

import { useState, useTransition } from "react";

import { registerPatientAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  IdentityShell,
  identityButtonClassName,
} from "@/components/identity/IdentityShell";

export function PatientRegisterForm({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!enabled) {
    return (
      <IdentityShell kicker="Patient accounts" title="Registration is not available yet">
        <p>
          Patient accounts are not enabled for this environment. The public
          website, appointment enquiry form, and existing services remain
          available.
        </p>
      </IdentityShell>
    );
  }

  return (
    <IdentityShell kicker="Patient accounts" title="Create your account">
      <p>
        Use this form only to create a non-clinical account. Do not include
        medical history, diagnoses, or session details.
      </p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await registerPatientAction({
              displayName: String(form.get("displayName") ?? ""),
              email: String(form.get("email") ?? ""),
              mobile: String(form.get("mobile") ?? ""),
              password: String(form.get("password") ?? ""),
              passwordConfirm: String(form.get("passwordConfirm") ?? ""),
              acceptedTerms: form.get("acceptedTerms") === "on",
            });
            setFieldErrors(result.ok ? {} : (result.fieldErrors ?? {}));
            setMessage(result.message ?? (result.ok ? "Please check your email." : null));
          });
        }}
      >
        {message ? (
          <p className="text-sm" role="status">
            {message}
          </p>
        ) : null}
        <AppointmentField
          id="displayName"
          label="Name"
          required
          error={fieldErrors.displayName}
        >
          <input
            id="displayName"
            name="displayName"
            autoComplete="name"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id="email" label="Email" required error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField
          id="mobile"
          label="Mobile number"
          required
          helperText="Indian mobile number. We will send a verification code after email confirmation."
          error={fieldErrors.mobile}
        >
          <input
            id="mobile"
            name="mobile"
            type="tel"
            autoComplete="tel"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField
          id="password"
          label="Password"
          required
          helperText="At least 12 characters. Avoid common passwords."
          error={fieldErrors.password}
        >
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField
          id="passwordConfirm"
          label="Confirm password"
          required
          error={fieldErrors.passwordConfirm}
        >
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="acceptedTerms"
            className="mt-1"
            required
          />
          <span>
            I have read the{" "}
            <a className="underline" href="/terms">
              Terms
            </a>{" "}
            and{" "}
            <a className="underline" href="/privacy-policy">
              Privacy Policy
            </a>
            . I understand this account is not a clinical record.
          </span>
        </label>
        {fieldErrors.acceptedTerms ? (
          <p className="text-sm" role="alert">
            {fieldErrors.acceptedTerms}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Submitting…" : "Create account"}
        </button>
      </form>
    </IdentityShell>
  );
}
