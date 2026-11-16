import type { TestContext } from "node:test";

const NETWORK_ERROR_CODES = new Set([
  "ETIMEDOUT",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function isNetworkFailure(error: unknown): boolean {
  const queue: unknown[] = [error];
  while (queue.length > 0) {
    const current = queue.shift() as
      | { name?: string; code?: string; cause?: unknown; errors?: unknown[] }
      | undefined;
    if (!current || typeof current !== "object") {
      continue;
    }
    if (current.name === "AbortError" || current.name === "TimeoutError") {
      return true;
    }
    if (typeof current.code === "string" && NETWORK_ERROR_CODES.has(current.code)) {
      return true;
    }
    queue.push(current.cause, ...(current.errors ?? []));
  }
  return error instanceof TypeError && /fetch failed/i.test(error.message);
}

/**
 * Fetch an external URL for a link-validity test.
 *
 * - Network unreachable (timeout, DNS, no route): the test is reported as
 *   SKIPPED with the reason, never as passed. Set REQUIRE_EXTERNAL_URL_CHECKS=true
 *   to make such a failure fail the test instead.
 * - The server answers: the Response is returned and the caller asserts on it,
 *   so a real bad status (404, 500) still fails the test.
 */
export async function fetchExternalOrSkip(
  context: TestContext,
  url: string,
  init: RequestInit = {},
  timeoutMs = 20_000,
): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (process.env.REQUIRE_EXTERNAL_URL_CHECKS === "true" || !isNetworkFailure(error)) {
      throw error;
    }
    context.skip(`external network unavailable for ${url}`);
    return null;
  }
}
