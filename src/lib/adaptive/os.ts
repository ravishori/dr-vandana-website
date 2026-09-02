/**
 * Lightweight OS hint for presentation only (e.g. safe-area emphasis).
 * Never used for security. Prefer unknown when unreliable.
 * User-Agent is a secondary signal only — viewport/capability drive UI category.
 */

import type { OperatingSystem } from "@/lib/adaptive/types";

export function inferOperatingSystem(
  userAgent: string | undefined,
  platform?: string,
): OperatingSystem {
  const ua = (userAgent ?? "").toLowerCase();
  const p = (platform ?? "").toLowerCase();

  if (!ua && !p) {
    return "unknown";
  }

  if (/iphone|ipod|ipad/.test(ua) || (p === "macintel" && /mobile/.test(ua))) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  if (/windows/.test(ua) || p.includes("win")) {
    return "windows";
  }
  if (/mac os x|macintosh/.test(ua) || p.includes("mac")) {
    return "macos";
  }
  if (/linux/.test(ua) || p.includes("linux")) {
    return "linux";
  }
  return "unknown";
}
