import { APPOINTMENT_SAFE_MESSAGES } from "@/lib/appointments/constants";

export type AvailabilityErrorCode =
  | "NOT_CONFIGURED"
  | "VALIDATION"
  | "SLOT_UNAVAILABLE"
  | "OUTSIDE_AVAILABILITY"
  | "IN_THE_PAST"
  | "INVALID_TRANSITION";

export class AppointmentDomainError extends Error {
  readonly code: AvailabilityErrorCode;

  constructor(code: AvailabilityErrorCode, message: string) {
    super(message);
    this.name = "AppointmentDomainError";
    this.code = code;
  }
}

export function isAppointmentDomainError(
  error: unknown,
): error is AppointmentDomainError {
  return error instanceof AppointmentDomainError;
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
