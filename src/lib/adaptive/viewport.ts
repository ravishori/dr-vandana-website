import {
  VIEWPORT_BREAKPOINTS,
  type DeviceCategory,
  type ViewportBreakpoint,
  type ViewportOrientation,
} from "@/lib/adaptive/types";

export function resolveBreakpoint(width: number): ViewportBreakpoint {
  if (width <= VIEWPORT_BREAKPOINTS.xs.max) return "xs";
  if (width <= VIEWPORT_BREAKPOINTS.sm.max) return "sm";
  if (width <= VIEWPORT_BREAKPOINTS.md.max) return "md";
  if (width <= VIEWPORT_BREAKPOINTS.lg.max) return "lg";
  if (width <= VIEWPORT_BREAKPOINTS.xl.max) return "xl";
  return "2xl";
}

export function resolveOrientation(
  width: number,
  height: number,
): ViewportOrientation {
  return height >= width ? "portrait" : "landscape";
}

/**
 * Category from viewport + capability — not UA model names.
 * Touch + mid widths can still be tablet (e.g. large phones in landscape stay mobile).
 */
export function resolveDeviceCategory(input: {
  width: number;
  touchCapable: boolean;
  coarsePointer: boolean;
}): DeviceCategory {
  const { width, touchCapable, coarsePointer } = input;
  const touchy = touchCapable || coarsePointer;

  if (width < 640) {
    return "mobile";
  }
  if (width < 1024) {
    return touchy ? "tablet" : "desktop";
  }
  // Large viewports: prefer desktop even on touch laptops / iPad desktop mode.
  return "desktop";
}
