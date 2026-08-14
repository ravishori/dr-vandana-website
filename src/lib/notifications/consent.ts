import { eq } from "drizzle-orm";

import { appendAuditLog } from "@/lib/identity/audit";
import type { IdentityContext } from "@/lib/identity/context";
import { generateUuid } from "@/lib/identity/crypto";
import { patientProfiles } from "@/lib/identity/schema";

export type WhatsAppConsentState = {
  enabled: boolean;
  optedInAt: Date | null;
  optedOutAt: Date | null;
};

export function isWhatsAppConsentActive(state: WhatsAppConsentState): boolean {
  if (!state.enabled || !state.optedInAt) {
    return false;
  }
  if (state.optedOutAt && state.optedOutAt.getTime() >= state.optedInAt.getTime()) {
    return false;
  }
  return true;
}

export async function readPatientWhatsAppConsent(
  ctx: Pick<IdentityContext, "db">,
  userId: string,
): Promise<WhatsAppConsentState> {
  const [row] = await ctx.db
    .select({
      enabled: patientProfiles.whatsappNotificationsEnabled,
      optedInAt: patientProfiles.whatsappOptedInAt,
      optedOutAt: patientProfiles.whatsappOptedOutAt,
    })
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, userId))
    .limit(1);
  if (!row) {
    return { enabled: false, optedInAt: null, optedOutAt: null };
  }
  return {
    enabled: row.enabled,
    optedInAt: row.optedInAt,
    optedOutAt: row.optedOutAt,
  };
}

export async function setPatientWhatsAppConsent(
  ctx: IdentityContext,
  input: {
    userId: string;
    optIn: boolean;
    source: string;
  },
): Promise<WhatsAppConsentState> {
  const now = ctx.now();
  const current = await readPatientWhatsAppConsent(ctx, input.userId);
  const next: WhatsAppConsentState = input.optIn
    ? {
        enabled: true,
        optedInAt: now,
        optedOutAt: current.optedOutAt,
      }
    : {
        enabled: false,
        optedInAt: current.optedInAt,
        optedOutAt: now,
      };
  await ctx.db
    .update(patientProfiles)
    .set({
      whatsappNotificationsEnabled: next.enabled,
      whatsappOptedInAt: next.optedInAt,
      whatsappOptedOutAt: next.optedOutAt,
      updatedAt: now,
    })
    .where(eq(patientProfiles.userId, input.userId));
  await appendAuditLog(ctx, {
    actorUserId: input.userId,
    action: input.optIn ? "PATIENT_WHATSAPP_OPT_IN" : "PATIENT_WHATSAPP_OPT_OUT",
    targetType: "patient_profile",
    targetId: input.userId,
    result: "SUCCESS",
    metadata: {
      source: input.source,
      eventId: generateUuid(),
    },
  });
  return next;
}

export type NotificationConsentReader = {
  hasWhatsAppOptIn: (userId: string) => Promise<boolean>;
};

export function createDatabaseConsentReader(
  ctx: Pick<IdentityContext, "db">,
): NotificationConsentReader {
  return {
    async hasWhatsAppOptIn(userId) {
      const state = await readPatientWhatsAppConsent(ctx, userId);
      return isWhatsAppConsentActive(state);
    },
  };
}

export function createStaticConsentReader(
  optedInUserIds: ReadonlySet<string> | boolean,
): NotificationConsentReader {
  return {
    async hasWhatsAppOptIn(userId) {
      if (typeof optedInUserIds === "boolean") {
        return optedInUserIds;
      }
      return optedInUserIds.has(userId);
    },
  };
}
