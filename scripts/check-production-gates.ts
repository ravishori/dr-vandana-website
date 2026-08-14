/**
 * Operator-only production-gate snapshot.
 * Prints PASS / BLOCKED / NOT CONFIGURED / HUMAN DECISION / LEGAL REVIEW / FAIL.
 * Never prints secret values. Does not claim external systems are ready.
 * Env var presence is not vendor or delivery readiness.
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
