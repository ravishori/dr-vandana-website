"use client";

import { useState, useTransition } from "react";

import { forgotPasswordAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section className="pt-12">
      <Container className="max-w-lg">
        <h1>Forgot password</h1>
        <form
          className="mt-8 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await forgotPasswordAction(formData);
              setMessage(result.message);
            });
          }}
        >
          <AppointmentField id="email" label="Email">
            <input id="email" name="email" type="email" required className={appointmentControlClassName} />
          </AppointmentField>
          {message ? <p className="text-sm" role="status">{message}</p> : null}
          <button type="submit" disabled={pending} className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm">
            Send reset link
          </button>
        </form>
      </Container>
    </Section>
  );
}
