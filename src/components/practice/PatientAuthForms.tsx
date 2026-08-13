"use client";

import { useState, useTransition } from "react";

import { patientLoginAction, patientRegisterAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function PatientRegisterForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <h1>Create patient account</h1>
        <p className="text-text-muted mt-3 text-sm leading-relaxed">
          Registration collects only contact details needed for appointments.
          Please do not submit clinical history here.
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await patientRegisterAction(formData);
              if (result && "ok" in result && !result.ok) {
                setMessage(result.message);
              }
            });
          }}
        >
          <AppointmentField id="fullName" label="Full name" required>
            <input id="fullName" name="fullName" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="email" label="Email" required>
            <input id="email" name="email" type="email" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="mobile" label="Mobile (10 digits)" required>
            <input id="mobile" name="mobile" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="password" label="Password (min 10)" required>
            <input id="password" name="password" type="password" required minLength={10} className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="confirmPassword" label="Confirm password" required>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={10} className={appointmentControlClassName} />
          </AppointmentField>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consentAccepted" required className="mt-1" />
            I agree to the terms of use for this secure portal.
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="privacyAccepted" required className="mt-1" />
            I have read the privacy notice for practice portal information.
          </label>
          {message ? <p className="text-sm" role="alert">{message}</p> : null}
          <button type="submit" disabled={pending} className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm disabled:opacity-60">
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm">
          Already registered? <ButtonLink href="/patient/login" variant="ghost" className="px-0">Sign in</ButtonLink>
        </p>
      </Container>
    </Section>
  );
}

export function PatientLoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <h1>Patient / psychologist sign in</h1>
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await patientLoginAction(formData);
              if (result && "ok" in result && !result.ok) {
                setMessage(result.message);
              }
            });
          }}
        >
          <AppointmentField id="emailOrMobile" label="Email or mobile" required>
            <input id="emailOrMobile" name="emailOrMobile" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="password" label="Password" required>
            <input id="password" name="password" type="password" required className={appointmentControlClassName} />
          </AppointmentField>
          <AppointmentField id="totp" label="Authenticator code (psychologist MFA)">
            <input id="totp" name="totp" className={appointmentControlClassName} />
          </AppointmentField>
          {message ? <p className="text-sm" role="alert">{message}</p> : null}
          <button type="submit" disabled={pending} className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm disabled:opacity-60">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm">
          <ButtonLink href="/patient/forgot-password" variant="ghost" className="px-0">
            Forgot password
          </ButtonLink>
        </p>
      </Container>
    </Section>
  );
}
