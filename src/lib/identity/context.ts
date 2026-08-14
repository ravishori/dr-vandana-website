import type { IdentityRuntimeConfig } from "@/lib/identity/config";
import type { IdentityDb } from "@/lib/identity/db";
import type { EmailService } from "@/lib/identity/email-service";
import type { OtpService } from "@/lib/identity/otp";
import type { IdentityRateLimiter } from "@/lib/identity/rate-limit";

export type IdentityContext = {
  db: IdentityDb;
  config: IdentityRuntimeConfig;
  now: () => Date;
  email: EmailService;
  otp: OtpService;
  rateLimit: IdentityRateLimiter;
};
