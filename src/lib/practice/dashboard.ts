import { and, count, eq, gte, lt, sql } from "drizzle-orm";

import {
  authorizePracticePsychologist,
  type LifecycleFailure,
} from "@/lib/appointments/lifecycle";
import { appointments } from "@/lib/appointments/schema";
import {
  formatLocalDate,
  parseLocalDate,
  startOfLocalDay,
  startOfNextLocalDay,
} from "@/lib/appointments/timezone";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import type { AuthorizationPrincipal } from "@/lib/identity/authorization";
import type { IdentityContext } from "@/lib/identity/context";

export type PracticeDashboardSummary = {
  today: number;
  upcoming: number;
  pending: number;
  patients: number;
  completed: number;
  cancelled: number;
  noShow: number;
};

export async function getPracticeDashboardSummary(
  ctx: IdentityContext,
  principal: AuthorizationPrincipal | null,
): Promise<{ ok: true; summary: PracticeDashboardSummary } | LifecycleFailure> {
  const authorized = await authorizePracticePsychologist(ctx, principal);
  if (!authorized.ok) {
    return authorized;
  }
  const psychologistUserId = authorized.principal.userId;
  const now = ctx.now();
  const todayParts = parseLocalDate(formatLocalDate(now, PRACTICE_TIMEZONE));
  if (!todayParts) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Practice timezone could not be resolved.",
    };
  }
  const dayStart = startOfLocalDay(todayParts, PRACTICE_TIMEZONE);
  const dayEnd = startOfNextLocalDay(todayParts, PRACTICE_TIMEZONE);

  const [todayRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        gte(appointments.startsAt, dayStart),
        lt(appointments.startsAt, dayEnd),
        sql`${appointments.status} in ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED')`,
      ),
    );

  const [upcomingRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        gte(appointments.startsAt, now),
        sql`${appointments.status} in ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED')`,
      ),
    );

  const [pendingRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        sql`${appointments.status} in ('REQUESTED', 'PENDING', 'RESCHEDULE_REQUESTED')`,
      ),
    );

  const [patientsRow] = await ctx.db
    .select({
      value: sql<number>`count(distinct ${appointments.patientUserId})::int`,
    })
    .from(appointments)
    .where(eq(appointments.psychologistUserId, psychologistUserId));

  const [completedRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.status, "COMPLETED"),
      ),
    );

  const [cancelledRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.status, "CANCELLED"),
      ),
    );

  const [noShowRow] = await ctx.db
    .select({ value: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        eq(appointments.status, "NO_SHOW"),
      ),
    );

  return {
    ok: true,
    summary: {
      today: Number(todayRow?.value ?? 0),
      upcoming: Number(upcomingRow?.value ?? 0),
      pending: Number(pendingRow?.value ?? 0),
      patients: Number(patientsRow?.value ?? 0),
      completed: Number(completedRow?.value ?? 0),
      cancelled: Number(cancelledRow?.value ?? 0),
      noShow: Number(noShowRow?.value ?? 0),
    },
  };
}
