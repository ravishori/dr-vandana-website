/**
 * Adaptive experience — presentation-only device/viewport profiling.
 *
 * Rules:
 * - Do NOT fingerprint users
 * - Do NOT store device profiles
 * - Do NOT send device profiles to the backend
 * - Do NOT use this for authentication or authorization
 * - Prefer viewport + capability signals over User-Agent alone
 */

export type DeviceCategory = "mobile" | "tablet" | "desktop";

export type OperatingSystem =
  | "ios"
  | "android"
  | "windows"
  | "macos"
  | "linux"
  | "unknown";

export type ViewportOrientation = "portrait" | "landscape";

export type ViewportBreakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export type DeviceProfile = {
  category: DeviceCategory;
  operatingSystem: OperatingSystem;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  touchCapable: boolean;
  coarsePointer: boolean;
  orientation: ViewportOrientation;
  prefersReducedMotion: boolean;
  breakpoint: ViewportBreakpoint;
};

/** Design ranges — presentation guidelines only, not security boundaries. */
export const VIEWPORT_BREAKPOINTS = {
  xs: { min: 0, max: 374 },
  sm: { min: 375, max: 639 },
  md: { min: 640, max: 1023 },
  lg: { min: 1024, max: 1279 },
  xl: { min: 1280, max: 1535 },
  "2xl": { min: 1536, max: Number.POSITIVE_INFINITY },
} as const;

export const DEFAULT_DEVICE_PROFILE: DeviceProfile = {
  category: "desktop",
  operatingSystem: "unknown",
  viewportWidth: 1280,
  viewportHeight: 800,
  pixelRatio: 1,
  touchCapable: false,
  coarsePointer: false,
  orientation: "landscape",
  prefersReducedMotion: false,
  breakpoint: "xl",
};
