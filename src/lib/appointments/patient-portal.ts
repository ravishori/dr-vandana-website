import { and, asc, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import { availabilityService } from "@/lib/appointments/availability";
import {
  APPOINTMENT_RATE_LIMITS,
  LIFECYCLE_PAGE_SIZE_DEFAULT,
  LIFECYCLE_PAGE_SIZE_MAX,
  LIFECYCLE_SAFE_MESSAGES,
  PATIENT_FILTERS,
  PATIENT_HISTORY_LABELS,
  PRACTICE_TIMEZONE,
  PUBLIC_APPOINTMENT_ID_PATTERN,
  type AppointmentStatus,
  type PatientFilter,
} from "@/lib/appointments/constants";
import type { LifecycleFailure } from "@/lib/appointments/lifecycle";
import { patientActionsFor } from "@/lib/appointments/lifecycle";
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
import {
  authorizationService,
  type AuthorizationPrincipal,
} from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";
import { users } from "@/lib/identity/schema";

export type PatientAppointmentListItem = {
  publicId: string;
  status: AppointmentStatus;
  statusLabel: string;
  date: string;
  start: string;
  end: string;
  timezone: string;
  createdAt: string;
  version: number;
  appointmentType: { publicId: string; name: string };
  actions: ReturnType<typeof patientActionsFor>;
};

export type PatientVisibleHistory = {
  label: string;
  actorLabel: string | null;
  createdAt: string;
};

export type PatientAppointmentDetail = PatientAppointmentListItem & {
  proposedStart: string | null;
  proposedEnd: string | null;
  pendingExplanation: string | null;
  history: PatientVisibleHistory[];
};

function inaccessible(): LifecycleFailure {
  return {
    ok: false,
    code: "NOT_FOUND",
    message: LIFECYCLE_SAFE_MESSAGES.inaccessible,
  };
}

function isPatientFilter(value: string): value is PatientFilter {
  return (PATIENT_FILTERS as readonly string[]).includes(value);
}

export async function authorizePortalPatient(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<
  | { ok: true; principal: AuthorizationPrincipal }
  | LifecycleFailure
> {
  const access = authorizationService.canAccess(principal, { roles: ["PATIENT"] });
  if (!access.allowed) {
    if (!principal || access.reason === "unauthenticated") {
      return {
        ok: false,
        code: "UNAUTHENTICATED",
        message: LIFECYCLE_SAFE_MESSAGES.sessionExpired,
      };
    }
    return {
      ok: false,
      code: "FORBIDDEN",
      message: LIFECYCLE_SAFE_MESSAGES.inaccessible,
    };
  }
  if (!principal) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: LIFECYCLE_SAFE_MESSAGES.sessionExpired,
    };
  }
  const [user] = await ctx.db
    .select({
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      mobileVerifiedAt: users.mobileVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, principal.userId))
    .limit(1);
  if (
    !user ||
    user.status !== "ACTIVE" ||
    !user.emailVerifiedAt ||
    !user.mobileVerifiedAt
  ) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: LIFECYCLE_SAFE_MESSAGES.inaccessible,
    };
  }
  return { ok: true, principal };
}

async function consumePortalLimit(
  ctx: IdentityContext,
  userId: string,
  ipAddress?: string | null,
): Promise<boolean> {
  const ip = ipAddress?.trim() || "unknown";
  const ipLimit = await ctx.rateLimit.consume(
    `appointment-portal-ip:${ip}`,
    APPOINTMENT_RATE_LIMITS.portal.max,
    APPOINTMENT_RATE_LIMITS.portal.windowMs,
  );
  const userLimit = await ctx.rateLimit.consume(
    `appointment-portal-user:${userId}`,
    APPOINTMENT_RATE_LIMITS.portal.max,
    APPOINTMENT_RATE_LIMITS.portal.windowMs,
  );
  return ipLimit.allowed && userLimit.allowed;
}

function defaultSort(filter: PatientFilter): "starts_at_asc" | "starts_at_desc" {
  if (
    filter === "completed" ||
    filter === "cancelled" ||
    filter === "no_show" ||
    filter === "rejected" ||
    filter === "history"
  ) {
    return "starts_at_desc";
  }
  return "starts_at_asc";
}

function patientStatusLabel(status: AppointmentStatus): string {
  if (status === "PENDING") {
    return "Appointment request pending";
  }
  if (status === "CONFIRMED") {
    return "Appointment confirmed";
  }
  if (status === "CANCELLED") {
    return "Cancelled";
  }
  if (status === "REJECTED") {
    return "Request not accepted";
  }
  if (status === "COMPLETED") {
    return "Appointment completed";
  }
  if (status === "NO_SHOW") {
    return "Appointment marked as no-show";
  }
  if (status === "RESCHEDULE_REQUESTED") {
    return "Reschedule requested";
  }
  return "Appointment request pending";
}

function mapHistory(
  eventType: string,
  actorRole: string | null,
  createdAt: Date,
): PatientVisibleHistory {
  return {
    label: PATIENT_HISTORY_LABELS[eventType] ?? "Appointment updated",
    actorLabel:
      actorRole === "PATIENT"
        ? "You"
        : actorRole === "PSYCHOLOGIST"
          ? "Psychologist"
          : null,
    createdAt: createdAt.toISOString(),
  };
}

export async function listPatientAppointments(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: {
    filter?: string;
    fromLocal?: string;
    toLocal?: string;
    page?: number;
    pageSize?: number;
    ipAddress?: string | null;
  },
): Promise<
  | {
      ok: true;
      filter: PatientFilter;
      page: number;
      pageSize: number;
      total: number;
      items: PatientAppointmentListItem[];
    }
  | LifecycleFailure
