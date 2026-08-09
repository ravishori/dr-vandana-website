"use client";

import { useEffect, useState } from "react";

import { reportClientError } from "@/lib/observability/report-client-error";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [reference, setReference] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    void reportClientError({
      message: "A global application error occurred.",
      operation: "app.global-error",
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
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "Plus Jakarta Sans, Segoe UI, sans-serif",
          background: "#FBF9F5",
          color: "#2B332C",
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem" }}>
          <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6 }} role="alert">
            Please try again later.
            {reference ? ` Reference: ${reference}.` : null}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              minHeight: 44,
              padding: "0.75rem 1.25rem",
              border: 0,
              borderRadius: 8,
              background: "#D99B82",
              color: "#2B332C",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
