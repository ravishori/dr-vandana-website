"use client";

import { useActionState } from "react";

import { loginContentAdminAction } from "@/app/admin/content/actions";

const initialState: { error?: string } = {};

export function ContentAdminLoginForm() {
  const [state, action, pending] = useActionState(
    loginContentAdminAction,
    initialState,
  );

  return (
    <form action={action} className="mx-auto max-w-md space-y-4">
      <h1 className="text-3xl font-semibold">Content admin sign-in</h1>
      <p className="text-text-muted text-sm">
        Authenticated editors can manage blogs, resources, and videos. This is
        separate from the Wellness Assistant clinical systems.
      </p>
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 min-h-[var(--touch-target-min)] w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 min-h-[var(--touch-target-min)] w-full rounded-[var(--radius-md)] border border-brand-muted/40 bg-surface px-3"
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="min-h-[var(--touch-target-min)] rounded-[var(--radius-md)] bg-brand px-5 text-sm font-medium text-white"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
