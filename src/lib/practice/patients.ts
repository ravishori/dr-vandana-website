import { and, count, desc, eq, or, sql } from "drizzle-orm";

import {
  authorizePracticePsychologist,
  type LifecycleFailure,
} from "@/lib/appointments/lifecycle";
import { appointments } from "@/lib/appointments/schema";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import { appendAuditLog } from "@/lib/identity/audit";
import type { IdentityContext } from "@/lib/identity/context";
import type { UserStatus } from "@/lib/identity/constants";
import { USER_STATUSES } from "@/lib/identity/constants";
import { patientProfiles, users } from "@/lib/identity/schema";

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;
const PATIENT_PUBLIC_ID_PATTERN = /^PAT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

/** Practitioner-managed statuses (existing schema; no ARCHIVED column). */
export const PRACTICE_MANAGED_STATUSES = [
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;

export type PracticeManagedStatus = (typeof PRACTICE_MANAGED_STATUSES)[number];

export type PracticePatientListItem = {
  publicId: string;
  displayName: string;
  status: UserStatus;
  email: string;
  registeredAt: string;
  appointmentCount: number;
  whatsappNotificationsEnabled: boolean;
};

export type PracticePatientDetail = PracticePatientListItem & {
  mobileNumber: string | null;
  emailVerified: boolean;
  mobileVerified: boolean;
  recentAppointments: {
    publicId: string;
    status: string;
    startsAt: string;
    timezone: string;
  }[];
};

function isUserStatus(value: string): value is UserStatus {
  return (USER_STATUSES as readonly string[]).includes(value);
}

/**
 * Lists patients who have at least one appointment with this psychologist.
 * Non-clinical fields only. Does not expose other psychologists' patients.
 */
export async function listPracticePatients(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: {
    q?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<
  | {
      ok: true;
      page: number;
      pageSize: number;
      total: number;
      items: PracticePatientListItem[];
    }
  | LifecycleFailure
> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const psychologistUserId = authorized.principal.userId;
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Math.floor(input.pageSize ?? PAGE_SIZE_DEFAULT)),
  );
  const rawQ = input.q?.trim().slice(0, 80) ?? "";
  const q = rawQ.replace(/[%_\\]/g, "");
  const statusFilter =
    input.status && isUserStatus(input.status) ? input.status : undefined;

  const pattern = q.length > 0 ? `%${q}%` : null;
  const searchClause = pattern
    ? or(
        sql`${patientProfiles.displayName} ilike ${pattern}`,
        sql`${users.email} ilike ${pattern}`,
        sql`${users.publicId} ilike ${pattern}`,
      )
    : undefined;

  const where = and(
    eq(appointments.psychologistUserId, psychologistUserId),
    statusFilter ? eq(users.status, statusFilter) : undefined,
    searchClause,
  );

  const [totalRow] = await ctx.db
    .select({
      value: sql<number>`count(distinct ${users.id})::int`,
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.patientUserId, users.id))
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(where);

  const rows = await ctx.db
    .select({
      publicId: users.publicId,
      displayName: patientProfiles.displayName,
      status: users.status,
      email: users.email,
      registeredAt: users.createdAt,
      whatsappNotificationsEnabled: patientProfiles.whatsappNotificationsEnabled,
      appointmentCount: count(appointments.id),
    })
    .from(appointments)
    .innerJoin(users, eq(appointments.patientUserId, users.id))
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(where)
    .groupBy(
      users.id,
      users.publicId,
      patientProfiles.displayName,
      users.status,
      users.email,
      users.createdAt,
      patientProfiles.whatsappNotificationsEnabled,
    )
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    ok: true,
    page,
    pageSize,
    total: totalRow?.value ?? 0,
    items: rows.map((row) => ({
      publicId: row.publicId,
      displayName: row.displayName,
      status: row.status as UserStatus,
      email: row.email,
      registeredAt: row.registeredAt.toISOString(),
      appointmentCount: Number(row.appointmentCount),
      whatsappNotificationsEnabled: row.whatsappNotificationsEnabled,
    })),
  };
}

