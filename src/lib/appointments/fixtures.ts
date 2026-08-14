/**
 * TEST FIXTURE ONLY.
 * These values are not production practice policy.
 * Practice hours, duration, buffers, slot granularity, booking window,
 * and cancellation notice remain OPEN decisions.
 */
export const TEST_APPOINTMENT_DURATION_MINUTES = 30;
export const TEST_BUFFER_BEFORE_MINUTES = 0;
export const TEST_BUFFER_AFTER_MINUTES = 10;
export const TEST_SLOT_GRANULARITY_MINUTES = 15;
export const TEST_MINIMUM_NOTICE_MINUTES = 0;
export const TEST_MAXIMUM_ADVANCE_DAYS = 14;
export const TEST_CANCELLATION_MINIMUM_NOTICE_MINUTES = 0;

/** Monday–Friday 10:00–18:00 with 13:00–14:00 break. TEST FIXTURE ONLY. */
export const TEST_PRACTICE_HOURS: {
  dayOfWeek: number;
  opensLocal: string;
  closesLocal: string;
  breakStartsLocal: string;
  breakEndsLocal: string;
}[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  opensLocal: "10:00:00",
  closesLocal: "18:00:00",
  breakStartsLocal: "13:00:00",
  breakEndsLocal: "14:00:00",
}));

export const TEST_APPOINTMENT_TYPE_NAME = "Test consultation";
export const TEST_APPOINTMENT_TYPE_DESCRIPTION =
  "Operational test appointment type. Not a clinical service description.";
