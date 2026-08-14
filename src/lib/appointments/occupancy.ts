import { and, eq, inArray, sql } from "drizzle-orm";

import { BLOCKING_STATUSES } from "@/lib/appointments/constants";
import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import { appointments } from "@/lib/appointments/schema";

/**
 * Occupied intervals use PostgreSQL tstzrange with half-open bounds `[start, end)`.
 * Application code must not treat string timestamps as the overlap authority.
 */
export function occupiedRangesOverlapSql(
  rangeStart: Date,
  rangeEnd: Date,
) {
  return sql`tstzrange(${appointments.occupiedStartsAt}, ${appointments.occupiedEndsAt}, '[)') && tstzrange(${rangeStart}, ${rangeEnd}, '[)')`;
}

export async function loadBlockingOccupiedRanges(
  db: AppointmentQueryDb,
  psychologistUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<{ start: Date; end: Date }[]> {
  const rows = await db
    .select({
      occupiedStartsAt: appointments.occupiedStartsAt,
      occupiedEndsAt: appointments.occupiedEndsAt,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        inArray(appointments.status, [...BLOCKING_STATUSES]),
        occupiedRangesOverlapSql(rangeStart, rangeEnd),
      ),
    );
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
): Promise<boolean> {
  const rows = await db
    .select({ occupiedStartsAt: appointments.occupiedStartsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.psychologistUserId, psychologistUserId),
        inArray(appointments.status, [...BLOCKING_STATUSES]),
        occupiedRangesOverlapSql(occupiedStart, occupiedEnd),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
