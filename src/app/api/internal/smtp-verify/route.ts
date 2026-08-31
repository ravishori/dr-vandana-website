import { headers } from "next/headers";

import {
  checkErrorReportRateLimit,
  getClientIpFromHeaders,
} from "@/lib/appointment-abuse";
import { createIdentityRateLimiter } from "@/lib/identity/rate-limit";
import { logStructured } from "@/lib/observability/logger";
import { authorizeSmtpVerifyOperator } from "@/lib/staging/smtp-verify-authorize";
import { isSmtpVerifyEnvironmentAllowed } from "@/lib/staging/smtp-verify-env";
import {
  assertSmtpVerifyRequestBodySafe,
  verifyConfiguredSmtpAuth,
} from "@/lib/staging/smtp-verify";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 256;

/** Tight IP limit for SMTP verify attempts (in addition to shared error-report limiter). */
const SMTP_VERIFY_IP_MAX = 5;
const SMTP_VERIFY_IP_WINDOW_MS = 15 * 60 * 1000;

const smtpVerifyLimiter = createIdentityRateLimiter();

export async function GET(): Promise<Response> {
  return Response.json({ ok: false, status: "METHOD_NOT_ALLOWED" }, { status: 405 });
}

/**
 * Preview-only, operator-authorized SMTP AUTH verification.
 * Uses server env SMTP_* exclusively. Never sends mail. Never returns secrets.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    if (!isSmtpVerifyEnvironmentAllowed()) {
      logStructured("WARNING", {
        operation: "POST_api_internal_smtp_verify",
        outcome: "environment_denied",
      });
      return Response.json(
        { ok: false, status: "ENVIRONMENT_DENIED" },
        { status: 403 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return Response.json({ ok: false, status: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }

    const headerStore = await headers();
    const clientIp = getClientIpFromHeaders(headerStore);

    const sharedLimit = await checkErrorReportRateLimit(clientIp);
    if (!sharedLimit.allowed) {
      if (sharedLimit.reason === "rate_limited") {
        return Response.json(
          { ok: false, status: "RATE_LIMITED" },
          {
            status: 429,
            headers: {
              "Retry-After": String(sharedLimit.retryAfterSeconds ?? 60),
            },
          },
        );
      }
      return Response.json({ ok: false, status: "RATE_LIMIT_UNAVAILABLE" }, { status: 503 });
    }

    const dedicated = await smtpVerifyLimiter.consume(
      `smtp-verify:ip:${clientIp}`,
      SMTP_VERIFY_IP_MAX,
      SMTP_VERIFY_IP_WINDOW_MS,
    );
    if (!dedicated.allowed) {
      return Response.json(
        { ok: false, status: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(dedicated.retryAfterSeconds),
          },
        },
      );
    }

    const auth = await authorizeSmtpVerifyOperator();
    if (!auth.ok) {
      const status =
        auth.reason === "unauthenticated" || auth.reason === "identity_unavailable"
          ? 401
          : 403;
      logStructured("WARNING", {
        operation: "POST_api_internal_smtp_verify",
        outcome: "authorization_denied",
        reason: auth.reason,
      });
      return Response.json(
        { ok: false, status: "AUTHORIZATION_DENIED" },
        { status },
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return Response.json({ ok: false, status: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    }

    let parsedBody: unknown = undefined;
    if (rawText.trim().length > 0) {
      try {
        parsedBody = JSON.parse(rawText) as unknown;
      } catch {
        return Response.json({ ok: false, status: "INVALID_BODY" }, { status: 400 });
      }
    }

    const bodyCheck = assertSmtpVerifyRequestBodySafe(parsedBody);
    if (!bodyCheck.ok) {
      logStructured("WARNING", {
        operation: "POST_api_internal_smtp_verify",
        outcome: "injection_rejected",
      });
      return Response.json(
        { ok: false, status: "PARAMETER_INJECTION_DENIED" },
        { status: 400 },
      );
    }

    const result = await verifyConfiguredSmtpAuth();

    // Never attach secrets, hosts, or user identities beyond role class in response.
    return Response.json(
      {
        ok: result.ok,
        status: result.status,
        provider: result.provider,
        transport: result.transport,
      },
      { status: 200 },
    );
  } catch {
    logStructured("ERROR", {
      operation: "POST_api_internal_smtp_verify",
      outcome: "unexpected_failure",
    });
    return Response.json({ ok: false, status: "SMTP_VERIFY_ERROR" }, { status: 500 });
  }
}
