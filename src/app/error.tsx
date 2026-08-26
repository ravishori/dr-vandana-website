"use client";

import { useEffect, useState } from "react";

import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { reportClientError } from "@/lib/observability/report-client-error";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const [reference, setReference] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void reportClientError({
      message: "A page rendering error occurred.",
      operation: "app.error",
    }).then((correlationId) => {
      if (!cancelled && correlationId) {
        setReference(correlationId);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [error.digest]);

  return (
    <Section aria-labelledby="app-error-heading">
      <Container className="max-w-2xl py-16">
        <h1
          id="app-error-heading"
          className="font-display text-text text-3xl tracking-tight"
        >
          Something went wrong
        </h1>
        <p
          className="text-text-muted mt-4 text-base leading-relaxed"
          role="alert"
        >
          Please try again later.
          {reference ? ` Reference: ${reference}.` : null}
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-text hover:bg-accent/90 mt-8 inline-flex min-h-[var(--touch-target-min)] items-center justify-center rounded-[var(--radius-md)] px-5 text-sm font-medium"
        >
          Try again
        </button>
      </Container>
    </Section>
  );
}
