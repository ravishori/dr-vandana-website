export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<{ timedOut: true } | { timedOut: false; value: T }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<{ timedOut: true }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    const raced = await Promise.race([
      promise.then((value) => ({ timedOut: false as const, value })),
      timeout,
    ]);
    return raced;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function nextRetryAt(
  now: Date,
  attemptCount: number,
  backoffMs: readonly number[],
): Date {
  const index = Math.min(Math.max(attemptCount - 1, 0), backoffMs.length - 1);
  return new Date(now.getTime() + (backoffMs[index] ?? 0));
}

export function executeRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    return result as Array<Record<string, unknown>>;
  }
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as Array<Record<string, unknown>>;
    }
  }
  return [];
}
