"use client";

import { useState, useTransition } from "react";

import {
  psychologistCompleteMfaAction,
  psychologistEnableMfaAction,
} from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";

export default function PracticeSecurityPage() {
  const [secret, setSecret] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Section className="pt-10">
      <Container className="max-w-lg">
        <h1>Security & MFA</h1>
        <p className="text-text-muted mt-3 text-sm">
          Psychologist MFA is mandatory for production use. Enable TOTP with an
          authenticator app.
        </p>
        <button
          type="button"
          disabled={pending}
          className="bg-accent text-text mt-6 rounded px-4 py-2 text-sm"
          onClick={() =>
            startTransition(async () => {
              const result = await psychologistEnableMfaAction();
              setSecret(result.secret);
              setUri(result.otpauthUrl);
              setMessage("MFA secret generated. Scan/store it, then verify a code.");
            })
          }
        >
          Enable / rotate MFA
        </button>
        {secret ? (
          <p className="mt-4 break-all text-xs">Secret: {secret}</p>
        ) : null}
        {uri ? <p className="mt-2 break-all text-xs">{uri}</p> : null}
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await psychologistCompleteMfaAction(formData);
              setMessage(result.ok ? "MFA verified for this session." : result.message);
            });
          }}
        >
          <AppointmentField id="totp" label="Authenticator code">
            <input id="totp" name="totp" className={appointmentControlClassName} />
          </AppointmentField>
          <button type="submit" className="border rounded px-3 py-2 text-sm">
            Verify MFA
          </button>
        </form>
        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </Container>
    </Section>
  );
}
