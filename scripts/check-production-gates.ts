/**
 * Operator-only production-gate snapshot.
 * Prints PASS / FAIL / BLOCKED / NOT CONFIGURED.
 * Never prints secret values. Does not claim external systems are ready.
 */

import {
  evaluateProductionReadinessGates,
  formatProductionReadinessGates,
} from "../src/lib/identity/operator-production-gates";

function main() {
  const report = evaluateProductionReadinessGates();
  process.stdout.write(`${formatProductionReadinessGates(report)}\n`);
  const failed = report.gates.some((gate) => gate.status === "FAIL");
  process.exit(failed ? 1 : 0);
}

main();
