import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDeviceProfile,
  inferOperatingSystem,
  resolveBreakpoint,
  resolveDeviceCategory,
  resolveOrientation,
} from "@/lib/adaptive";

describe("adaptive device profile", () => {
  it("maps viewport widths to design breakpoints", () => {
    assert.equal(resolveBreakpoint(320), "xs");
    assert.equal(resolveBreakpoint(375), "sm");
    assert.equal(resolveBreakpoint(640), "md");
    assert.equal(resolveBreakpoint(1024), "lg");
    assert.equal(resolveBreakpoint(1280), "xl");
    assert.equal(resolveBreakpoint(1600), "2xl");
  });

  it("classifies category from viewport and capability, not UA model names", () => {
    assert.equal(
      resolveDeviceCategory({ width: 390, touchCapable: true, coarsePointer: true }),
      "mobile",
    );
    assert.equal(
      resolveDeviceCategory({ width: 820, touchCapable: true, coarsePointer: true }),
      "tablet",
    );
    assert.equal(
      resolveDeviceCategory({ width: 1280, touchCapable: false, coarsePointer: false }),
      "desktop",
    );
    assert.equal(
      resolveDeviceCategory({ width: 1280, touchCapable: true, coarsePointer: true }),
      "desktop",
    );
  });

  it("resolves orientation from dimensions", () => {
    assert.equal(resolveOrientation(390, 844), "portrait");
    assert.equal(resolveOrientation(1024, 768), "landscape");
  });

  it("infers OS lightly and falls back to unknown", () => {
    assert.equal(inferOperatingSystem("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), "ios");
    assert.equal(inferOperatingSystem("Mozilla/5.0 (Linux; Android 14)"), "android");
    assert.equal(inferOperatingSystem(""), "unknown");
  });

  it("builds a complete DeviceProfile without fingerprint storage fields", () => {
    const profile = buildDeviceProfile({
      viewportWidth: 390,
      viewportHeight: 844,
      touchCapable: true,
      coarsePointer: true,
      prefersReducedMotion: true,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });

    assert.equal(profile.category, "mobile");
    assert.equal(profile.breakpoint, "sm");
    assert.equal(profile.orientation, "portrait");
    assert.equal(profile.prefersReducedMotion, true);
    assert.equal(profile.operatingSystem, "ios");
    assert.ok(!("fingerprint" in profile));
  });
});
