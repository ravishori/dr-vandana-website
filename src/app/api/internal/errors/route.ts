import { headers } from "next/headers";
import { z } from "zod";

import {
  checkErrorReportRateLimit,
  getClientIpFromHeaders,
} from "@/lib/appointment-abuse";
import { reportException } from "@/lib/observability/error-handler";
import { logStructured } from "@/lib/observability/logger";
import {
  sanitizeErrorText,
  sanitizeOperation,
  sanitizeRoute,
} from "@/lib/observability/error-sanitizer";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 4_096;

export async function GET(): Promise<Response> {
  return Response.json({ ok: false }, { status: 405 });
}

const frontendErrorSchema = z
  .object({
    code: z.literal("FRONTEND_RUNTIME_ERROR"),
    message: z.string().max(400).optional(),
    route: z.string().max(200).optional(),
    operation: z.string().max(80).optional(),
    correlationId: z.string().max(64).optional(),
  })
  .strict();

/**
 * Accepts minimal sanitized frontend error metadata only.
 * Server re-validates, clamps severity/source, and throttles reports.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return Response.json({ ok: false }, { status: 413 });
    }

    const headerStore = await headers();
    const clientIp = getClientIpFromHeaders(headerStore);
    const rateLimit = await checkErrorReportRateLimit(clientIp);

    if (!rateLimit.allowed) {
      if (rateLimit.reason === "rate_limited") {
        return Response.json(
          { ok: false },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
            },
          },
        );
      }

      // Store unavailable / misconfigured: fail closed without recursive alerts.
      logStructured("ERROR", {
        code:
          rateLimit.reason === "misconfigured"
            ? "RATE_LIMIT_MISCONFIGURED"
            : "RATE_LIMIT_STORE_UNAVAILABLE",
        source: "CONFIGURATION",
        message:
          "Error-report rate limiting unavailable or misconfigured; request denied.",
        operation: "POST_api_internal_errors",
      });
      return Response.json({ ok: false }, { status: 503 });
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return Response.json({ ok: false }, { status: 413 });
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText) as unknown;
    } catch {
      return Response.json({ ok: false }, { status: 400 });
    }

    const parsed = frontendErrorSchema.safeParse(parsedJson);
    if (!parsed.success) {
      await reportException({
        source: "API",
        code: "ERROR_REPORT_REJECTED",
        severity: "WARNING",
        message: "Rejected malformed frontend error report.",
        operation: "POST_api_internal_errors",
        skipEmail: true,
      });
      return Response.json({ ok: false }, { status: 400 });
    }

    const reported = await reportException({
      source: "FRONTEND",
      // Frontend cannot escalate to CRITICAL.
      severity: "ERROR",
      code: "FRONTEND_RUNTIME_ERROR",
      message: sanitizeErrorText(
        parsed.data.message ?? "A frontend runtime error occurred.",
        400,
      ),
      route: sanitizeRoute(parsed.data.route),
      operation: sanitizeOperation(parsed.data.operation) ?? "frontend",
    });

    return Response.json({
      ok: true,
      correlationId: reported.correlationId,
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
