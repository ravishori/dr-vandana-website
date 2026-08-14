"use client";

import { useState, useTransition } from "react";

import {
  confirmMfaEnrollmentAction,
  practiceLoginAction,
  startMfaEnrollmentAction,
  verifyMfaAction,
} from "@/app/practice-auth/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  IdentityShell,
  identityButtonClassName,
} from "@/components/identity/IdentityShell";
import type { RoleName } from "@/lib/identity/constants";

function Message({ value }: { value: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <p className="text-sm" role="status">
      {value}
    </p>
  );
}

export function PracticeLoginForm({
  role,
  title,
  description,
}: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
  title: string;
  description: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Secure access" title={title}>
      <p>{description}</p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await practiceLoginAction({
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
              role,
            });
            if (result && !result.ok) {
              setMessage(result.message);
            }
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id={`${role}-email`} label="Email" required>
          <input
            id={`${role}-email`}
            name="email"
            type="email"
            autoComplete="username"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id={`${role}-password`} label="Password" required>
          <input
            id={`${role}-password`}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function MfaForm({
  role,
  enroll,
}: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
  enroll: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  return (
    <IdentityShell
      kicker="Additional verification"
      title={enroll ? "Set up authenticator" : "Enter verification code"}
    >
      <p>
        Password-only access is not enough for this role. Use an authenticator
        app. Recovery codes are shown once.
      </p>
      {otpauthUri ? (
        <p className="break-all text-xs">
          Authenticator URI: {otpauthUri}
        </p>
      ) : null}
      {secret ? <p className="break-all text-xs">Setup key: {secret}</p> : null}
      {recoveryCodes ? (
        <ul className="list-disc pl-5">
          {recoveryCodes.map((code) => (
            <li key={code} className="font-mono">
              {code}
            </li>
          ))}
        </ul>
      ) : null}
      <Message value={message} />
      {enroll && !recoveryCodes ? (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const started = await startMfaEnrollmentAction(role);
              if (!started.ok) {
                setMessage(started.message);
                return;
              }
              setOtpauthUri(started.otpauthUri ?? null);
              setSecret(started.secretBase32 ?? null);
              setMessage(started.message ?? null);
            });
          }}
        >
          <button type="submit" disabled={pending} className={identityButtonClassName}>
            {pending ? "Preparing…" : "Generate setup key"}
          </button>
        </form>
      ) : null}
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const code = String(form.get("code") ?? "");
          const recovery = form.get("recovery") === "on";
          startTransition(async () => {
            if (enroll && !recoveryCodes) {
              const confirmed = await confirmMfaEnrollmentAction({ role, code });
              if (!confirmed.ok) {
                setMessage(confirmed.message);
                return;
              }
              setRecoveryCodes(confirmed.recoveryCodes ?? null);
              setSecret(null);
              setMessage(confirmed.message ?? null);
              return;
            }
            const verified = await verifyMfaAction({ role, code, recovery });
            if (verified && !verified.ok) {
              setMessage(verified.message);
            }
          });
        }}
      >
        <AppointmentField id={`${role}-mfa`} label="Authenticator or recovery code" required>
          <input
            id={`${role}-mfa`}
            name="code"
            autoComplete="one-time-code"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        {!enroll ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="recovery" />
            This is a recovery code
          </label>
        ) : null}
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Checking…" : "Verify"}
        </button>
      </form>
    </IdentityShell>
  );
}
