"use client";

import { useState, useTransition } from "react";

import { psychologistLoginAction } from "@/app/psychologist/login/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export function PsychologistLoginForm({ from }: { from?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section className="pt-12 md:pt-16">
      <Container className="max-w-md">
        <p className="text-text-muted text-sm font-medium tracking-[0.18em] uppercase">
          Secure access
        </p>
        <h1 className="mt-4">Psychologist Portal</h1>
        <p className="mt-4 text-sm leading-relaxed">
          Sign in to review private question submissions. This area is for
          authorised practice use only.
        </p>
        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await psychologistLoginAction({
                email,
                password,
                from,
              });
              if (result && !result.success) {
                setMessage(result.message);
              }
            });
          }}
        >
          {message ? (
            <p className="text-sm" role="alert">
              {message}
            </p>
          ) : null}
          <AppointmentField id="portal-email" label="Email" required>
            <input
              id="portal-email"
              type="email"
              autoComplete="username"
              required
              className={appointmentControlClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </AppointmentField>
          <AppointmentField id="portal-password" label="Password" required>
            <input
              id="portal-password"
              type="password"
              autoComplete="current-password"
              required
              className={appointmentControlClassName}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </AppointmentField>
          <button
            type="submit"
            disabled={pending}
            className="bg-accent text-text hover:bg-accent/90 inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </Container>
    </Section>
  );
}
