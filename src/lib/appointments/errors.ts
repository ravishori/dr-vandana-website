import { APPOINTMENT_SAFE_MESSAGES, BOOKING_SAFE_MESSAGES } from "@/lib/appointments/constants";

export type AvailabilityErrorCode =
  | "NOT_CONFIGURED"
  | "VALIDATION"
  | "SLOT_UNAVAILABLE"
  | "OUTSIDE_AVAILABILITY"
  | "IN_THE_PAST"
  | "INVALID_TRANSITION";

export type BookingErrorCode =
  | AvailabilityErrorCode
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "TYPE_UNAVAILABLE"
  | "IDEMPOTENCY_CONFLICT";

export class AppointmentDomainError extends Error {
  readonly code: AvailabilityErrorCode;

  constructor(code: AvailabilityErrorCode, message: string) {
    super(message);
    this.name = "AppointmentDomainError";
    this.code = code;
  }
}

export class BookingDomainError extends Error {
  readonly code: BookingErrorCode;

  constructor(code: BookingErrorCode, message: string) {
    super(message);
    this.name = "BookingDomainError";
    this.code = code;
  }
}

export function isAppointmentDomainError(
  error: unknown,
): error is AppointmentDomainError {
  return error instanceof AppointmentDomainError;
}

export function isBookingDomainError(
  error: unknown,
): error is BookingDomainError {
  return error instanceof BookingDomainError;
}

export function safeAvailabilityFailure(error: unknown): {
  ok: false;
  message: string;
  code: AvailabilityErrorCode;
} {
  if (isAppointmentDomainError(error)) {
    return { ok: false, message: error.message, code: error.code };
  }
  return {
    ok: false,
    message: APPOINTMENT_SAFE_MESSAGES.notConfigured,
    code: "NOT_CONFIGURED",
  };
}

export function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    if ("code" in current && typeof current.code === "string") {
      if (/^[0-9A-Z]{5}$/.test(current.code)) {
        return current.code;
      }
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

export function isExclusionViolation(error: unknown): boolean {
  return postgresErrorCode(error) === "23P01";
}

export function safeBookingFailure(error: unknown): {
  ok: false;
  message: string;
  code: BookingErrorCode;
} {
  if (isBookingDomainError(error) || isAppointmentDomainError(error)) {
    return { ok: false, message: error.message, code: error.code };
  }
  if (isExclusionViolation(error)) {
    return {
      ok: false,
      message: BOOKING_SAFE_MESSAGES.slotUnavailable,
      code: "SLOT_UNAVAILABLE",
    };
  }
  return {
    ok: false,
    message: BOOKING_SAFE_MESSAGES.outsideAvailability,
    code: "NOT_CONFIGURED",
  };
}
