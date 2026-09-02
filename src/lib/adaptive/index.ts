import { shouldReduceMotion } from "@/lib/adaptive/accessibility";
import { readCapabilities } from "@/lib/adaptive/capabilities";
import { inferOperatingSystem } from "@/lib/adaptive/os";
import {
  DEFAULT_DEVICE_PROFILE,
  type DeviceProfile,
} from "@/lib/adaptive/types";
import {
  resolveBreakpoint,
  resolveDeviceCategory,
  resolveOrientation,
} from "@/lib/adaptive/viewport";

export type BuildDeviceProfileInput = {
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio?: number;
  touchCapable?: boolean;
  coarsePointer?: boolean;
  prefersReducedMotion?: boolean;
  userAgent?: string;
  platform?: string;
};

/**
 * Pure builder — safe for tests and SSR defaults.
 * Does not read window; does not persist or transmit the profile.
 */
export function buildDeviceProfile(
  input: BuildDeviceProfileInput,
): DeviceProfile {
  const width = Math.max(0, Math.round(input.viewportWidth));
  const height = Math.max(0, Math.round(input.viewportHeight));
  const touchCapable = Boolean(input.touchCapable);
  const coarsePointer = Boolean(input.coarsePointer);
  const prefersReducedMotion = shouldReduceMotion(
    Boolean(input.prefersReducedMotion),
  );

  return {
    category: resolveDeviceCategory({
      width,
      touchCapable,
      coarsePointer,
    }),
    operatingSystem: inferOperatingSystem(input.userAgent, input.platform),
    viewportWidth: width,
    viewportHeight: height,
    pixelRatio: input.pixelRatio && input.pixelRatio > 0 ? input.pixelRatio : 1,
    touchCapable,
    coarsePointer,
    orientation: resolveOrientation(width, height),
    prefersReducedMotion,
    breakpoint: resolveBreakpoint(width),
  };
}

/**
 * Client-only snapshot. Returns DEFAULT_DEVICE_PROFILE during SSR /
 * when window is unavailable (progressive enhancement).
 */
export function getClientDeviceProfile(): DeviceProfile {
  if (typeof window === "undefined") {
    return DEFAULT_DEVICE_PROFILE;
  }

  const capabilities = readCapabilities();
  return buildDeviceProfile({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: capabilities.pixelRatio,
    touchCapable: capabilities.touchCapable,
    coarsePointer: capabilities.coarsePointer,
    prefersReducedMotion: capabilities.prefersReducedMotion,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    platform: typeof navigator !== "undefined" ? navigator.platform : undefined,
  });
}

export {
  DEFAULT_DEVICE_PROFILE,
  VIEWPORT_BREAKPOINTS,
  type DeviceCategory,
  type DeviceProfile,
  type OperatingSystem,
  type ViewportBreakpoint,
  type ViewportOrientation,
} from "@/lib/adaptive/types";
export {
  resolveBreakpoint,
  resolveDeviceCategory,
  resolveOrientation,
} from "@/lib/adaptive/viewport";
export {
  readCapabilities,
  readPixelRatio,
  readPointerCapabilities,
  readPrefersReducedMotion,
} from "@/lib/adaptive/capabilities";
export { inferOperatingSystem } from "@/lib/adaptive/os";
export { shouldReduceMotion } from "@/lib/adaptive/accessibility";
