"use client";

import { useState, useTransition } from "react";

import {
  confirmMfaEnrollmentAction,
  practiceChangePasswordAction,
  practiceForgotPasswordAction,
  practiceLoginAction,
  practiceResetPasswordWithTokenAction,
  practiceVerifyMobileResetOtpAction,
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

function forgotPasswordHref(
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">,
): string {
  return role === "PSYCHOLOGIST"
    ? "/psychologist/practice/forgot-password"
    : "/super-admin/forgot-password";
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
        <AppointmentField
          id={`${role}-email`}
          label="Email or mobile number"
          required
        >
          <input
            id={`${role}-email`}
            name="email"
            type="text"
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
        <p className="text-sm">
          <a className="underline" href={forgotPasswordHref(role)}>
            Forgot password?
          </a>
        </p>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Signing in…" : "Continue"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function PracticeChangePasswordForm({
  role,
}: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <IdentityShell kicker="Account security" title="Change your password">
      <p>
        You must set a new password before continuing. Use at least 12
        characters. This is not your authenticator code.
      </p>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await practiceChangePasswordAction({
              role,
              currentPassword: String(form.get("currentPassword") ?? ""),
              newPassword: String(form.get("newPassword") ?? ""),
              newPasswordConfirm: String(form.get("newPasswordConfirm") ?? ""),
            });
            if (result && !result.ok) {
              setMessage(result.message);
            }
          });
        }}
      >
        <Message value={message} />
        <AppointmentField id="current-password" label="Current password" required>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField id="new-password" label="New password" required>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <AppointmentField
          id="new-password-confirm"
          label="Confirm new password"
          required
        >
          <input
            id="new-password-confirm"
            name="newPasswordConfirm"
            type="password"
            autoComplete="new-password"
            required
            className={appointmentControlClassName}
          />
        </AppointmentField>
        <button type="submit" disabled={pending} className={identityButtonClassName}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </IdentityShell>
  );
}

export function PracticeForgotPasswordForm({
  role,
}: {
  role: Extract<RoleName, "PSYCHOLOGIST" | "SUPER_ADMIN">;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<"request" | "otp" | "password" | "done">(
    "request",
  );
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const loginHref =
    role === "PSYCHOLOGIST"
      ? "/psychologist/practice/login"
      : "/super-admin/login";

  return (
    <IdentityShell kicker="Account recovery" title="Forgot password">
      {step === "request" ? (
        <>
          <p>
            Enter the email or verified mobile number for your practice account.
            If the account is eligible, a verification message will be sent.
            After resetting, you must sign in with your new password and
            complete authenticator verification.
          </p>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const value = String(form.get("identifier") ?? "").trim();
              startTransition(async () => {
                const result = await practiceForgotPasswordAction(value);
                if (!result.ok) {
                  setMessage(result.message);
                  return;
                }
                setIdentifier(value);
                setMessage(result.message ?? null);
                if (result.channelHint === "sms") {
                  setStep("otp");
                  return;
                }
                setStep("done");
              });
            }}
          >
            <Message value={message} />
            <AppointmentField
              id="forgot-identifier"
              label="Email or mobile number"
              required
            >
              <input
                id="forgot-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className={appointmentControlClassName}
              />
            </AppointmentField>
            <button
              type="submit"
              disabled={pending}
              className={identityButtonClassName}
            >
              {pending ? "Sending…" : "Send reset instructions"}
            </button>
          </form>
        </>
      ) : null}

      {step === "otp" ? (
        <>
          <p>
            Enter the 6-digit verification code sent to your mobile. This is not
            your authenticator code.
          </p>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await practiceVerifyMobileResetOtpAction({
                  mobile: identifier,
                  code: String(form.get("code") ?? ""),
                });
                if (!result.ok) {
                  setMessage(result.message);
                  return;
                }
                if (!result.resetToken) {
                  setMessage("That verification code is not valid. Please try again.");
                  return;
                }
                setResetToken(result.resetToken);
                setMessage(null);
                setStep("password");
              });
            }}
          >
            <Message value={message} />
            <AppointmentField id="reset-otp" label="Verification code" required>
              <input
                id="reset-otp"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className={appointmentControlClassName}
              />
            </AppointmentField>
            <button
              type="submit"
              disabled={pending}
              className={identityButtonClassName}
            >
              {pending ? "Checking…" : "Verify code"}
            </button>
          </form>
        </>
      ) : null}

      {step === "password" && resetToken ? (
        <>
          <p>
            Choose a new password (at least 12 characters). You will still need
            your authenticator app after signing in.
          </p>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await practiceResetPasswordWithTokenAction({
                  token: resetToken,
                  password: String(form.get("password") ?? ""),
                  passwordConfirm: String(form.get("passwordConfirm") ?? ""),
                });
                if (!result.ok) {
                  setMessage(result.message);
                  return;
                }
                setMessage(result.message ?? null);
                setResetToken(null);
                setStep("done");
              });
            }}
          >
            <Message value={message} />
            <AppointmentField id="reset-password" label="New password" required>
              <input
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={appointmentControlClassName}
              />
            </AppointmentField>
            <AppointmentField
              id="reset-password-confirm"
              label="Confirm new password"
              required
            >
              <input
                id="reset-password-confirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                className={appointmentControlClassName}
              />
            </AppointmentField>
            <button
              type="submit"
              disabled={pending}
              className={identityButtonClassName}
            >
              {pending ? "Saving…" : "Save new password"}
            </button>
          </form>
        </>
      ) : null}

      {step === "done" ? (
        <div className="space-y-5">
          <Message
            value={
              message ??
              "If the account is eligible, a verification message has been sent."
            }
          />
          <p className="text-sm">
            After resetting, sign in with your new password and authenticator
            code.
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-sm">
        <a className="underline" href={loginHref}>
          Back to sign in
        </a>
      </p>
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
      kicker="2-step verification"
      title={
        enroll
          ? "Enable authenticator app"
          : "Enter your 2-step verification code"
      }
    >
      <p>
        Enter the 6-digit code from your authenticator app (for example Google
        Authenticator, Microsoft Authenticator, Authy, or 1Password). This is
        not a password. Recovery codes are shown once during enrolment.
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
        <AppointmentField
          id={`${role}-mfa`}
          label={
            enroll
              ? "6-digit authenticator code"
              : "Authenticator code or recovery code"
          }
          required
        >
          <input
            id={`${role}-mfa`}
            name="code"
            inputMode="numeric"
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
