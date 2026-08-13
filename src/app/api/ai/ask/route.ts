import { headers } from "next/headers";

import { runAskPipeline } from "@/lib/ai/pipeline/ask";
import { checkAiAskRateLimit } from "@/lib/ai/rate-limit";
import { getClientIpFromHeaders } from "@/lib/appointment-abuse";
import { logStructured } from "@/lib/observability/logger";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 8_192;

export async function GET(): Promise<Response> {
  return Response.json({ ok: false }, { status: 405 });
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();

  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return Response.json(
        { ok: false, error: { code: "QUESTION_TOO_LONG", message: "Request is too large." } },
        { status: 413 },
      );
    }

    const headerStore = await headers();
    const clientIp = getClientIpFromHeaders(headerStore);
    const rateLimit = await checkAiAskRateLimit(clientIp);

    if (!rateLimit.allowed) {
      if (rateLimit.reason === "rate_limited") {
        return Response.json(
          {
            ok: false,
            error: {
              code: "RATE_LIMITED",
              message: "Please wait a moment before asking another question.",
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
            },
          },
        );
      }

      logStructured("ERROR", {
        requestId,
        code:
          rateLimit.reason === "misconfigured"
            ? "RATE_LIMIT_MISCONFIGURED"
            : "RATE_LIMIT_STORE_UNAVAILABLE",
        source: "CONFIGURATION",
        operation: "POST_api_ai_ask",
        message: "Ask AI rate limiting unavailable or misconfigured; request denied.",
      });
      return Response.json(
        {
          ok: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "This service is temporarily unavailable.",
          },
        },
        { status: 503 },
      );
    }

    const rawText = await request.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return Response.json(
        { ok: false, error: { code: "QUESTION_TOO_LONG", message: "Request is too large." } },
        { status: 413 },
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText) as unknown;
    } catch {
      return Response.json(
        {
          ok: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Please enter a psychology question to continue.",
          },
        },
        { status: 400 },
      );
    }

    const result = await runAskPipeline(parsedJson, requestId);
    if (!result.ok) {
      return Response.json(
        { ok: false, error: result.error },
        { status: result.status },
      );
    }

    return Response.json({
      answer: result.response.answer,
      category: result.response.category,
      sources: result.response.sources,
      related_questions: result.response.related_questions,
      safety_notice: result.response.safety_notice,
      conversation_id: result.response.conversation_id,
      show_support_cta: result.response.show_support_cta,
      case_study_slug: result.response.case_study_slug,
    });
  } catch {
    logStructured("ERROR", {
      requestId,
      operation: "POST_api_ai_ask",
      errorType: "unexpected_failure",
    });
    return Response.json(
      {
        ok: false,
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Something went wrong. Please try again shortly.",
        },
      },
      { status: 500 },
    );
  }
}
