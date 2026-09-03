/**
 * Focus utility classes for interactive design-system elements.
 * Global `:focus-visible` already exists; use these for composite widgets.
 */
export const focusRingClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2";

export const touchTargetClassName =
  "min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]";
