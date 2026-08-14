/**
 * Operator-only identity production-gate snapshot.
 * Prints YES/NO only. Never prints secret values.
 * Do not expose this as a public HTTP route.
 */

import {
  evaluateIdentityProductionGates,
  formatIdentityProductionGates,
} from "../src/lib/identity/production-readiness";

function main() {
  const report = evaluateIdentityProductionGates();
  process.stdout.write(`${formatIdentityProductionGates(report)}\n`);
}

main();
