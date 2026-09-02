/**
 * Capability detection via browser media features / navigator APIs.
 * Progressive enhancement: callers must tolerate missing APIs.
 */

export type CapabilitySnapshot = {
  touchCapable: boolean;
  coarsePointer: boolean;
  pixelRatio: number;
  prefersReducedMotion: boolean;
};

export function readPrefersReducedMotion(
  mediaMatch: ((query: string) => { matches: boolean }) | null = null,
): boolean {
  try {
    const matcher =
      mediaMatch ??
      (typeof window !== "undefined" ? window.matchMedia.bind(window) : null);
    if (!matcher) {
      return false;
    }
    return matcher("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function readPointerCapabilities(
  mediaMatch: ((query: string) => { matches: boolean }) | null = null,
  maxTouchPoints = 0,
): Pick<CapabilitySnapshot, "touchCapable" | "coarsePointer"> {
  try {
    const matcher =
      mediaMatch ??
      (typeof window !== "undefined" ? window.matchMedia.bind(window) : null);

    const coarsePointer = matcher
      ? matcher("(pointer: coarse)").matches
      : false;
    const anyHoverNone = matcher ? matcher("(hover: none)").matches : false;
    const touchCapable =
      maxTouchPoints > 0 ||
      coarsePointer ||
      anyHoverNone;

    return { touchCapable, coarsePointer };
  } catch {
    return {
      touchCapable: maxTouchPoints > 0,
      coarsePointer: false,
    };
  }
}

export function readPixelRatio(devicePixelRatio?: number): number {
  const ratio =
    devicePixelRatio ??
    (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }
  return Math.min(ratio, 4);
}

export function readCapabilities(): CapabilitySnapshot {
  const maxTouchPoints =
    typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0;
  const pointer = readPointerCapabilities(null, maxTouchPoints);

  return {
    ...pointer,
    pixelRatio: readPixelRatio(),
    prefersReducedMotion: readPrefersReducedMotion(),
  };
}
