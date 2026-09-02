"use client";

import { useEffect } from "react";

import { useDeviceProfile } from "@/lib/adaptive/use-device-profile";

/**
 * Applies presentation-only data attributes from DeviceProfile.
 * Does not persist, fingerprint, or transmit profile data.
 */
export function AdaptiveExperience() {
  const profile = useDeviceProfile();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.deviceCategory = profile.category;
    root.dataset.viewportBreakpoint = profile.breakpoint;
    root.dataset.orientation = profile.orientation;
    if (profile.prefersReducedMotion) {
      root.dataset.reducedMotion = "true";
    } else {
      delete root.dataset.reducedMotion;
    }
  }, [profile]);

  return null;
}
