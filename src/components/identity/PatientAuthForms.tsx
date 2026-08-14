"use client";

import { useState, useTransition } from "react";

import {
  forgotPasswordAction,
  patientLoginAction,
  resendEmailAction,
  resetPasswordAction,
  sendPhoneOtpAction,
  verifyEmailAction,
  verifyPhoneAction,
} from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import {
  IdentityShell,
  identityButtonClassName,
} from "@/components/identity/IdentityShell";

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

export function PatientLoginForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Patient accounts" title="Sign in">
      <p>Sign in only after email and mobile verification are complete.</p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await patientLoginAction({
              email: String(form.get("email") ?? ""),
              password: String(form.get("password") ?? ""),
            });
            if (result && !result.ok) {
              setMessage(result.message);
            }
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id="patient-email" label="Email" required>
          <input
            id="patient-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id="patient-password" label="Password" required>
          <input
            id="patient-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p>
          <a className="underline" href="/patient/forgot-password">
            Forgot password
          </a>
        </p>
      </form>
    </IdentityShell>
  );
}

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Patient accounts" title="Reset password">
      <p>If an account exists for that email, we will send reset instructions.</p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await forgotPasswordAction(String(form.get("email") ?? ""));
            setMessage(result.message ?? null);
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id="reset-email" label="Email" required>
          <input
            id="reset-email"
            name="email"
            type="email"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Sending…" : "Send reset instructions"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Patient accounts" title="Choose a new password">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await resetPasswordAction({
              token,
              password: String(form.get("password") ?? ""),
              passwordConfirm: String(form.get("passwordConfirm") ?? ""),
            });
            setMessage(result.message ?? null);
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id="new-password" label="New password" required>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id="new-password-confirm" label="Confirm password" required>
          <input
            id="new-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function VerifyPhoneForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Patient accounts" title="Verify your mobile number">
      <p>
        After your email is verified, we send a one-time code. Do not share this
        code with anyone.
      </p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "");
          const intent = String(form.get("intent") ?? "verify");
          startTransition(async () => {
            const result =
              intent === "send"
                ? await sendPhoneOtpAction(email)
                : await verifyPhoneAction({
                    email,
                    code: String(form.get("code") ?? ""),
                  });
            setMessage(result.message ?? null);
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id="phone-email" label="Email" required>
          <input
            id="phone-email"
            name="email"
            type="email"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id="otp-code" label="Verification code">
          <input
            id="otp-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button
          type="submit"
          name="intent"
          value="send"
          disabled={pending}
          className={identityButtonClassName}
        >
          {pending ? "Please wait…" : "Send code"}
        </button>
        <button
          type="submit"
          name="intent"
          value="verify"
          disabled={pending}
          className={identityButtonClassName}
        >
          {pending ? "Checking…" : "Verify code"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function VerifyEmailConfirmForm({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  return (
    <IdentityShell kicker="Patient accounts" title="Verify your email">
      <p>
        Confirm this request to finish email verification. This extra step
        prevents email scanners from using the link automatically.
      </p>
      {verified ? (
        <p>
          <a className="underline" href="/patient/verify-phone">
            Continue to mobile verification
          </a>
        </p>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await verifyEmailAction(token);
              setMessage(result.message ?? null);
              if (result.ok) {
                setVerified(true);
                window.history.replaceState(null, "", "/patient/verify-email");
              }
            });
          }}
        >
          <Message value={message} />
          <button type="submit" disabled={pending} className={identityButtonClassName}>
            {pending ? "Verifying…" : "Verify email"}
          </button>
        </form>
      )}
    </IdentityShell>
  );
}

export function ResendEmailForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await resendEmailAction(String(form.get("email") ?? ""));
          setMessage(result.message ?? null);
        });
      }}
    >
      <Message value={message} />
      <AppointmentField id="resend-email" label="Email" required>
        <input
          id="resend-email"
          name="email"
          type="email"
          required
          className={appointmentControlClassName}
        />
      </AppointmentField>
      <button type="submit" disabled={pending} className={identityButtonClassName}>
        {pending ? "Sending…" : "Resend verification email"}
      </button>
    </form>
  );
}
