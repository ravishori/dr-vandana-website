import { and, asc, eq } from "drizzle-orm";

import {
  authorizePracticePsychologist,
  type LifecycleFailure,
} from "@/lib/appointments/lifecycle";
import {
  appointmentTypes,
  practiceAppointmentSettings,
  practiceHours,
} from "@/lib/appointments/schema";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import { appendAuditLog } from "@/lib/identity/audit";
import type { IdentityContext } from "@/lib/identity/context";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";

export type PracticeSettingsView = {
  timezone: string;
  slotGranularityMinutes: number | null;
  minimumNoticeMinutes: number | null;
  maximumAdvanceDays: number | null;
  cancellationMinimumNoticeMinutes: number | null;
  hours: {
    dayOfWeek: number;
    opensLocal: string;
    closesLocal: string;
    active: boolean;
  }[];
  appointmentTypes: {
    publicId: string;
    name: string;
    description: string;
    durationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    active: boolean;
  }[];
};

const DAY_LABELS = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function practiceDayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export async function getPracticeSettings(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<{ ok: true; settings: PracticeSettingsView } | LifecycleFailure> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const psychologistUserId = authorized.principal.userId;

  const [settings] = await ctx.db
    .select()
    .from(practiceAppointmentSettings)
    .where(eq(practiceAppointmentSettings.psychologistUserId, psychologistUserId))
    .limit(1);

  const hours = await ctx.db
    .select({
      dayOfWeek: practiceHours.dayOfWeek,
      opensLocal: practiceHours.opensLocal,
      closesLocal: practiceHours.closesLocal,
      active: practiceHours.active,
    })
    .from(practiceHours)
    .where(eq(practiceHours.psychologistUserId, psychologistUserId))
    .orderBy(asc(practiceHours.dayOfWeek));

  const types = await ctx.db
    .select({
      publicId: appointmentTypes.publicId,
      name: appointmentTypes.name,
      description: appointmentTypes.description,
      durationMinutes: appointmentTypes.durationMinutes,
      bufferBeforeMinutes: appointmentTypes.bufferBeforeMinutes,
      bufferAfterMinutes: appointmentTypes.bufferAfterMinutes,
      active: appointmentTypes.active,
    })
    .from(appointmentTypes)
    .where(eq(appointmentTypes.psychologistUserId, psychologistUserId))
    .orderBy(asc(appointmentTypes.name));

  return {
    ok: true,
    settings: {
      timezone: settings?.timezone ?? PRACTICE_TIMEZONE,
      slotGranularityMinutes: settings?.slotGranularityMinutes ?? null,
      minimumNoticeMinutes: settings?.minimumNoticeMinutes ?? null,
      maximumAdvanceDays: settings?.maximumAdvanceDays ?? null,
      cancellationMinimumNoticeMinutes:
        settings?.cancellationMinimumNoticeMinutes ?? null,
      hours: hours.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        opensLocal: String(row.opensLocal).slice(0, 5),
        closesLocal: String(row.closesLocal).slice(0, 5),
        active: row.active,
      })),
      appointmentTypes: types,
    },
  };
}

function parsePositiveInt(value: FormDataEntryValue | null, max: number): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > max) {
    return null;
  }
  return n;
}

function parseTime(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  return /^\d{2}:\d{2}$/.test(value) ? value : null;
}

/**
 * Upserts non-clinical practice booking settings and weekly hours.
 * Reuses existing tables only — no schema changes.
 */
export async function savePracticeSettings(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  form: FormData,
): Promise<{ ok: true; message: string } | LifecycleFailure | { ok: false; code: "VALIDATION"; message: string }> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const psychologistUserId = authorized.principal.userId;
  const now = ctx.now();

  const slotGranularityMinutes = parsePositiveInt(
    form.get("slotGranularityMinutes"),
    120,
  );
  const minimumNoticeMinutes = parsePositiveInt(
    form.get("minimumNoticeMinutes"),
    10080,
  );
  const maximumAdvanceDays = parsePositiveInt(form.get("maximumAdvanceDays"), 365);
  const cancellationMinimumNoticeMinutes = parsePositiveInt(
    form.get("cancellationMinimumNoticeMinutes"),
    10080,
  );

  if (
    slotGranularityMinutes === null ||
    minimumNoticeMinutes === null ||
    maximumAdvanceDays === null ||
    cancellationMinimumNoticeMinutes === null
  ) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please review the highlighted practice settings.",
    };
  }

  const hourRows: {
    dayOfWeek: number;
    opensLocal: string;
    closesLocal: string;
    active: boolean;
  }[] = [];
  for (let day = 1; day <= 7; day += 1) {
    const active = form.get(`hourActive_${day}`) === "on";
    const opensLocal = parseTime(form.get(`opens_${day}`)) ?? "09:00";
    const closesLocal = parseTime(form.get(`closes_${day}`)) ?? "17:00";
    if (active && opensLocal >= closesLocal) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Opening time must be before closing time for each active day.",
      };
    }
    hourRows.push({ dayOfWeek: day, opensLocal, closesLocal, active });
  }

  await ctx.db
    .insert(practiceAppointmentSettings)
    .values({
      psychologistUserId,
      timezone: PRACTICE_TIMEZONE,
      slotGranularityMinutes,
      minimumNoticeMinutes,
      maximumAdvanceDays,
      cancellationMinimumNoticeMinutes,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: practiceAppointmentSettings.psychologistUserId,
      set: {
        slotGranularityMinutes,
        minimumNoticeMinutes,
        maximumAdvanceDays,
        cancellationMinimumNoticeMinutes,
        updatedAt: now,
      },
    });

  for (const hour of hourRows) {
    const [existing] = await ctx.db
      .select({ id: practiceHours.id })
      .from(practiceHours)
      .where(
        and(
          eq(practiceHours.psychologistUserId, psychologistUserId),
          eq(practiceHours.dayOfWeek, hour.dayOfWeek),
        ),
      )
      .limit(1);
    if (existing) {
      await ctx.db
        .update(practiceHours)
        .set({
          opensLocal: hour.opensLocal,
          closesLocal: hour.closesLocal,
          active: hour.active,
          updatedAt: now,
        })
        .where(eq(practiceHours.id, existing.id));
    } else if (hour.active) {
      await ctx.db.insert(practiceHours).values({
        id: generateUuid(),
        psychologistUserId,
        dayOfWeek: hour.dayOfWeek,
        opensLocal: hour.opensLocal,
        closesLocal: hour.closesLocal,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const typeName = String(form.get("newTypeName") ?? "").trim().slice(0, 80);
  const typeDuration = parsePositiveInt(form.get("newTypeDuration"), 240);
  if (typeName && typeDuration && typeDuration >= 15) {
    await ctx.db.insert(appointmentTypes).values({
      id: generateUuid(),
      publicId: generatePublicId("ATY"),
      psychologistUserId,
      name: typeName,
      description: String(form.get("newTypeDescription") ?? "")
        .trim()
        .slice(0, 300) || "Practice appointment type",
      durationMinutes: typeDuration,
      bufferBeforeMinutes: parsePositiveInt(form.get("newTypeBufferBefore"), 60) ?? 0,
      bufferAfterMinutes: parsePositiveInt(form.get("newTypeBufferAfter"), 60) ?? 0,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  await appendAuditLog(ctx, {
    actorUserId: psychologistUserId,
    action: "PRACTICE_SETTINGS_UPDATED",
    targetType: "practice_appointment_settings",
    targetId: psychologistUserId,
    result: "SUCCESS",
    metadata: { timezone: PRACTICE_TIMEZONE },
  });

  return { ok: true, message: "Practice settings saved." };
}
