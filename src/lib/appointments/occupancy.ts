import { and, eq, inArray, ne, sql } from "drizzle-orm";

import { BLOCKING_STATUSES } from "@/lib/appointments/constants";
import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import { appointments } from "@/lib/appointments/schema";

/**
 * Occupied intervals use PostgreSQL tstzrange with half-open bounds `[start, end)`.
 * Application code must not treat string timestamps as the overlap authority.
 *
 * Date bounds are passed as ISO strings cast to timestamptz so postgres.js
 * binds them as text→timestamptz rather than mis-typing Date as a string OID
 * (which throws ERR_INVALID_ARG_TYPE on real PostgreSQL).
 */
export function occupiedRangesOverlapSql(
  rangeStart: Date,
  rangeEnd: Date,
) {
  const startIso = rangeStart.toISOString();
  const endIso = rangeEnd.toISOString();
  return sql`tstzrange(${appointments.occupiedStartsAt}, ${appointments.occupiedEndsAt}, '[)') && tstzrange(${startIso}::timestamptz, ${endIso}::timestamptz, '[)')`;
}

export async function loadBlockingOccupiedRanges(
  db: AppointmentQueryDb,
  psychologistUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeAppointmentId?: string,
): Promise<{ start: Date; end: Date }[]> {
  const filters = [
    eq(appointments.psychologistUserId, psychologistUserId),
    inArray(appointments.status, [...BLOCKING_STATUSES]),
    occupiedRangesOverlapSql(rangeStart, rangeEnd),
  ];
  if (excludeAppointmentId) {
    filters.push(ne(appointments.id, excludeAppointmentId));
  }
  const rows = await db
    .select({
      occupiedStartsAt: appointments.occupiedStartsAt,
      occupiedEndsAt: appointments.occupiedEndsAt,
    })
    .from(appointments)
    .where(and(...filters));
  return rows.map((row) => ({
    start: row.occupiedStartsAt,
    end: row.occupiedEndsAt,
  }));
}

export async function hasBlockingOccupiedOverlap(
  db: AppointmentQueryDb,
  psychologistUserId: string,
  occupiedStart: Date,
  occupiedEnd: Date,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const filters = [
    eq(appointments.psychologistUserId, psychologistUserId),
    inArray(appointments.status, [...BLOCKING_STATUSES]),
    occupiedRangesOverlapSql(occupiedStart, occupiedEnd),
  ];
  if (excludeAppointmentId) {
    filters.push(ne(appointments.id, excludeAppointmentId));
  }
  const rows = await db
    .select({ occupiedStartsAt: appointments.occupiedStartsAt })
    .from(appointments)
    .where(and(...filters))
    .limit(1);
  return rows.length > 0;
}
