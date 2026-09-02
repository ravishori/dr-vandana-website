"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_DEVICE_PROFILE,
  getClientDeviceProfile,
  type DeviceProfile,
} from "@/lib/adaptive";

/**
 * Live DeviceProfile for presentation. Never persisted / never sent to APIs.
 */
export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(DEFAULT_DEVICE_PROFILE);

  useEffect(() => {
    const update = () => {
      setProfile(getClientDeviceProfile());
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");
    const onMedia = () => update();
    motionQuery.addEventListener?.("change", onMedia);
    pointerQuery.addEventListener?.("change", onMedia);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      motionQuery.removeEventListener?.("change", onMedia);
      pointerQuery.removeEventListener?.("change", onMedia);
    };
  }, []);

  return profile;
}
