/**
 * Dedicated Production notification worker (Azure Container Apps Job).
 * Invoked only via: npm run notifications:process:production
 *
 * The development/staging CLI (notifications:process) remains blocked in Production.
 */

import {
  isSessionSecretUsable,
  isSmtpReadyForIdentity,
  loadIdentityConfig,
} from "../src/lib/identity/config";
import { createAppIdentityContext } from "../src/lib/identity/runtime";
import {
  assertProductionNotificationWorkerAuthorization,
  formatProductionWorkerGuardFailure,
} from "../src/lib/notifications/production-worker-guard";
import { processDueNotifications } from "../src/lib/notifications/process";

async function main() {
  const authorization = assertProductionNotificationWorkerAuthorization(
    process.env,
  );
  if (!authorization.ok) {
    console.error(formatProductionWorkerGuardFailure(authorization));
    process.exit(1);
  }

  const config = loadIdentityConfig();
  if (config.nodeEnv !== "production") {
    console.error(
      "Production notification worker requires production runtime configuration.",
    );
    process.exit(1);
  }

  if (!isSessionSecretUsable(config.sessionSecret)) {
    console.error("Production notification worker requires AUTH_SESSION_SECRET.");
    process.exit(1);
  }

  if (!isSmtpReadyForIdentity()) {
    console.error(
      "Production notification worker SMTP configuration is not ready.",
    );
    process.exit(1);
  }

  const identity = createAppIdentityContext();
  if (!identity.ok) {
    console.error("Identity/database is not configured.");
    process.exit(1);
  }

  const stats = await processDueNotifications(identity.ctx);
  console.info(
    JSON.stringify({
      operation: "notificationsProcessProduction",
      expanded: stats.expanded,
      claimed: stats.claimed,
      sent: stats.sent,
      retry: stats.retry,
      dead: stats.dead,
      skipped: stats.skipped,
    }),
  );
}

main().catch(() => {
  console.error("Production notification processing failed.");
  process.exit(1);
});
