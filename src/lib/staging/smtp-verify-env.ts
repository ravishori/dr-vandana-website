/**
 * Staging Preview-only SMTP AUTH verification environment gate.
 * Fail closed outside Vercel Preview. Never treat NODE_ENV alone as Preview.
 */

export type SmtpVerifyEnvSource = {
  VERCEL_ENV?: string | undefined;
  APP_ENV?: string | undefined;
  [key: string]: string | undefined;
};

/**
 * Allow only when the platform reports Preview.
 * Explicitly deny Production (VERCEL_ENV or APP_ENV).
 * Unknown / local / development without Preview → deny.
 */
export function isSmtpVerifyEnvironmentAllowed(
  env: SmtpVerifyEnvSource = process.env as SmtpVerifyEnvSource,
): boolean {
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  const appEnv = env.APP_ENV?.trim().toLowerCase();

  if (vercelEnv === "production" || appEnv === "production") {
    return false;
  }

  if (vercelEnv !== "preview") {
    return false;
  }

  // Preview with an unexpected APP_ENV (if set) stays fail-closed except staging/development.
  if (
    appEnv &&
    appEnv !== "staging" &&
    appEnv !== "development"
  ) {
    return false;
  }

  return true;
}
