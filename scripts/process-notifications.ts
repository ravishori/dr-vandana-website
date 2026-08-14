/**
 * Development/test notification dispatcher.
 * Not a public HTTP route. Production worker hosting remains OPEN.
 */

import { loadIdentityConfig } from "../src/lib/identity/config";
import { createAppIdentityContext } from "../src/lib/identity/runtime";
import { processDueNotifications } from "../src/lib/notifications/process";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "notifications:process is a development/test command. Production worker hosting remains OPEN.",
    );
    process.exit(1);
  }
  const config = loadIdentityConfig();
  if (config.nodeEnv === "production") {
    console.error(
      "notifications:process is a development/test command. Production worker hosting remains OPEN.",
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
      operation: "notificationsProcess",
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
  console.error("Notification processing failed.");
  process.exit(1);
});
