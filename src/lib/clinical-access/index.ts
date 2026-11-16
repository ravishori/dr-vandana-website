// Public surface of the clinical access layer.
// `evaluateClinicalAccess` is deliberately NOT re-exported: application code
// must go through `createClinicalAccessGuard(...).run` so that facts are
// resolved server-side and the access log is written fail-closed.
export * from "@/lib/clinical-access/access-log";
export * from "@/lib/clinical-access/guard";
export * from "@/lib/clinical-access/types";
