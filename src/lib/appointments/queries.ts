import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";

import { availabilityService } from "@/lib/appointments/availability";
import {
  DASHBOARD_FILTERS,
  DASHBOARD_SORTS,
  LIFECYCLE_PAGE_SIZE_DEFAULT,
  LIFECYCLE_PAGE_SIZE_MAX,
  LIFECYCLE_SAFE_MESSAGES,
  PRACTICE_TIMEZONE,
  PUBLIC_APPOINTMENT_ID_PATTERN,
  type AppointmentStatus,
  type DashboardFilter,
  type DashboardSort,
} from "@/lib/appointments/constants";
import type { LifecycleFailure } from "@/lib/appointments/lifecycle";
import {
  authorizePracticePsychologist,
  psychologistActionsFor,
} from "@/lib/appointments/lifecycle";
import {
  appointmentHistory,
  appointmentTypes,
  appointments,
} from "@/lib/appointments/schema";
import {
  formatLocalDate,
  parseLocalDate,
  startOfLocalDay,
  startOfNextLocalDay,
} from "@/lib/appointments/timezone";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { patientProfiles, users } from "@/lib/identity/schema";

export type PracticeAppointmentListItem = {
  publicId: string;
  status: AppointmentStatus;
  date: string;
  start: string;
  end: string;
  timezone: string;
  createdAt: string;
  version: number;
  appointmentType: { publicId: string; name: string };
  patient: { publicId: string; displayName: string };
  actions: ReturnType<typeof psychologistActionsFor>;
};

export type PracticeAppointmentDetail = PracticeAppointmentListItem & {
  patientEmail: string | null;
  proposedStart: string | null;
  proposedEnd: string | null;
  history: {
    eventType: string;
    fromStatus: string | null;
    toStatus: string | null;
    actorRole: string | null;
    createdAt: string;
    metadata: Record<string, unknown> | null;
  }[];
};

function isDashboardFilter(value: string): value is DashboardFilter {
  return (DASHBOARD_FILTERS as readonly string[]).includes(value);
}

function isDashboardSort(value: string): value is DashboardSort {
  return (DASHBOARD_SORTS as readonly string[]).includes(value);
}

function defaultSort(filter: DashboardFilter): DashboardSort {
  if (
    filter === "completed" ||
    filter === "cancelled" ||
    filter === "no_show" ||
    filter === "rejected"
  ) {
    return "starts_at_desc";
  }
  return "starts_at_asc";
}

export async function listPracticeAppointments(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: {
    filter?: string;
    fromLocal?: string;
    toLocal?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
  },
): Promise<
  | {
      ok: true;
      filter: DashboardFilter;
      page: number;
      pageSize: number;
      total: number;
      items: PracticeAppointmentListItem[];
    }
  | LifecycleFailure
> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const filter: DashboardFilter =
    input.filter && isDashboardFilter(input.filter) ? input.filter : "upcoming";
  const sort: DashboardSort =
    input.sort && isDashboardSort(input.sort) ? input.sort : defaultSort(filter);
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(
    LIFECYCLE_PAGE_SIZE_MAX,
    Math.max(1, Math.floor(input.pageSize ?? LIFECYCLE_PAGE_SIZE_DEFAULT)),
  );
  const now = ctx.now();
  const today = parseLocalDate(formatLocalDate(now, PRACTICE_TIMEZONE));
  const conditions = [eq(appointments.psychologistUserId, authorized.principal.userId)];

  if (filter === "today" && today) {
    conditions.push(gte(appointments.startsAt, startOfLocalDay(today, PRACTICE_TIMEZONE)));
    conditions.push(lt(appointments.startsAt, startOfNextLocalDay(today, PRACTICE_TIMEZONE)));
  } else if (filter === "upcoming") {
    conditions.push(gte(appointments.startsAt, now));
    conditions.push(
      sql`${appointments.status} in ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED')`,
    );
  } else if (filter === "pending") {
    conditions.push(eq(appointments.status, "PENDING"));
  } else if (filter === "confirmed") {
    conditions.push(eq(appointments.status, "CONFIRMED"));
  } else if (filter === "completed") {
    conditions.push(eq(appointments.status, "COMPLETED"));
  } else if (filter === "cancelled") {
    conditions.push(eq(appointments.status, "CANCELLED"));
  } else if (filter === "no_show") {
    conditions.push(eq(appointments.status, "NO_SHOW"));
  } else if (filter === "rejected") {
    conditions.push(eq(appointments.status, "REJECTED"));
  } else if (filter === "range") {
    const from = input.fromLocal ? parseLocalDate(input.fromLocal) : null;
    const to = input.toLocal ? parseLocalDate(input.toLocal) : null;
    if (from) {
      conditions.push(gte(appointments.startsAt, startOfLocalDay(from, PRACTICE_TIMEZONE)));
    }
    if (to) {
      conditions.push(lt(appointments.startsAt, startOfNextLocalDay(to, PRACTICE_TIMEZONE)));
    }
  }

  const where = and(...conditions);
  const order =
    sort === "starts_at_desc"
      ? [desc(appointments.startsAt), desc(appointments.id)]
      : [asc(appointments.startsAt), asc(appointments.id)];

  const [totalRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(where);
  const rows = await ctx.db
    .select({
      publicId: appointments.publicId,
      status: appointments.status,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      timezone: appointments.timezone,
      createdAt: appointments.createdAt,
      version: appointments.version,
      typePublicId: appointmentTypes.publicId,
      typeName: appointmentTypes.name,
      patientPublicId: users.publicId,
      patientDisplayName: patientProfiles.displayName,
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .innerJoin(users, eq(appointments.patientUserId, users.id))
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(where)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    ok: true,
    filter,
    page,
    pageSize,
    total: Number(totalRow?.value ?? 0),
    items: rows.map((row) => ({
      publicId: row.publicId,
      status: row.status as AppointmentStatus,
      date: formatLocalDate(row.startsAt, PRACTICE_TIMEZONE),
      start: row.startsAt.toISOString(),
      end: row.endsAt.toISOString(),
      timezone: row.timezone,
      createdAt: row.createdAt.toISOString(),
      version: row.version,
      appointmentType: { publicId: row.typePublicId, name: row.typeName },
      patient: { publicId: row.patientPublicId, displayName: row.patientDisplayName },
      actions: psychologistActionsFor(row.status as AppointmentStatus),
    })),
  };
}

export async function getPracticeAppointmentDetail(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  publicId: string,
): Promise<{ ok: true; appointment: PracticeAppointmentDetail } | LifecycleFailure> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  if (!PUBLIC_APPOINTMENT_ID_PATTERN.test(publicId)) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_SAFE_MESSAGES.notFound };
  }
  const [row] = await ctx.db
    .select({
      id: appointments.id,
      publicId: appointments.publicId,
      psychologistUserId: appointments.psychologistUserId,
      status: appointments.status,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      timezone: appointments.timezone,
      createdAt: appointments.createdAt,
      version: appointments.version,
      proposedStartsAt: appointments.proposedStartsAt,
      proposedEndsAt: appointments.proposedEndsAt,
      typePublicId: appointmentTypes.publicId,
      typeName: appointmentTypes.name,
      patientPublicId: users.publicId,
      patientDisplayName: patientProfiles.displayName,
      patientEmail: users.email,
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .innerJoin(users, eq(appointments.patientUserId, users.id))
    .innerJoin(patientProfiles, eq(patientProfiles.userId, users.id))
    .where(eq(appointments.publicId, publicId))
    .limit(1);
  if (!row || row.psychologistUserId !== authorized.principal.userId) {
    return { ok: false, code: "NOT_FOUND", message: LIFECYCLE_SAFE_MESSAGES.notFound };
  }
  const historyRows = await ctx.db
    .select({
      eventType: appointmentHistory.eventType,
      fromStatus: appointmentHistory.fromStatus,
      toStatus: appointmentHistory.toStatus,
      actorRole: appointmentHistory.actorRole,
      createdAt: appointmentHistory.createdAt,
      metadata: appointmentHistory.metadata,
    })
    .from(appointmentHistory)
    .where(eq(appointmentHistory.appointmentId, row.id))
    .orderBy(asc(appointmentHistory.createdAt));
  return {
    ok: true,
    appointment: {
      publicId: row.publicId,
      status: row.status as AppointmentStatus,
      date: formatLocalDate(row.startsAt, PRACTICE_TIMEZONE),
      start: row.startsAt.toISOString(),
      end: row.endsAt.toISOString(),
      timezone: row.timezone,
      createdAt: row.createdAt.toISOString(),
      version: row.version,
      appointmentType: { publicId: row.typePublicId, name: row.typeName },
      patient: { publicId: row.patientPublicId, displayName: row.patientDisplayName },
      patientEmail: row.patientEmail,
      proposedStart: row.proposedStartsAt?.toISOString() ?? null,
      proposedEnd: row.proposedEndsAt?.toISOString() ?? null,
      actions: psychologistActionsFor(row.status as AppointmentStatus),
      history: historyRows.map((item) => ({
        eventType: item.eventType,
        fromStatus: item.fromStatus,
        toStatus: item.toStatus,
        actorRole: item.actorRole,
        createdAt: item.createdAt.toISOString(),
        metadata: item.metadata,
      })),
    },
  };
}

export async function listRescheduleSlots(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: { publicId: string; dateLocal: string },
) {
  const detail = await getPracticeAppointmentDetail(ctx, principal, input.publicId);
  if (!detail.ok) {
    return detail;
  }
  const [row] = await ctx.db
    .select({ id: appointments.id, typePublicId: appointmentTypes.publicId })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .where(eq(appointments.publicId, input.publicId))
    .limit(1);
  if (!row) {
    return {
      ok: false as const,
      code: "NOT_FOUND" as const,
      message: LIFECYCLE_SAFE_MESSAGES.notFound,
    };
  }
  return availabilityService.getAvailableSlots(ctx, {
    appointmentTypePublicId: row.typePublicId,
    dateLocal: input.dateLocal,
    excludeAppointmentId: row.id,
  });
}
