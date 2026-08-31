/**
 * O-B-P04D read-only Production E2E verification (aggregate counts + outbox status).
 */

import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import {
  appointmentNotificationDeliveries,
  appointmentNotificationOutbox,
  appointments,
} from "../src/lib/appointments/schema";
import { isPostgresUrl } from "../src/lib/identity/config";
import { practiceSchema } from "../src/lib/identity/db";
import { assertProductionSyntheticE2eAllowed } from "../src/lib/identity/provision-synthetic-production-e2e-guard";

async function main() {
  const appointmentPublicId = process.env.O_B_P04D_APPOINTMENT_PUBLIC_ID;
  if (!appointmentPublicId) {
    console.error("Set O_B_P04D_APPOINTMENT_PUBLIC_ID.");
    process.exit(1);
  }

  const guard = assertProductionSyntheticE2eAllowed();
  if (!guard.ok) {
    console.error(guard.reason);
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!isPostgresUrl(url)) {
    console.error("DATABASE_URL must point at PostgreSQL.");
    process.exit(1);
  }

  const client = postgres(url, { max: 1, prepare: false, ssl: "require" });
  try {
    const db = drizzle(client, { schema: practiceSchema });

    const [appointment] = await db
      .select({
        id: appointments.id,
        publicId: appointments.publicId,
        status: appointments.status,
      })
      .from(appointments)
      .where(eq(appointments.publicId, appointmentPublicId))
      .limit(1);

    const [outbox] = appointment
      ? await db
          .select({
            id: appointmentNotificationOutbox.id,
            eventKey: appointmentNotificationOutbox.eventKey,
            status: appointmentNotificationOutbox.status,
            attemptCount: appointmentNotificationOutbox.attemptCount,
          })
          .from(appointmentNotificationOutbox)
          .where(eq(appointmentNotificationOutbox.appointmentId, appointment.id))
          .limit(1)
      : [];

    const deliveryStats = outbox
      ? await db
          .select({
            channel: appointmentNotificationDeliveries.channel,
            status: appointmentNotificationDeliveries.status,
            count: sql<number>`count(*)::int`,
          })
          .from(appointmentNotificationDeliveries)
          .where(eq(appointmentNotificationDeliveries.outboxId, outbox.id))
          .groupBy(
            appointmentNotificationDeliveries.channel,
            appointmentNotificationDeliveries.status,
          )
      : [];

    const syntheticAppointmentCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments);

    console.info(
      JSON.stringify({
        operation: "obP04dProductionE2eVerify",
        appointmentPublicId: appointment?.publicId ?? null,
        appointmentStatus: appointment?.status ?? null,
        outboxId: outbox?.id ?? null,
        outboxEventKey: outbox?.eventKey ?? null,
        outboxStatus: outbox?.status ?? null,
        outboxAttemptCount: outbox?.attemptCount ?? null,
        deliveryStats,
        totalAppointments: syntheticAppointmentCount[0]?.count ?? 0,
      }),
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch(() => {
  console.error("O-B-P04D Production E2E verification failed.");
  process.exit(1);
});
