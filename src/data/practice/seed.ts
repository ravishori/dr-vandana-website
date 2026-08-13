import type { AvailabilityRule, ConsultationType } from "@/types/practice";

export const DEFAULT_CONSULTATION_TYPES: readonly ConsultationType[] = [
  {
    id: "ctype-initial",
    name: "Initial Consultation",
    description: "First consultation to understand concerns and goals.",
    durationMinutes: 50,
    isActive: true,
  },
  {
    id: "ctype-follow-up",
    name: "Follow-up Consultation",
    description: "Continuing counselling support.",
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: "ctype-child",
    name: "Child/Adolescent Consultation",
    description: "Support involving children, adolescents and/or caregivers.",
    durationMinutes: 50,
    isActive: true,
  },
  {
    id: "ctype-family",
    name: "Relationship/Family Consultation",
    description: "Structured support for relationship or family concerns.",
    durationMinutes: 60,
    isActive: true,
  },
  {
    id: "ctype-stress",
    name: "Stress/Emotional Wellness Consultation",
    description: "Support for stress, emotional wellbeing and coping.",
    durationMinutes: 45,
    isActive: true,
  },
];

/** Default Mon–Fri 10:00–13:00 and 15:00–18:00 Asia/Kolkata. */
export const DEFAULT_AVAILABILITY: readonly AvailabilityRule[] = [1, 2, 3, 4, 5]
  .flatMap((dayOfWeek) => [
    {
      id: `avail-${dayOfWeek}-am`,
      dayOfWeek,
      startTime: "10:00",
      endTime: "13:00",
      consultationTypeId: null,
      isActive: true,
    },
    {
      id: `avail-${dayOfWeek}-pm`,
      dayOfWeek,
      startTime: "15:00",
      endTime: "18:00",
      consultationTypeId: null,
      isActive: true,
    },
  ]);
