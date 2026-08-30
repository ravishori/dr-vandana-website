export const USER_STATUSES = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
  "DISABLED",
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const ROLES = [
  "SUPER_ADMIN",
  "PSYCHOLOGIST",
  "STAFF",
  "PATIENT",
] as const;

export type RoleName = (typeof ROLES)[number];

export const PRACTICE_PERMISSIONS = [
  "MANAGE_PRACTICE_SETTINGS",
  "MANAGE_CONTACT_SETTINGS",
  "MANAGE_LOCATION_SETTINGS",
  "MANAGE_APPOINTMENT_SETTINGS",
  "MANAGE_NOTIFICATION_SETTINGS",
  "MANAGE_PUBLIC_SITE_SETTINGS",
  "MANAGE_USERS",
  "MANAGE_ROLES",
  "VIEW_AUDIT_LOGS",
  "MANAGE_SYSTEM_SETTINGS",
] as const;

export const CLINICAL_PERMISSIONS = [
  "VIEW_CLINICAL_RECORDS",
  "VIEW_PRIVATE_CLINICAL_NOTES",
  "MANAGE_CLINICAL_NOTES",
  "VIEW_CLINICAL_DOCUMENTS",
  "MANAGE_CLINICAL_DOCUMENTS",
] as const;

export type PracticePermission = (typeof PRACTICE_PERMISSIONS)[number];
export type ClinicalPermission = (typeof CLINICAL_PERMISSIONS)[number];
export type PermissionName = PracticePermission | ClinicalPermission;

export const MFA_REQUIRED_ROLES: readonly RoleName[] = [
  "SUPER_ADMIN",
  "PSYCHOLOGIST",
];

export const PRACTICE_SESSION_COOKIE = "drv_practice_session";

export const PUBLIC_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const SECURITY_EVENT_TYPES = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_CHANGE_FAILURE",
  "PASSWORD_RESET",
  "EMAIL_VERIFIED",
  "PHONE_VERIFIED",
  "MFA_ENABLED",
  "MFA_DISABLED",
  "MFA_FAILURE",
  "SESSION_REVOKED",
  "ACCOUNT_SUSPENDED",
  "ROLE_CHANGED",
  "REGISTRATION",
  "EMAIL_VERIFICATION_RESEND",
  "OTP_SENT",
  "OTP_FAILURE",
  "OTP_REQUESTED",
  "OTP_DELIVERY_SUCCESS",
  "OTP_DELIVERY_FAILURE",
  "OTP_VERIFICATION_SUCCESS",
  "OTP_VERIFICATION_FAILURE",
  "OTP_EXPIRED",
  "OTP_RATE_LIMITED",
] as const;

export type SecurityEventType = (typeof SECURITY_EVENT_TYPES)[number];

export const SAFE_MESSAGES = {
  registrationFailure:
    "We couldn't complete registration. Please check your details and try again.",
  genericAuthFailure: "The email or password is not correct.",
  accountUnavailable: "This account is not available.",
  verificationIncomplete:
    "Please complete email and mobile verification before signing in.",
  verificationInvalid:
    "This verification link is not valid or has expired.",
  otpInvalid: "That code is not valid. Please try again.",
  otpUnavailable: "We couldn't send a verification code just now. Please try again later.",
  rateLimited: "Please wait a little while before trying again.",
  passwordResetAccepted:
    "If the account is eligible, a verification message has been sent.",
  passwordResetInvalid: "This reset link is not valid or has expired.",
  passwordResetOtpInvalid:
    "That verification code is not valid. Please try again.",
  mfaRequired: "Additional verification is required to continue.",
  mfaInvalid: "That verification code is not valid. Please try again.",
  mfaLocked: "Too many attempts. Please wait before trying again.",
  notConfigured: "This service is not available yet.",
  unauthorized: "You do not have access to that.",
  csrfOrSession: "Your session could not be verified. Please sign in again.",
} as const;