export async function getPracticePatientDetail(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  patientPublicId: string,
): Promise<{ ok: true; patient: PracticePatientDetail } | LifecycleFailure> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  if (!PATIENT_PUBLIC_ID_PATTERN.test(patientPublicId)) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That patient could not be found.",
    };
  }

  const psychologistUserId = authorized.principal.userId;
  const [row] = await ctx.db
    .select({
      id: users.id,
      publicId: users.publicId,
      displayName: patientProfiles.displayName,
      status: users.status,
      email: users.email,
      mobileNumber: users.mobileNumber,
      registeredAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      mobileVerifiedAt: users.mobileVerifiedAt,
      whatsappNotificationsEnabled: patientProfiles.whatsappNotificationsEnabled,
    })
    .from(users)
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(eq(users.publicId, patientPublicId))
    .limit(1);

  if (!row) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That patient could not be found.",
    };
  }

  const [relationship] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.patientUserId, row.id),
      ),
    );

  if (!relationship || Number(relationship.value) === 0) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That patient could not be found.",
    };
  }

  const recent = await ctx.db
    .select({
      publicId: appointments.publicId,
      status: appointments.status,
      startsAt: appointments.startsAt,
      timezone: appointments.timezone,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.patientUserId, row.id),
      ),
    )
    .orderBy(desc(appointments.startsAt))
    .limit(20);

  return {
    ok: true,
    patient: {
      publicId: row.publicId,
      displayName: row.displayName,
      status: row.status as UserStatus,
      email: row.email,
      mobileNumber: row.mobileNumber,
      registeredAt: row.registeredAt.toISOString(),
      appointmentCount: Number(relationship.value),
      whatsappNotificationsEnabled: row.whatsappNotificationsEnabled,
      emailVerified: Boolean(row.emailVerifiedAt),
      mobileVerified: Boolean(row.mobileVerifiedAt),
      recentAppointments: recent.map((item) => ({
        publicId: item.publicId,
        status: item.status,
        startsAt: item.startsAt.toISOString(),
        timezone: item.timezone,
      })),
    },
  };
}

async function loadRelatedPatientUserId(
  ctx: IdentityContext,
  psychologistUserId: string,
  patientPublicId: string,
): Promise<string | null> {
  if (!PATIENT_PUBLIC_ID_PATTERN.test(patientPublicId)) {
    return null;
  }
  const [row] = await ctx.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.publicId, patientPublicId))
    .limit(1);
  if (!row) {
    return null;
  }
  const [relationship] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.patientUserId, row.id),
      ),
    );
  if (!relationship || Number(relationship.value) === 0) {
    return null;
  }
  return row.id;
}

/**
 * Updates non-clinical display name and account status for a related patient.
 * Status uses existing users.status values (ACTIVE / SUSPENDED / DISABLED).
 */
export async function updatePracticePatientProfile(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: {
    patientPublicId: string;
    displayName: string;
    status: string;
  },
): Promise<
  | { ok: true; message: string }
  | LifecycleFailure
  | { ok: false; code: "VALIDATION"; message: string }
> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const displayName = input.displayName.trim().slice(0, 80);
  if (displayName.length < 2) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please enter a valid display name.",
    };
  }
  if (
    !(PRACTICE_MANAGED_STATUSES as readonly string[]).includes(input.status)
  ) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Please choose a valid account status.",
    };
  }
  const status = input.status as PracticeManagedStatus;
  const patientUserId = await loadRelatedPatientUserId(
    ctx,
    authorized.principal.userId,
    input.patientPublicId,
  );
  if (!patientUserId) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "That patient could not be found.",
    };
  }

  const now = ctx.now();
  await ctx.db
    .update(patientProfiles)
    .set({ displayName, updatedAt: now })
    .where(eq(patientProfiles.userId, patientUserId));
  await ctx.db
    .update(users)
    .set({ status, updatedAt: now })
    .where(eq(users.id, patientUserId));

  await appendAuditLog(ctx, {
    actorUserId: authorized.principal.userId,
    action: "PRACTICE_PATIENT_PROFILE_UPDATED",
    targetType: "patient",
    targetId: input.patientPublicId,
    result: "SUCCESS",
    metadata: { status },
  });

  return { ok: true, message: "Patient profile updated." };
}
