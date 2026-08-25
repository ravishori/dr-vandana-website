/**
 * Shared OTP type surface so providers do not import the full OTP service module.
 */

export type OtpPurpose =
  | "PHONE_VERIFY"
  | "EMAIL_VERIFY"
  | "EMAIL_LOGIN"
  | "PHONE_LOGIN"
  | "PASSWORD_RESET"
  | "MFA_CHALLENGE";

export type OtpChannel = "SMS" | "EMAIL";

export type OtpDeliveryStatus =
  | "CREATED"
  | "DELIVERY_ATTEMPTED"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "VERIFIED"
  | "EXPIRED"
  | "CONSUMED";

export type OtpDeliveryResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "provider_error"
        | "unconfigured"
        | "production_forbidden"
        | "invalid_destination"
        | "channel_unsupported";
    };

export type OtpDeliveryInput = {
  destination: string;
  purpose: OtpPurpose;
  channel: OtpChannel;
  code: string;
};

/**
 * Delivery-only abstraction. Domain service generates and hashes OTPs.
 * Providers must never log the code or secrets.
 */
export type OtpDeliveryProvider = {
  readonly id: string;
  /** TEST ONLY providers must set this to true. */
  readonly testOnly: boolean;
  deliver: (input: OtpDeliveryInput) => Promise<OtpDeliveryResult>;
};