> {
  const authorized = await authorizePortalPatient(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const allowed = await consumePortalLimit(
    ctx,
    authorized.principal.userId,
    input.ipAddress,
  );
  if (!allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: LIFECYCLE_SAFE_MESSAGES.rateLimited,
    };
  }
  const filter: PatientFilter =
    input.filter && isPatientFilter(input.filter) ? input.filter : "upcoming";
  const sort = defaultSort(filter);
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const requestedSize = Math.floor(input.pageSize ?? LIFECYCLE_PAGE_SIZE_DEFAULT);
  const pageSize = Math.min(
    LIFECYCLE_PAGE_SIZE_MAX,
    Math.max(1, Number.isFinite(requestedSize) ? requestedSize : LIFECYCLE_PAGE_SIZE_DEFAULT),
  );
  const now = ctx.now();
  const conditions = [eq(appointments.patientUserId, authorized.principal.userId)];

  if (filter === "upcoming") {
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
  } else if (filter === "rejected") {
    conditions.push(eq(appointments.status, "REJECTED"));
  } else if (filter === "no_show") {
    conditions.push(eq(appointments.status, "NO_SHOW"));
  } else if (filter === "history") {
    conditions.push(
      inArray(appointments.status, ["COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"]),
    );
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
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
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
    items: rows.map((row) => {
      const status = row.status as AppointmentStatus;
      return {
        publicId: row.publicId,
        status,
        statusLabel: patientStatusLabel(status),
        date: formatLocalDate(row.startsAt, PRACTICE_TIMEZONE),
        start: row.startsAt.toISOString(),
        end: row.endsAt.toISOString(),
        timezone: PRACTICE_TIMEZONE,
        createdAt: row.createdAt.toISOString(),
        version: row.version,
        appointmentType: { publicId: row.typePublicId, name: row.typeName },
        actions: patientActionsFor(status),
      };
    }),
  };
}

export async function getPatientAppointmentDetail(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  publicId: string,
  ipAddress?: string | null,
): Promise<{ ok: true; appointment: PatientAppointmentDetail } | LifecycleFailure> {
  const authorized = await authorizePortalPatient(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const allowed = await consumePortalLimit(ctx, authorized.principal.userId, ipAddress);
  if (!allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: LIFECYCLE_SAFE_MESSAGES.rateLimited,
    };
  }
  if (!PUBLIC_APPOINTMENT_ID_PATTERN.test(publicId)) {
    return inaccessible();
  }
  const [row] = await ctx.db
    .select({
      id: appointments.id,
      publicId: appointments.publicId,
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
    })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .where(
      and(
        eq(appointments.publicId, publicId),
        eq(appointments.patientUserId, authorized.principal.userId),
      ),
    )
    .limit(1);
  if (!row) {
    return inaccessible();
  }
  const historyRows = await ctx.db
    .select({
      eventType: appointmentHistory.eventType,
      actorRole: appointmentHistory.actorRole,
      createdAt: appointmentHistory.createdAt,
    })
    .from(appointmentHistory)
    .where(eq(appointmentHistory.appointmentId, row.id))
    .orderBy(asc(appointmentHistory.createdAt));
  const status = row.status as AppointmentStatus;
  return {
    ok: true,
    appointment: {
      publicId: row.publicId,
      status,
      statusLabel: patientStatusLabel(status),
      date: formatLocalDate(row.startsAt, PRACTICE_TIMEZONE),
      start: row.startsAt.toISOString(),
      end: row.endsAt.toISOString(),
      timezone: PRACTICE_TIMEZONE,
      createdAt: row.createdAt.toISOString(),
      version: row.version,
      appointmentType: { publicId: row.typePublicId, name: row.typeName },
      actions: patientActionsFor(status),
      proposedStart: row.proposedStartsAt?.toISOString() ?? null,
      proposedEnd: row.proposedEndsAt?.toISOString() ?? null,
      pendingExplanation:
        status === "PENDING" ? LIFECYCLE_SAFE_MESSAGES.pendingExplanation : null,
      history: historyRows.map((item) =>
        mapHistory(item.eventType, item.actorRole, item.createdAt),
      ),
    },
  };
}

export async function listPatientRescheduleSlots(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
  input: { publicId: string; dateLocal: string; ipAddress?: string | null },
) {
  const detail = await getPatientAppointmentDetail(
    ctx,
    principal,
    input.publicId,
    input.ipAddress,
  );
  if (!detail.ok) {
    return detail;
  }
  if (!detail.appointment.actions.includes("REQUEST_RESCHEDULE")) {
    return {
      ok: false as const,
      code: "INVALID_TRANSITION" as const,
      message: LIFECYCLE_SAFE_MESSAGES.invalidTransition,
    };
  }
  const authorized = await authorizePortalPatient(ctx, principal);
  if (!authorized.ok) {
    return inaccessible();
  }
  const [row] = await ctx.db
    .select({ id: appointments.id, typePublicId: appointmentTypes.publicId })
    .from(appointments)
    .innerJoin(appointmentTypes, eq(appointments.appointmentTypeId, appointmentTypes.id))
    .where(
      and(
        eq(appointments.publicId, input.publicId),
        eq(appointments.patientUserId, authorized.principal.userId),
      ),
    )
    .limit(1);
  if (!row) {
    return inaccessible();
  }
  return availabilityService.getAvailableSlots(ctx, {
    appointmentTypePublicId: row.typePublicId,
    dateLocal: input.dateLocal,
    excludeAppointmentId: row.id,
  });
}
