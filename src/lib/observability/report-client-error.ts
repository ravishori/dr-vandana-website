"use client";

type ClientErrorReport = {
  message?: string;
  route?: string;
  operation?: string;
};

/**
 * Browser-safe error reporter. Sends only minimal metadata.
 * Never include form values, cookies, storage, or headers.
 */
export async function reportClientError(
  input: ClientErrorReport,
): Promise<string | undefined> {
  try {
    const route =
      input.route ??
      (typeof window !== "undefined"
        ? window.location.pathname
        : undefined);

    const response = await fetch("/api/internal/errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: "FRONTEND_RUNTIME_ERROR",
        message: input.message?.slice(0, 400),
        route: route?.split(/[?#]/)[0]?.slice(0, 200),
        operation: input.operation?.slice(0, 80),
      }),
    });

    if (!response.ok) {
      return undefined;
    }

    const data = (await response.json()) as { correlationId?: string };
    return typeof data.correlationId === "string"
      ? data.correlationId
      : undefined;
  } catch {
    return undefined;
  }
}
