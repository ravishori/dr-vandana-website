import type { IdentityContext } from "@/lib/identity/context";
import { generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";
import { auditLogs, securityEvents } from "@/lib/identity/schema";
import type { SecurityEventType } from "@/lib/identity/constants";

export type AuditResult = "SUCCESS" | "FAILURE" | "DENIED";

function isSensitiveMetadataKey(key: string): boolean {
  const lowered = key.toLowerCase();
  if (
    lowered === "code" ||
    lowered === "session" ||
    lowered === "token" ||
    lowered === "cookie"
  ) {
    return true;
  }
  return /(password|otp|token|secret|cookie|authorization|recovery)/i.test(key);
}

function stripSecrets(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) {
    return undefined;
  }
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (isSensitiveMetadataKey(key)) {
      continue;
    }
    if (typeof value === "string" && value.length > 500) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export async function appendAuditLog(
  ctx: IdentityContext,
  input: {
    actorUserId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    result: AuditResult;
    metadata?: Record<string, unknown>;
    db?: IdentityDb;
  },
): Promise<void> {
  const db = input.db ?? ctx.db;
  await db.insert(auditLogs).values({
    id: generateUuid(),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    result: input.result,
    metadata: stripSecrets(input.metadata) ?? null,
    createdAt: ctx.now(),
  });
}

export async function recordSecurityEvent(
  ctx: IdentityContext,
  input: {
    userId?: string | null;
    eventType: SecurityEventType;
    ipHash?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await ctx.db.insert(securityEvents).values({
    id: generateUuid(),
    userId: input.userId ?? null,
    eventType: input.eventType,
    ipHash: input.ipHash ?? null,
    metadata: stripSecrets(input.metadata) ?? null,
    createdAt: ctx.now(),
  });
}
