import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDesktopCenterNavItems,
  getDrawerNavItems,
  getPrimaryNavItemsForPath,
  getTabletCenterNavItems,
} from "@/config/navigation";

describe("adaptive navigation configuration", () => {
  it("hides Home on the landing page but keeps logo route available via BrandMark", () => {
    const landing = getPrimaryNavItemsForPath("/");
    assert.ok(!landing.some((item) => item.href === "/"));

    const about = getPrimaryNavItemsForPath("/about");
    assert.ok(about.some((item) => item.href === "/"));
  });

  it("keeps desktop center nav concise without Contact clutter", () => {
    const desktop = getDesktopCenterNavItems("/");
    const hrefs = desktop.map((item) => item.href);
    assert.deepEqual(hrefs, [
      "/about",
      "/areas-of-support",
      "/child-adolescent-psychology",
      "/stress-anxiety-wellness",
      "/psychology/ask-dr-vandana-ai",
    ]);
    assert.ok(!hrefs.includes("/contact"));
    assert.ok(!hrefs.includes("/"));
  });

  it("includes Contact in the mobile/tablet drawer from shared nav data", () => {
    const drawer = getDrawerNavItems("/about");
    assert.ok(drawer.some((item) => item.href === "/contact"));
    assert.ok(drawer.some((item) => item.href === "/"));
  });

  it("reuses the same center nav items for tablet compact chrome", () => {
    const desktop = getDesktopCenterNavItems("/");
    const tablet = getTabletCenterNavItems("/");
    assert.deepEqual(
      tablet.map((item) => item.href),
      desktop.map((item) => item.href),
    );
  });
});
