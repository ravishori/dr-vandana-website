import { eq } from "drizzle-orm";

import {
  TEST_APPOINTMENT_DURATION_MINUTES,
  TEST_APPOINTMENT_TYPE_DESCRIPTION,
  TEST_APPOINTMENT_TYPE_NAME,
  TEST_BUFFER_AFTER_MINUTES,
  TEST_BUFFER_BEFORE_MINUTES,
  TEST_CANCELLATION_MINIMUM_NOTICE_MINUTES,
  TEST_MAXIMUM_ADVANCE_DAYS,
  TEST_MINIMUM_NOTICE_MINUTES,
  TEST_PRACTICE_HOURS,
  TEST_SLOT_GRANULARITY_MINUTES,
} from "@/lib/appointments/fixtures";
import {
  appointmentTypes,
  practiceAppointmentSettings,
  practiceHourBreaks,
  practiceHours,
} from "@/lib/appointments/schema";
import { PRACTICE_TIMEZONE } from "@/lib/appointments/constants";
import { generatePublicId, generateUuid } from "@/lib/identity/crypto";
import type { IdentityDb } from "@/lib/identity/db";

export type SeededPractice = {
  appointmentTypePublicId: string;
  appointmentTypeId: string;
};

/**
 * Seeds clearly labelled TEST FIXTURE ONLY configuration.
 * Not a production hours/duration/cancellation policy.
 */
export async function seedTestPracticeConfiguration(
  db: IdentityDb,
  psychologistUserId: string,
  now: Date,
  typeOverrides?: {
    durationMinutes?: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    name?: string;
  },
): Promise<SeededPractice> {
  const [existingSettings] = await db
    .select({ psychologistUserId: practiceAppointmentSettings.psychologistUserId })
    .from(practiceAppointmentSettings)
    .where(eq(practiceAppointmentSettings.psychologistUserId, psychologistUserId))
    .limit(1);
  if (!existingSettings) {
    await db.insert(practiceAppointmentSettings).values({
      psychologistUserId,
      timezone: PRACTICE_TIMEZONE,
      slotGranularityMinutes: TEST_SLOT_GRANULARITY_MINUTES,
      minimumNoticeMinutes: TEST_MINIMUM_NOTICE_MINUTES,
      maximumAdvanceDays: TEST_MAXIMUM_ADVANCE_DAYS,
      cancellationMinimumNoticeMinutes: TEST_CANCELLATION_MINIMUM_NOTICE_MINUTES,
      createdAt: now,
      updatedAt: now,
    });

    for (const hour of TEST_PRACTICE_HOURS) {
      const hourId = generateUuid();
      await db.insert(practiceHours).values({
        id: hourId,
        psychologistUserId,
        dayOfWeek: hour.dayOfWeek,
        opensLocal: hour.opensLocal,
        closesLocal: hour.closesLocal,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
      await db.insert(practiceHourBreaks).values({
        id: generateUuid(),
        practiceHourId: hourId,
        startsLocal: hour.breakStartsLocal,
        endsLocal: hour.breakEndsLocal,
      });
    }
  }

  const appointmentTypePublicId = generatePublicId("ATY");
  const appointmentTypeId = generateUuid();
  await db.insert(appointmentTypes).values({
    id: appointmentTypeId,
    publicId: appointmentTypePublicId,
    psychologistUserId,
    name: typeOverrides?.name ?? TEST_APPOINTMENT_TYPE_NAME,
    description: TEST_APPOINTMENT_TYPE_DESCRIPTION,
    durationMinutes:
      typeOverrides?.durationMinutes ?? TEST_APPOINTMENT_DURATION_MINUTES,
    bufferBeforeMinutes:
      typeOverrides?.bufferBeforeMinutes ?? TEST_BUFFER_BEFORE_MINUTES,
    bufferAfterMinutes:
      typeOverrides?.bufferAfterMinutes ?? TEST_BUFFER_AFTER_MINUTES,
    active: true,
    createdAt: now,
    updatedAt: now,
  });

  return { appointmentTypePublicId, appointmentTypeId };
}
