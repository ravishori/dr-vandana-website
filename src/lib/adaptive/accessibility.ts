/**
 * Accessibility preference helpers for adaptive presentation.
 */

export { readPrefersReducedMotion } from "@/lib/adaptive/capabilities";

export function shouldReduceMotion(prefersReducedMotion: boolean): boolean {
  return prefersReducedMotion;
}
