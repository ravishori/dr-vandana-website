"use client";

import { useActionState } from "react";

import { loginDoctorAction, type DoctorLoginState } from "@/app/doctor/actions";

const initial: DoctorLoginState = { ok: false, message: "" };

export function DoctorLoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState(
    loginDoctorAction,
    initial,
  );

  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-subtle)]">
      <h1 className="font-[family-name:var(--font-playfair)] text-2xl text-[var(--color-text)]">
        Doctor sign in
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Secure access to articles and website enquiry communications. This
        portal is not an electronic health record.
      </p>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="from" value={from ?? "/doctor/dashboard"} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--color-text)]">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-[var(--color-text)]">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          />
        </label>
        {state.message ? (
          <p
            role="alert"
            className="text-sm text-[var(--color-emergency)]"
          >
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
