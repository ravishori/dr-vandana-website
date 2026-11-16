// Continuity Loop (Increment 1): contracts, state machines, in-memory repository, service.
// Disabled by default; not wired to any route or UI.
export * from "@/lib/continuity/types";
export * from "@/lib/continuity/state-machines";
export { InMemoryContinuityRepository } from "@/lib/continuity/memory-repository";
export type { ContinuityRepository } from "@/lib/continuity/repository";
export { ContinuityService, type ContinuityDeps, type ErrorCode, type Result } from "@/lib/continuity/service";
