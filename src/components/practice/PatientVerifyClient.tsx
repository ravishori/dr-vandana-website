"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { sendOtpAction, verifyOtpAction } from "@/app/patient/actions";
import {
  AppointmentField,
  appointmentControlClassName,
} from "@/components/appointment/AppointmentField";
import { ButtonLink } from "@/components/ui/ButtonLink";

export function PatientVerifyClient() {
  const params = useSearchParams();
  const userId = params.get("userId") ?? "";
  const [message, setMessage] = useState(
    "Check your email for a verification link, then verify your mobile with OTP.",
  );
  const [devCode, setDevCode] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  return (
    <>
      <h1>Verify your account</h1>
      <p className="text-text-muted mt-3 text-sm">{message}</p>
      {devCode ? (
        <p className="mt-2 text-xs" role="status">
          MOCKED OTP provider — development code: {devCode}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !userId}
          className="border-brand-muted rounded-[var(--radius-md)] border px-4 py-2 text-sm"
          onClick={() =>
            startTransition(async () => {
              const result = await sendOtpAction(userId);
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              setDevCode(result.devCode);
              setMessage(
                result.mocked
                  ? "OTP sent via MOCK provider (CONFIGURATION REQUIRED for production SMS)."
                  : "OTP sent.",
              );
            })
          }
        >
          Send mobile OTP
        </button>
      </div>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const code = String(new FormData(event.currentTarget).get("code") ?? "");
          startTransition(async () => {
            const result = await verifyOtpAction(userId, code);
            setMessage(
              result.ok ? "Mobile verified. You can sign in." : result.message,
            );
          });
        }}
      >
        <AppointmentField id="code" label="OTP code">
          <input id="code" name="code" className={appointmentControlClassName} />
        </AppointmentField>
        <button
          type="submit"
          className="bg-accent text-text rounded-[var(--radius-md)] px-4 py-2 text-sm"
        >
          Verify OTP
        </button>
      </form>
      <div className="mt-6">
        <ButtonLink href="/patient/login" variant="secondary">
          Continue to sign in
        </ButtonLink>
      </div>
    </>
  );
}
