"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  LOGIN_SECURITY_NOTICE,
  type LoginIntent,
} from "@/lib/auth/role-intent";
import { cn } from "@/lib/utils";

const OPTIONS: ReadonlyArray<{
  intent: LoginIntent;
  title: string;
  description: string;
}> = [
  {
    intent: "psychologist",
    title: "Psychologist",
    description: "Access your professional dashboard",
  },
  {
    intent: "client",
    title: "Client / Patient",
    description: "Access your appointments and wellness resources",
  },
];

export function LoginRoleChooser() {
  const router = useRouter();
  const headingId = useId();
  const [selected, setSelected] = useState<LoginIntent | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleContinue() {
    if (!selected) {
      setError("Please choose how you would like to continue.");
      return;
    }
    setError(null);
    // Intent is a UX preference only — never authorization.
    router.push(`/login/sign-in?intent=${selected}`);
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="text-center">
        <h1 id={headingId} className="text-[clamp(1.85rem,4vw,2.5rem)]">
          Welcome Back
        </h1>
        <p className="text-text-muted mt-3 text-base leading-relaxed md:text-lg">
          How would you like to continue?
        </p>
      </div>

      <fieldset className="mt-8 border-0 p-0" aria-labelledby={headingId}>
        <legend className="sr-only">Choose account type</legend>
        <div className="grid gap-3" role="radiogroup" aria-label="Continue as">
          {OPTIONS.map((option) => {
            const isSelected = selected === option.intent;
            return (
              <button
                key={option.intent}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setSelected(option.intent);
                  setError(null);
                }}
                className={cn(
                  "border-brand-muted/30 bg-surface hover:border-brand-muted min-h-[var(--touch-target-min)] w-full rounded-[var(--radius-xl)] border px-5 py-4 text-left transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none",
                  isSelected &&
                    "border-brand bg-surface-soft ring-brand/25 shadow-sm ring-2",
                )}
              >
                <span className="text-brand block font-serif text-xl">
                  {option.title}
                </span>
                <span className="text-text-muted mt-1 block text-sm leading-relaxed">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="text-accent mt-4 text-sm font-medium"
          id="login-role-error"
        >
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleContinue}
        className="bg-accent text-text hover:bg-accent/90 mt-6 inline-flex min-h-[var(--touch-target-min)] w-full items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium shadow-sm transition-colors duration-[var(--transition-fast)] motion-reduce:transition-none"
        aria-describedby={error ? "login-role-error" : "login-security-notice"}
      >
        Continue
      </button>

      <p
        id="login-security-notice"
        className="text-text-muted mt-5 text-center text-xs leading-relaxed"
      >
        {LOGIN_SECURITY_NOTICE}
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href="/book-appointment" variant="secondary">
          Book an Appointment
        </ButtonLink>
        <ButtonLink href="/" variant="ghost">
          Back to Home
        </ButtonLink>
      </div>
    </div>
  );
}
