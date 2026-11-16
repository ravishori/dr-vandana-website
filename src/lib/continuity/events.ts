import {
  EVENT_TYPES,
  type JourneyEvent,
  type JourneyEventType,
} from "@/lib/continuity/types";

/** The only metadata keys an event may carry, all structured and non-sensitive. */
const ALLOWED_KEYS = new Set([
  "fromStatus",
  "toStatus",
  "itemType",
  "visibility",
  "source",
  "sequenceNumber",
  "count",
  "linkedAppointment",
]);
const ENUM_VALUE = /^[a-z0-9_]{1,40}$/;

export function sanitiseMetadata(
  metadata: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`event metadata key not allowed: ${key}`);
    if (typeof value === "string" && !ENUM_VALUE.test(value)) {
      throw new Error(`event metadata value must be an enumerated token: ${key}`);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`event metadata number invalid: ${key}`);
    }
    out[key] = value;
  }
  return out;
}

export function buildEvent(input: {
  id: string;
  journeyId: string;
  cycleId: string | null;
  actorUserId: string;
  eventType: JourneyEventType;
  entityType: JourneyEvent["entityType"];
  entityId: string;
  occurredAt: string;
  metadata?: Record<string, string | number | boolean>;
  correlationId: string;
}): JourneyEvent {
  if (!EVENT_TYPES.includes(input.eventType)) throw new Error("unknown event type");
  return { ...input, metadata: sanitiseMetadata(input.metadata) };
}
