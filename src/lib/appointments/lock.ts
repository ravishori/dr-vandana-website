import { sql } from "drizzle-orm";

import type { AppointmentQueryDb } from "@/lib/appointments/db-types";
import { logStructured } from "@/lib/observability/logger";

/**
 * Transaction-scoped lock for one psychologist's calendar.
 * Serializes booking and reschedule occupancy changes for that psychologist.
 * Status-only transitions still use row `FOR UPDATE` + `version`.
 */
export async function lockPsychologistCalendar(
  db: AppointmentQueryDb,
  psychologistUserId: string,
): Promise<void> {
  try {
    await db.execute(
      sql`select pg_advisory_xact_lock(hashtext(${psychologistUserId}))`,
    );
  } catch {
    logStructured("WARNING", {
      operation: "appointment_calendar_lock",
      errorType: "advisory_lock_unavailable",
    });
  }
}
