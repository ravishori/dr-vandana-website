/**
 * Minimal class-name helper.
 *
 * `clsx` and `tailwind-merge` are not installed in this project.
 * Milestone 1 does not add those packages. This helper joins truthy
 * class values only. Install and adopt clsx/tailwind-merge later if
 * class-variance merging becomes necessary.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
