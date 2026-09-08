/**
 * Doctor portal domain types — single-role doctor authentication.
 * Not an EHR identity model.
 */

export const DOCTOR_ROLE = "DOCTOR" as const;
export type DoctorRole = typeof DOCTOR_ROLE;

export type DoctorSession = {
  email: string;
  role: DoctorRole;
  issuedAt: number;
  expiresAt: number;
};

export type DoctorAuthResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason:
        | "DOCTOR_AUTH_NOT_CONFIGURED"
        | "INVALID_CREDENTIALS"
        | "RATE_LIMITED";
    };
